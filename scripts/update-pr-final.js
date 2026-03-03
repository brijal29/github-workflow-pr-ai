/**
 * scripts/update-pr-final.js
 * Node 18+ (CommonJS). Place in scripts/ and run in GitHub Actions.
 *
 * Purpose:
 * - Summarize code changes per commit (diff-based using OpenAI).
 * - Append only NEW commit summaries to "## Describe your changes" using hidden SHA markers.
 * - Fill "## Issue ticket number and link" from commit messages.
 * - Fill "## Type of change" checkboxes from commit prefixes (feat/fix).
 * - Jira Sync:
 *    - On PR opened/reopened: comment PR link + transition ticket to In Progress (optional)
 *    - On PR merged: comment + transition ticket to Done (optional)
 *
 * Env expected:
 * - Required:
 *   - GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_NAME, GITHUB_EVENT_PATH
 * - Optional (OpenAI):
 *   - OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TEMPERATURE
 * - Optional (Jira link rendering in template):
 *   - JIRA_BASE_URL (also used by Jira sync)
 * - Optional (Jira sync auth):
 *   - JIRA_EMAIL, JIRA_API_TOKEN
 * - Optional (Jira sync behavior):
 *   - JIRA_ENABLE_TRANSITIONS=true|false (default true)
 *   - JIRA_ENABLE_COMMENTS=true|false (default true)
 *   - JIRA_TRANSITION_IN_PROGRESS_NAME (default "In Progress")
 *   - JIRA_TRANSITION_DONE_NAME (default "Done")
 * - Limits:
 *   - MAX_FILES, MAX_PATCH_CHARS
 * - DRY_RUN=true|false
 */

import fs from "fs";
import fetch from "node-fetch";
import { Octokit } from "@octokit/rest";

// Node 18+ has fetch globally. If not, fallback to node-fetch dynamically.
async function getFetch() {
  if (typeof fetch === "function") return fetch;
  const mod = await import("node-fetch");
  return mod.default;
}

/* ------------------ env ------------------ */
const REPO_FULL = process.env.GITHUB_REPOSITORY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const EVENT_NAME = process.env.GITHUB_EVENT_NAME;
const EVENT_PATH = process.env.GITHUB_EVENT_PATH;

const OPENAI_KEY = process.env.OPENAI_API_KEY || null;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
const OPENAI_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE || "0.15");

const JIRA_BASE_URL = process.env.JIRA_BASE_URL
  ? process.env.JIRA_BASE_URL.replace(/\/+$/, "")
  : null;
const JIRA_EMAIL = process.env.JIRA_EMAIL || null;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || null;

const JIRA_ENABLE_TRANSITIONS = (process.env.JIRA_ENABLE_TRANSITIONS || "true").toLowerCase() === "true";
const JIRA_ENABLE_COMMENTS = (process.env.JIRA_ENABLE_COMMENTS || "true").toLowerCase() === "true";
const JIRA_TRANSITION_IN_PROGRESS_NAME = process.env.JIRA_TRANSITION_IN_PROGRESS_NAME || "In Progress";
const JIRA_TRANSITION_DONE_NAME = process.env.JIRA_TRANSITION_DONE_NAME || "Done";

// Used for template links too:
const JIRA_LINK_BASE = JIRA_BASE_URL ? `${JIRA_BASE_URL}/browse/` : null;

const MAX_FILES = parseInt(process.env.MAX_FILES || "10", 10);
const MAX_PATCH_CHARS = parseInt(process.env.MAX_PATCH_CHARS || "3000", 10);
const DRY_RUN = (process.env.DRY_RUN || "true").toLowerCase() === "true";

if (!REPO_FULL || !GITHUB_TOKEN || !EVENT_NAME || !EVENT_PATH) {
  console.error(
    "Missing required env vars. Ensure GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_EVENT_NAME, GITHUB_EVENT_PATH are set."
  );
  process.exit(1);
}

const [OWNER, REPO] = REPO_FULL.split("/");
const octokit = new Octokit({ auth: GITHUB_TOKEN });

