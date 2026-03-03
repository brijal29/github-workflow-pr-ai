# React + Node.js Portfolio (Monorepo)

This repo contains a simple portfolio site:

- `client/`: React + TypeScript (Vite) + Tailwind CSS
- `server/`: Node.js + TypeScript (Express) API used by the contact form

## Prereqs

- Node.js 20+ recommended
- npm 9+ (workspaces)

## Getting started

Install deps from the repo root:

```bash
npm install
```

Run both apps in dev:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:5174`

## Contact form

The portfolio contact form POSTs to:

- `POST /api/contact`

Messages are appended locally to:

- `server/data/contact-messages.jsonl`

## Customizing your portfolio

Edit these in `client/src/App.tsx`:

- Your name/title/location/links (`me`)
- Projects list (`projects`)
- Skills list (`skills`)

## Server configuration

Environment variables (optional):

- `PORT` (default `5174`)
- `CLIENT_ORIGIN` (default `http://localhost:5173`)

