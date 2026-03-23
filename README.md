# Scout Platform

Scout is an AI-powered pest triage and lead-capture platform.

It helps homeowners describe pest signs at home, get an assessment, receive a summary of recommended next steps, and request professional follow-up when needed. The platform also includes an internal dashboard for conversation analytics, lead operations, and runtime model testing.

## What This Repo Contains

This repo is a monorepo with 4 main apps:

- `apps/web`
  - public landing page
  - full `/chat` experience
- `apps/api`
  - Fastify API
  - Prisma + Postgres/Supabase persistence
  - Scout conversation flow, AI runtime, summary delivery, and lead capture
- `apps/dashboard`
  - internal dashboard
  - lead ops
  - conversation analytics
  - runtime model switcher
- `apps/widget`
  - embeddable Scout web component

Shared packages:

- `packages/types`
  - shared TypeScript types
- `packages/schemas`
  - shared Zod schemas

Other folders:

- `docs`
  - product, flow, severity, and dashboard docs
- `scripts`
  - demo seeding and smoke-test helpers

## Current Product Scope

Scout currently supports:

- natural multi-turn pest triage
- summary delivery by email
- professional-help handoff flow
- lead capture and storage
- conversation history storage
- embeddable website widget
- dashboard analytics and lead operations
- AI runtime switching across multiple providers/models

## Tech Stack

- Next.js
- React
- Fastify
- Prisma
- PostgreSQL / Supabase
- Vercel AI SDK
- Groq, Gemini, Z.AI, and OpenRouter runtime support
- Tailwind CSS

## Prerequisites

- Node.js 22+
- npm
- a Postgres database
- Supabase project credentials for the current API setup

## Monorepo Layout

```text
.
├── apps
│   ├── api
│   ├── dashboard
│   ├── web
│   └── widget
├── docs
├── packages
│   ├── schemas
│   └── types
└── scripts
```

## Getting Started

### 1. Install dependencies

From the repo root:

```bash
npm install
```

### 2. Create env files

You will usually need:

- `apps/api/.env`
- `apps/dashboard/.env`
- optionally `apps/web/.env.local`

Use the examples as starting points:

- `apps/api/.env.example`
- `apps/dashboard/.env.example`

### 3. Configure the API env

At minimum, the API needs:

- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- one or more model provider keys

Examples:

- `GROQ_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `ZAI_API_KEY`
- `OPENROUTER_API_KEY`

Optional delivery providers:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### 4. Configure dashboard auth

Create `apps/dashboard/.env` with values like:

```env
DASHBOARD_AUTH_USERNAME=admin
DASHBOARD_AUTH_PASSWORD=your-password
DASHBOARD_SESSION_SECRET=replace-with-a-long-random-secret
SCOUT_API_URL=http://localhost:3001
```

### 5. Push the Prisma schema

From the repo root:

```bash
npx prisma db push --schema apps/api/prisma/schema.prisma
```

### 6. Start the apps

Run each app in a separate terminal.

API:

```bash
npm run dev:api
```

Web:

```bash
npm run dev:web
```

Dashboard:

```bash
npm run dev:dashboard
```

Optional widget build watcher:

```bash
npm run dev:widget
```

## Local URLs

- web: `http://localhost:3000`
- full chat: `http://localhost:3000/chat`
- API: `http://localhost:3001`
- dashboard: `http://localhost:3002`

## Useful Root Scripts

Development:

- `npm run dev:api`
- `npm run dev:web`
- `npm run dev:dashboard`
- `npm run dev:widget`

Builds:

- `npm run build:api`
- `npm run build:web`
- `npm run build:dashboard`
- `npm run build:widget`
- `npm run build:shared`

Lint:

- `npm run lint:web`
- `npm run lint:dashboard`

Demo data:

- `npm run seed:demo`
- `npm run seed:demo:reset`

## Demo Data

To populate the dashboard with sample conversations and leads:

```bash
npm run seed:demo:reset
```

This clears existing conversation/lead demo data and reseeds the dashboard with example sessions.

## Widget Usage

The widget is built from `apps/widget` and can be embedded as a custom element.

Basic pattern:

```html
<script type="module" src="/dist/embed.js"></script>
<scout-widget
  tenant-id="scout-direct"
  api-url="http://localhost:3001"
  position="bottom-right"
  widget-title="Scout"
></scout-widget>
```

For local development, the public web app already includes the widget.

## Runtime Switching

The dashboard includes an internal Scout runtime switcher.

It lets you:

- choose provider + model for new conversations
- compare model behavior in the dashboard
- switch when quotas or free-tier limits change

Important:

- runtime changes apply to new conversations
- each conversation snapshots the runtime it started with

## Key Docs

- `docs/scout-conversation-flow-v2.md`
- `docs/intake-and-handoff-flow.md`
- `docs/severity-scoring.md`
- `docs/dashboard-roadmap.md`
- `docs/dashboard-reference-and-metrics.md`

## Deployment Shape

A common deployment setup is:

- `web` -> `scoutai.com`
- `api` -> `api.scoutai.com`
- `dashboard` -> `dashboard.scoutai.com`

The apps can live in one GitHub repo and deploy as separate Vercel projects using different root directories.

## Notes

- The dashboard is internal and not intended for public users.
- The project currently supports multiple LLM providers, but provider availability and free-tier limits can change.
- If any API keys were pasted into chat or used for testing, rotate them before production use.

## Status

Scout is currently in strong MVP / private beta shape:

- solid product foundation
- real chat flow
- real lead pipeline
- real dashboard

The most important next steps after local development are usually:

- deployment
- secret rotation
- production env hardening
- true abandonment tracking
- CRM / scheduling integrations
