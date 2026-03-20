# ATREYU — AI Marketing Operating System

## Overview

ATREYU (Autonomous Tactical Resource & Execution for Your Universe) is a premium AI-powered marketing operating system. It's a full-stack web SaaS platform built on a pnpm monorepo.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite, Tailwind CSS v4, shadcn/ui, wouter routing, React Query, framer-motion, recharts
- **Backend**: Express 5 API server
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Anthropic Claude via Replit AI Integrations proxy (`@workspace/integrations-anthropic-ai`)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## AI Model Architecture

Model aliases configured in API routes:
- **sonnet** → `claude-sonnet-4-6` (standard chat, content, research, copywriting)
- **opus** → `claude-opus-4-6` (deep research synthesis, strategic recommendations — "Deep Think" mode)
- **haiku** → `claude-haiku-4-5` (lightweight tasks, fallback)

The Assistant page has a "Deep Think" toggle that switches between Sonnet and Opus.

## Structure

```text
artifacts/
├── api-server/           # Express 5 API server
│   └── src/routes/
│       ├── anthropic/    # AI chat conversations (SSE streaming)
│       ├── agents/       # Agent Studio: repo ingestion + parallel job execution (SSE streaming)
│       ├── research.ts   # Research jobs + Apify scaffold + AI summarize
│       ├── content.ts    # Content generation (SSE streaming)
│       ├── campaigns.ts  # Campaign management
│       ├── knowledge.ts  # Knowledge base CRUD
│       ├── automations.ts # Automation engine
│       └── projects.ts   # Projects + dashboard stats
├── atreyu/               # React + Vite frontend (previewPath: /)
│   └── src/
│       ├── pages/        # landing, dashboard, claude (Agent Studio), research, content, campaigns, knowledge, automations, settings
│       ├── components/   # layout.tsx (neumorphic OS shell + dock)
│       └── hooks/        # use-sse.ts (SSE streaming hook)
└── mockup-sandbox/       # Design prototyping sandbox

lib/
├── api-spec/             # OpenAPI 3.1 spec + Orval codegen config
├── api-client-react/     # Generated React Query hooks
├── api-zod/              # Generated Zod schemas
├── integrations-anthropic-ai/  # Anthropic AI client + batch utilities
└── db/
    └── src/schema/
        ├── conversations.ts    # AI chat conversations
        ├── messages.ts         # Chat messages
        ├── projects.ts         # Projects
        ├── campaigns.ts        # Marketing campaigns
        ├── research.ts         # Research jobs + results
        ├── content.ts          # Content assets
        ├── knowledge.ts        # Knowledge base items
        └── automations.ts      # Automations + run history
```

## Database Schema

Core entities: `conversations`, `messages`, `projects`, `campaigns`, `research_jobs`, `research_results`, `content_assets`, `knowledge_items`, `automations`, `automation_runs`

All tables use soft deletes (`deleted_at`) where appropriate.

## Apify Integration

Research jobs scaffold is in `artifacts/api-server/src/routes/research.ts`. Currently simulates scraping with a timeout. To activate real Apify:
1. Set `APIFY_API_KEY` environment variable
2. Replace `simulateResearchJob()` with real Apify actor calls
3. Parse actor output into `research_results` table

## Key API Endpoints

- `GET/POST /api/anthropic/conversations` — chat threads
- `POST /api/anthropic/conversations/:id/messages` — SSE streaming AI chat
- `GET/POST /api/research/jobs` — research job management
- `POST /api/research/jobs/:id/summarize` — SSE AI summarization
- `POST /api/content/generate` — SSE content generation
- `GET /api/dashboard/stats` — dashboard statistics
- CRUD for campaigns, knowledge, automations, projects

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection (auto-set by Replit)
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Replit AI proxy URL (auto-set)
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Replit AI proxy key (auto-set)
- `PORT` — Service port (auto-assigned per artifact)

## Workflows

- `artifacts/api-server: API Server` — Express API on assigned port, proxied at `/api`
- `artifacts/atreyu: web` — Vite dev server at `/` (port 19040)

## Running Commands

```bash
# Push DB schema changes
pnpm --filter @workspace/db run push

# Run codegen after OpenAPI spec changes
pnpm --filter @workspace/api-spec run codegen

# Typecheck everything
pnpm run typecheck
```