/* ------------------ utility ------------------ */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "\n\n[TRUNCATED]" : s;
}

// Basic secret scrubber - extend patterns as needed
function scrub(text = "") {
  if (!text) return "";
  const patterns = [
    /AKIA[0-9A-Z]{16}/g,
    /(?:aws_secret_access_key|aws_secret)\s*[:=]\s*['"`]?[^'"\s]{8,}['"`]?/gi,
    /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,
    /(?:secret|password|passwd|token)[\s:=]+['"`]?[A-Za-z0-9\-\._]{8,}['"`]?/gi,
    /Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/g,
  ];
  let out = text;
  for (const p of patterns) out = out.replace(p, "[REDACTED]");
  return out;
}

/* ------------------ OpenAI wrapper ------------------ */
async function openaiChat(messages, max_tokens = 300) {
  if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY not set");

  const _fetch = await getFetch();
  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: OPENAI_MODEL,
    messages,
    max_tokens,
    temperature: OPENAI_TEMPERATURE,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await _fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (resp.ok) {
      const json = await resp.json();
      return json.choices?.[0]?.message?.content?.trim() || "";
    }

    const txt = await resp.text();
    if (resp.status >= 500 || resp.status === 429) {
      console.warn(`OpenAI transient error ${resp.status} - retrying: ${txt.slice(0, 160)}`);
      await sleep(1000 * (attempt + 1));
      continue;
    }
    throw new Error(`OpenAI error ${resp.status}: ${txt}`);
  }

  throw new Error("OpenAI retries exhausted");
}

/* ------------------ Jira helpers ------------------ */
function jiraConfigured() {
  return Boolean(JIRA_BASE_URL && JIRA_EMAIL && JIRA_API_TOKEN);
}

function jiraAuthHeader() {
  const token = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
  return `Basic ${token}`;
}

