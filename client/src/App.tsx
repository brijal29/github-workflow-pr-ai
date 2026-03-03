import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

type ContactStatus = 'idle' | 'sending' | 'sent' | 'error'

type SkillGroup = { title: string; items: string[] }

type Experience = {
  title: string
  company: string
  location: string
  dates: string
  bullets: string[]
  tags: string[]
}

type Certification = {
  name: string
  issuer: string
  description?: string
}

const nav = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Experience', href: '#experience' },
  { label: 'Skills', href: '#skills' },
  { label: 'Certifications', href: '#certifications' },
  { label: 'Education', href: '#education' },
  { label: 'Contact', href: '#contact' },
]

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(' ')
}

function App() {
  const me = useMemo(
    () => ({
      name: 'Brijal Patel',
      role: 'Senior Software Engineer',
      location: 'Indianapolis, Indiana',
      email: 'brijalpatel291@gmail.com',
      summary:
        'Highly skilled and results-driven Senior Software Engineer with a strong track record of delivering high-quality, efficient solutions across backend and frontend development. Strong problem-solving, technical excellence across the SDLC (analysis, design, implementation, testing), and a collaborative mindset with experience mentoring junior developers in fast-paced environments.',
      links: [
        { label: 'Email', href: 'mailto:brijalpatel291@gmail.com' },
        { label: 'GitHub', href: 'https://github.com/brijal29' },
        { label: 'LinkedIn', href: 'https://www.linkedin.com/in/brijal-patel-52159b210/' },
        { label: 'Resume', href: '#', disabled: true as const },
      ],
    }),
    []
  )

  const experience = useMemo<Experience[]>(
    () => [
      {
        title: 'Senior Software Engineer',
        company: 'Ascension Health Care',
        location: 'Austin, TX (Remote)',
        dates: 'Aug 2022 — Present',
        bullets: [
          'Spearheading development of a patient-centric search platform to locate nearby providers/facilities by location, specialty, and other criteria.',
          'Building modern web solutions with React (Hooks), Redux state management (incl. DevTools), TypeScript, Apollo Client, and GraphQL.',
          'Partnering with backend teams to design and build high-performing APIs and services, including work with Java Spring Boot.',
          'Partnering with UX/UI to translate wireframes and user flows into responsive, accessible, visually engaging interfaces.',
          'Maintaining a custom interactive map solution leveraging Google APIs for performant, accurate, real-time visualization of provider/location data.',
          'Collaborating on native app initiatives and React Native features to extend key web capabilities to mobile.',
          'Writing and maintaining unit tests using Jest, Enzyme, and Expect to ensure reliability and coverage.',
          'Exploring and adopting AI-assisted development tools such as GitHub Copilot, ChatGPT, Gemini, and modern code models (e.g. Codex) to improve code quality and delivery speed.',
          'Using Jira for sprint planning and aligning delivery with Agile processes.',
          'Contributing to architectural and product design discussions (code structure, patterns, best practices) and mentoring junior developers.',
        ],
        tags: ['React', 'Redux', 'TypeScript', 'GraphQL', 'Apollo', 'Jest', 'Google Maps'],
      },
      {
        title: 'Senior Full Stack Developer',
        company: 'OtoZen',
        location: 'San Jose, CA (Remote - India)',
        dates: 'Sep 2020 — May 2022',
        bullets: [
          'Designed and implemented scalable RESTful APIs using Node.js and Express to support mobile application backend functionality.',
          'Integrated Socket.IO and Redis JSON for low-latency real-time driver location and activity data.',
          'Worked with AWS services including API Gateway, IAM, S3, Lambda, and supported serverless architecture.',
          'Developed a custom Alexa skill to enable voice control for OtoZen using Amazon Alexa devices.',
          'Used Docker and Kubernetes for containerization and scalability.',
          'Validated APIs and performance using Postman and Apache JMeter.',
          'Wrote optimized SQL queries using MySQL and Knex.js for complex retrieval and manipulation.',
          'Collaborated cross-functionally (mobile, AWS, QA, product) and maintained strong client communication.',
        ],
        tags: ['Node.js', 'Express', 'Socket.IO', 'Redis', 'AWS', 'Docker', 'Kubernetes', 'MySQL'],
      },
      {
        title: 'Full Stack Developer',
        company: 'iRoid Solutions',
        location: 'Gujarat, India',
        dates: 'Aug 2017 — Aug 2020',
        bullets: [
          'Developed and maintained RESTful APIs for Android and iOS applications, ensuring reliable client/server communication.',
          'Built React.js user interfaces and Node.js (Express) server-side features across multiple web projects.',
          'Contributed to a conversational chatbot using Dialogflow and Google Cloud services to improve customer interaction and automation.',
          'Worked with product, mobile, and QA teams to define requirements and implement effective solutions.',
          'Improved foundational engineering practices through mentorship and developed strong collaboration and communication skills.',
        ],
        tags: ['React', 'Node.js', 'Express', 'REST', 'Dialogflow', 'GCP'],
      },
    ],
    []
  )

  const skillGroups = useMemo<SkillGroup[]>(
    () => [
      { title: 'Backend & API Development', items: ['NodeJS', 'PHP', 'GraphQL'] },
      { title: 'Frontend Development', items: ['React-Redux', 'TypeScript', 'JavaScript', 'Bootstrap', 'CSS3/SCSS'] },
      { title: 'Mobile Development', items: ['React Native'] },
      { title: 'Databases', items: ['MySQL', 'Redis', 'MongoDB'] },
      { title: 'Cloud & DevOps (AWS)', items: ['EC2', 'S3', 'API Gateway', 'CloudWatch'] },
      { title: 'Real-Time Communication', items: ['Socket.io'] },
      { title: 'Conversational AI & Voice', items: ['Google Dialogflow', 'Alexa Skills Kit'] },
      { title: 'Tools & Technologies', items: ['Git', 'Jira', 'Postman', 'JMeter', 'Jest'] },
    ],
    []
  )

  const education = useMemo(
    () => ({
      degree: 'Bachelor of Engineering in Information Technology',
      school: 'SCET (Sarvajanik College of Engineering and Technology - GTU)',
      location: 'Gujarat, India',
    }),
    []
  )

  const certifications = useMemo<Certification[]>(
    () => [
      {
        name: 'AI Agents & Agentic AI with Python & Generative AI',
        issuer: 'Vanderbilt University',
        description:
          'Hands-on coursework covering agentic AI patterns, orchestrating tools and LLMs with Python, and building production-ready AI workflows.',
      },
    ],
    []
  )

  const [status, setStatus] = useState<ContactStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' })

  async function submitContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setStatus('sending')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as unknown
        const message =
          typeof body === 'object' && body && 'error' in body
            ? String((body as { error: unknown }).error)
            : 'Request failed'
        throw new Error(message)
      }

      setStatus('sent')
      setForm({ name: '', email: '', message: '', website: '' })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="min-h-dvh">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute top-64 right-[-120px] h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#home" className="font-semibold tracking-tight">
            {me.name}
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-slate-200/90 hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#contact"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100"
            >
              Let’s talk
            </a>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6">
        <section id="home" className="py-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-5 md:items-center">
            <div className="md:col-span-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {me.location}
              </p>
              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight md:text-6xl">
                {me.role} building delightful products.
              </h1>
              <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-200/80 md:text-lg">
                {me.summary}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#experience"
                  className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-400"
                >
                  View experience
                </a>
                <a
                  href="#contact"
                  className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100 hover:bg-white/10"
                >
                  Contact me
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {me.links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target={l.href.startsWith('http') ? '_blank' : undefined}
                    rel={l.href.startsWith('http') ? 'noreferrer' : undefined}
                    className={classNames(
                      'text-sm text-slate-200/80 hover:text-white',
                      (l as { disabled?: boolean }).disabled && 'pointer-events-none opacity-40'
                    )}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm font-medium text-white">Highlights</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-200/80">
                  <li className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    React + TypeScript + Redux frontends with strong UX and accessibility
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    Node.js APIs (REST/GraphQL) with strong validation and reliability
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    Real-time systems (Socket.io), cloud (AWS), and testing (Jest)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-24 py-16">
          <div className="grid gap-10 md:grid-cols-5">
            <div className="md:col-span-2">
              <h2 className="text-2xl font-semibold tracking-tight">About</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-200/80">
                Senior Software Engineer with strong full-stack experience across React, Node.js, TypeScript,
                and GraphQL. I enjoy building high-performance, accessible products, collaborating closely with design
                and product, and supporting teams through mentorship and strong engineering practices.
              </p>
            </div>
            <div className="md:col-span-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-sm font-medium text-white">What I focus on</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-200/80">
                  <li className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    Modern frontend development with React, TypeScript, and reliable state management patterns
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    Backend/API development with Node.js, Express, REST, and GraphQL
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    Quality and delivery: testing, performance, and cross-functional collaboration
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="experience" className="scroll-mt-24 py-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Experience</h2>
              <p className="mt-3 text-sm text-slate-200/80">
                Recent roles and highlights.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6">
            {experience.map((x) => (
              <article
                key={`${x.company}-${x.dates}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {x.title} · {x.company}
                    </h3>
                    <p className="mt-1 text-sm text-slate-200/70">
                      {x.location}
                    </p>
                  </div>
                  <p className="text-sm text-slate-200/70">{x.dates}</p>
                </div>

                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-200/80">
                  {x.bullets.map((b) => (
                    <li key={b} className="flex gap-3">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300/60" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap gap-2">
                  {x.tags.map((t) => (
                    <span
                      key={`${x.company}-${t}`}
                      className="rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-200/80 ring-1 ring-white/10"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="skills" className="scroll-mt-24 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Technical Skills</h2>
          <p className="mt-3 text-sm text-slate-200/80">
            Technologies I’ve worked with across backend, frontend, and cloud.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {skillGroups.map((g) => (
              <div
                key={g.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <p className="text-sm font-semibold text-white">{g.title}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {g.items.map((s) => (
                    <span
                      key={`${g.title}-${s}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/90"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="certifications" className="scroll-mt-24 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Certifications</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {certifications.map((c) => (
              <article
                key={c.name}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <p className="text-sm font-semibold text-white">{c.name}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-300/80">
                  {c.issuer}
                </p>
                {c.description && (
                  <p className="mt-3 text-sm text-slate-200/80">{c.description}</p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section id="education" className="scroll-mt-24 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Education</h2>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold text-white">{education.degree}</p>
            <p className="mt-2 text-sm text-slate-200/80">
              {education.school} · {education.location}
            </p>
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 py-16">
          <div className="grid gap-10 md:grid-cols-5">
            <div className="md:col-span-2">
              <h2 className="text-2xl font-semibold tracking-tight">Contact</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-200/80">
                Send a message and I’ll get back to you. (This form posts to the Node.js
                API in `server/`.)
              </p>
            </div>

            <div className="md:col-span-3">
              <form
                onSubmit={submitContact}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-medium text-slate-200/80">Name</span>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none ring-indigo-500/30 focus:ring-4"
                      placeholder="Brijal Patel"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium text-slate-200/80">Email</span>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none ring-indigo-500/30 focus:ring-4"
                      placeholder="brijalpatel291@gmail.com"
                    />
                  </label>
                </div>

                {/* Honeypot field */}
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  className="hidden"
                  aria-hidden="true"
                />

                <label className="mt-4 grid gap-2">
                  <span className="text-xs font-medium text-slate-200/80">Message</span>
                  <textarea
                    required
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="min-h-[140px] resize-y rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none ring-indigo-500/30 focus:ring-4"
                    placeholder="Share details about the role, project, or collaboration you have in mind…"
                  />
                </label>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className={classNames(
                      'rounded-xl bg-indigo-500 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-400',
                      status === 'sending' && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    {status === 'sending' ? 'Sending…' : 'Send message'}
                  </button>

                  {status === 'sent' && (
                    <p className="text-sm text-emerald-300">Thanks — message sent.</p>
                  )}
                  {status === 'error' && (
                    <p className="text-sm text-rose-300">
                      {error ?? 'Could not send message.'}
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 py-10 text-sm text-slate-200/70">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} {me.name}. Built with React + Node.js.</p>
            <div className="flex gap-4">
              {me.links
                .filter((l) => !(l as { disabled?: boolean }).disabled)
                .map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white"
                  >
                    {l.label}
                  </a>
                ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
