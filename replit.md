# CCTV Intel — Workspace

## Overview

A CCTV footage search and indexing platform. Upload surveillance videos (.mp4/.mov), index them using AI vision (frame extraction + GPT analysis), then search using natural language (e.g. "person wearing red shirt").

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI GPT-5 vision via Replit AI Integrations
- **File storage**: GCS via Replit Object Storage
- **Video processing**: fluent-ffmpeg (frame extraction every 2 seconds)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui

## Artifacts

- **API Server** (`artifacts/api-server/`) — Express 5 backend at `/api`
- **CCTV Search** (`artifacts/cctv-search/`) — React+Vite frontend at `/`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

### Video Indexing Flow
1. User uploads .mp4/.mov to GCS via presigned URL
2. Backend creates a Video record (status: pending)
3. User triggers indexing → `POST /api/videos/:id/index`
4. Background job:
   - Downloads video from GCS to temp disk
   - Extracts frames every 2 seconds using ffmpeg
   - Uploads each frame to GCS
   - Analyzes each frame with GPT-5-mini vision (batch, concurrency 3)
   - Stores Frame records with timestamp + description
5. Poll `GET /api/videos/:id/index-status` for progress

### Natural Language Search
- `POST /api/search` with `{ query, videoId?, limit? }`
- Loads all frame descriptions from DB (filtered by video if specified)
- Sends to GPT-5-mini with the search query for semantic matching
- Returns frames ranked by relevance with match reasons

## Database Schema

- `videos` — Video records (name, objectPath, status, totalFrames, indexedFrames, durationSeconds)
- `frames` — Extracted frames (videoId, timestampSeconds, objectPath, description)
- `search_history` — Search query log (query, resultCount)

## Environment Variables

- `DATABASE_URL`, `PGHOST`, etc. — PostgreSQL connection
- `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI via Replit AI Integrations
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS` — GCS object storage
- `SESSION_SECRET` — Session secret (pre-existing)
- `PORT`, `BASE_PATH` — Service configuration

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