async function jiraRequest(path, method = "GET", body = null) {
  const _fetch = await getFetch();
  const url = `${JIRA_BASE_URL}/rest/api/3${path}`;

  const resp = await _fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: jiraAuthHeader(),
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (resp.status === 204) return null; // no-content success
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Jira API error ${resp.status}: ${txt}`);
  }

  return await resp.json();
}

// ADF comment builder (Jira Cloud)
function jiraADFParagraph(text) {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

async function jiraAddComment(issueKey, text) {
  await jiraRequest(`/issue/${encodeURIComponent(issueKey)}/comment`, "POST", {
    body: jiraADFParagraph(text),
  });
}

// Find transition ID by name, then execute it
async function jiraTransitionByName(issueKey, targetName) {
  const data = await jiraRequest(`/issue/${encodeURIComponent(issueKey)}/transitions`, "GET");
  const transitions = data?.transitions || [];
  const target = transitions.find(t => (t.name || "").toLowerCase() === targetName.toLowerCase());

  if (!target?.id) {
    console.warn(`Jira: Transition "${targetName}" not found for ${issueKey}. Available: ${transitions.map(t => t.name).join(", ")}`);
    return false;
  }

  await jiraRequest(`/issue/${encodeURIComponent(issueKey)}/transitions`, "POST", {
    transition: { id: target.id },
  });
  return true;
}

/**
 * Sync Jira for PR events:
 * - opened/reopened: comment + transition to In Progress (optional)
 * - merged (closed+merged=true): comment + transition to Done (optional)
 */
async function jiraSyncForPREvent({ prNumber, prUrl, prTitle, tickets, eventAction, merged }) {
  if (!jiraConfigured()) {
    console.log("Jira sync skipped: JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN not configured.");
    return;
  }
  if (!tickets || tickets.size === 0) {
    console.log("Jira sync skipped: no Jira ticket keys detected.");
    return;
  }

  // Decide what to do based on event type/action
  const isOpenedLike = eventAction === "opened" || eventAction === "reopened";
  const isMerged = Boolean(merged);

  // Avoid noisy comment spam on synchronize/edited
  const shouldComment = JIRA_ENABLE_COMMENTS && (isOpenedLike || isMerged);
  const shouldTransition = JIRA_ENABLE_TRANSITIONS && (isOpenedLike || isMerged);

  const ticketList = Array.from(tickets);

  for (const key of ticketList) {
    try {
      if (shouldComment) {
        const marker = `[pr-agent:${prNumber}]`; // helps recognize agent-generated comments
        const text = isMerged
          ? `${marker} PR merged: ${prTitle} — ${prUrl}`
          : `${marker} PR opened: ${prTitle} — ${prUrl}`;
        if (!DRY_RUN) {
          await jiraAddComment(key, text);
        } else {
          console.log(`DRY_RUN: would add Jira comment to ${key}: ${text}`);
        }
      }

      if (shouldTransition) {
        const target = isMerged ? JIRA_TRANSITION_DONE_NAME : JIRA_TRANSITION_IN_PROGRESS_NAME;
        if (!DRY_RUN) {
          await jiraTransitionByName(key, target);
        } else {
          console.log(`DRY_RUN: would transition ${key} -> "${target}"`);
        }
      }
    } catch (err) {
      console.warn(`Jira sync failed for ${key}:`, err.message);
    }
  }
}

/* ------------------ commit / ticket extraction ------------------ */
function extractTicketsAndTypesFromCommits(commits) {
  const tickets = new Set();
  const types = new Set();

  // Supports: ABC-123/feat: msg, ABC-123 feat: msg, ABC-123/fix: msg
  const unified =
    /^(?:\s*)(?<ticket>[A-Z][A-Z0-9]+-\d+|[A-Za-z0-9]+)[\/\s:-]+(?<type>feat|fix)\b/i;
  const jiraKeyRegex = /([A-Z][A-Z0-9]+-\d+)/g;

  for (const c of commits) {
    if (!c?.message) continue;
    const subj = c.message.split("\n")[0].trim();

    const m = subj.match(unified);
    if (m?.groups) {
      const t = m.groups.ticket;
      if (t) tickets.add(t.toUpperCase());

      const ty = (m.groups.type || "").toLowerCase();
      if (ty === "feat" || ty === "fix") types.add(ty);
      continue;
    }

    let mm;
    while ((mm = jiraKeyRegex.exec(subj)) !== null) tickets.add(mm[1].toUpperCase());

    const typeOnly = subj.match(/^(feat|fix)\b[:\s-]*/i);
    if (typeOnly) types.add(typeOnly[1].toLowerCase());
  }

  return { tickets, types };
}

/* ------------------ PR body section helpers ------------------ */
function replaceSection(prBody, headerText, newContent) {
  const lines = prBody.split("\n");
  const headerIdx = lines.findIndex((l) => l.trim() === headerText.trim());
  if (headerIdx === -1) {
    return `${headerText}\n\n${newContent}\n\n${prBody}`;
  }
  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  const before = lines.slice(0, headerIdx + 1).join("\n");
  const after = lines.slice(endIdx).join("\n");
  return `${before}\n\n${newContent}\n\n${after}`;
}

function getSectionRange(prBody, headerText) {
  const lines = prBody.split("\n");
  const headerIdx = lines.findIndex((l) => l.trim() === headerText.trim());
  if (headerIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }

  const content = lines.slice(headerIdx + 1, endIdx).join("\n").trim();
  return { headerIdx, endIdx, content, lines };
}

function parseSummarizedCommitShas(describeContent) {
  const set = new Set();
  const re = /<!--\s*pr-agent:commit:([0-9a-f]{7,40})\s*-->/gi;
  let m;
  while ((m = re.exec(describeContent || "")) !== null) set.add(m[1]);
  return set;
}

function buildTicketListLines(ticketSet) {
  if (!ticketSet || ticketSet.size === 0) return ["(No JIRA ticket found in commits)"];
  const arr = Array.from(ticketSet);
  return arr.map((t) =>
    JIRA_LINK_BASE ? `- [${t}](${JIRA_LINK_BASE}${encodeURIComponent(t)})` : `- ${t}`
  );
}

// IMPORTANT: return ONLY checkbox lines (no header) to avoid duplication.
function buildTypeOfChangeContent(typesSet) {
  const isFeat = typesSet.has("feat");
  const isFix = typesSet.has("fix");
  return [
    `- [${isFeat ? "x" : " "}] Feature enhancement`,
    `- [${isFix ? "x" : " "}] Bug Fix`,
    `- [ ] Other (please explain)`,
  ].join("\n");
}

/* ------------------ per-commit LLM summary ------------------ */
async function summarizeSingleCommit(commitSha, commitSubject) {
  const commitData = await octokit.repos.getCommit({
    owner: OWNER,
    repo: REPO,
    ref: commitSha,
  });

  const files = (commitData.data.files || []).slice(0, MAX_FILES);
  const fileSummaries = [];

  for (const f of files) {
    const file = f.filename;
    const patch = truncate(scrub(f.patch || ""), MAX_PATCH_CHARS);

    if (!patch) {
      fileSummaries.push(`- ${file}: ${f.status || "modified"} (${f.changes || 0} changes)`);
      continue;
    }

    try {
      const msgs = [
        {
          role: "system",
          content:
            "You are a concise code reviewer. Given a diff snippet, write ONE short sentence describing what changed and why. Do not repeat commit messages.",
        },
        {
          role: "user",
          content: `Commit: ${commitSubject}
File: ${file}

DIFF:
\`\`\`diff
${patch}
\`\`\`

One short sentence.`,
        },
      ];

      const out = await openaiChat(msgs, 140);
      fileSummaries.push(`- ${out.replace(/\n+/g, " ").trim()} (${file})`);
      await sleep(120);
    } catch (e) {
      fileSummaries.push(`- ${file}: ${f.status || "modified"} (${f.changes || 0} changes)`);
    }
  }

  // Roll-up into one commit sentence
  try {
    const agg = await openaiChat(
      [
        {
          role: "system",
          content:
            "Summarize the commit based on file summaries into ONE short sentence (<= 25 words).",
        },
        {
          role: "user",
          content: `Commit: ${commitSubject}

File summaries:
${fileSummaries.join("\n")}

One sentence summary:`,
        },
      ],
      120
    );

    return agg.replace(/\n+/g, " ").trim();
  } catch {
    return fileSummaries[0]?.replace(/^- /, "") || "Minor code updates.";
  }
}

function formatCommitEntry({ sha, subject, author, summary }) {
  const sha7 = sha.slice(0, 7);
  return `- **${subject}** (${author}, ${sha7})
  - ${summary} <!-- pr-agent:commit:${sha} -->`;
}

/* ------------------ main per PR ------------------ */
async function processSinglePR({ number, eventAction }) {
  console.log(`Processing PR #${number} (action=${eventAction || "n/a"})`);

  // Read PR body first (we append only new commit summaries)
  const prResp = await octokit.pulls.get({
    owner: OWNER,
    repo: REPO,
    pull_number: number,
  });

  const prUrl = prResp.data.html_url;
  const prTitle = prResp.data.title;
  const prMerged = Boolean(prResp.data.merged);

  const existingBody = prResp.data.body || "";

  // Get commits
  const commitsResp = await octokit.pulls.listCommits({
    owner: OWNER,
    repo: REPO,
    pull_number: number,
    per_page: 250,
  });

  const commits = commitsResp.data.map((c) => ({
    sha: c.sha,
    message: c.commit.message || "",
    author: (c.author && c.author.login) || c.commit.author?.name || "unknown",
  }));

  // Tickets and types from commit messages
  const { tickets, types } = extractTicketsAndTypesFromCommits(commits);

  // Jira sync (open/reopen/merge)
  await jiraSyncForPREvent({
    prNumber: number,
    prUrl,
    prTitle,
    tickets,
    eventAction,
    merged: prMerged && eventAction === "closed",
  });

  // Describe section content + already summarized shas
  const describeSection = getSectionRange(existingBody, "## Describe your changes");
  const existingDescribeContent = describeSection?.content || "";
  const alreadySummarized = parseSummarizedCommitShas(existingDescribeContent);

  // Determine which commits are new
  const newEntries = [];
  for (const c of commits) {
    if (alreadySummarized.has(c.sha)) continue;

    const subject = c.message.split("\n")[0].trim();
    let summary = "Summary unavailable (OPENAI_API_KEY not set).";

    if (OPENAI_KEY) {
      try {
        summary = await summarizeSingleCommit(c.sha, subject);
      } catch (err) {
        console.warn(`Commit summary failed for ${c.sha.slice(0, 7)}:`, err.message);
        summary = "Unable to generate summary for this commit.";
      }
    }

    newEntries.push(
      formatCommitEntry({
        sha: c.sha,
        subject,
        author: c.author,
        summary,
      })
    );
  }

  // Build new Describe content: keep existing + append new
  let newDescribeContent = existingDescribeContent.trim();

  const isPlaceholder =
    !newDescribeContent ||
    /\(What are you adding or fixing\?\)/i.test(newDescribeContent);

  if (isPlaceholder) {
    newDescribeContent = "**Auto-generated commit summaries:**";
  }

  if (newEntries.length) {
    newDescribeContent = `${newDescribeContent}\n\n${newEntries.join("\n")}`.trim();
  } else {
    newDescribeContent = newDescribeContent || "**Auto-generated commit summaries:**";
  }

  const ticketLines = buildTicketListLines(tickets).join("\n");
  const typeContent = buildTypeOfChangeContent(types);

  // Replace sections
  let newBody = existingBody;
  newBody = replaceSection(newBody, "## Describe your changes", newDescribeContent);
  newBody = replaceSection(newBody, "## Issue ticket number and link", ticketLines);
  newBody = replaceSection(newBody, "## Type of change", typeContent);

  if (DRY_RUN) {
    console.log("DRY_RUN=true — generated content below (not applied to PR):\n");
    console.log("=== Describe your changes ===\n");
    console.log(newDescribeContent);
    console.log("\n=== Issue ticket number and link ===\n");
    console.log(ticketLines);
    console.log("\n=== Type of change ===\n");
    console.log(typeContent);
    return;
  }

  if (newBody.trim() === existingBody.trim()) {
    console.log("No changes detected in PR body.");
    return;
  }

  console.log("Updating PR body...");
  await octokit.pulls.update({
    owner: OWNER,
    repo: REPO,
    pull_number: number,
    body: newBody,
  });
  console.log("PR updated successfully.");
}

/* ------------------ entry: determine PR(s) from event ------------------ */
async function main() {
  const rawEvent = JSON.parse(fs.readFileSync(EVENT_PATH, "utf8"));
  const prsToProcess = [];

  if (EVENT_NAME === "pull_request") {
    const pr = rawEvent.pull_request;
    const action = rawEvent.action; // opened, reopened, synchronize, edited, closed...
    prsToProcess.push({ number: pr.number, eventAction: action });
  } else if (EVENT_NAME === "push") {
    const pushedRef = rawEvent.ref.replace("refs/heads/", "");
    console.log("Push event to branch:", pushedRef);

    const list = await octokit.pulls.list({
      owner: OWNER,
      repo: REPO,
      state: "open",
      per_page: 100,
    });

    for (const p of list.data) {
      if (p.head.ref === pushedRef) prsToProcess.push({ number: p.number, eventAction: "synchronize" });
    }

    if (prsToProcess.length === 0) {
      console.log("No open PRs for pushed branch; nothing to do.");
      return;
    }
  } else {
    console.log(`Event ${EVENT_NAME} not handled. Exiting.`);
    return;
  }

  for (const prInfo of prsToProcess) {
    try {
      await processSinglePR(prInfo);
    } catch (err) {
      console.error(`Failed to process PR #${prInfo.number}:`, err);
    }
    await sleep(200);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});