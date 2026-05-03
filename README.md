# 🎥 Trace — Agentic CCTV Indexing Engine

<iframe width="560" height="315" src="https://www.youtube.com/embed/DH5p8kukPSo?si=IS5xeXDqjc6Sm-bW" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

An intelligent video search platform built with Replit Agent during **Ship it Hacks 2026**. Upload surveillance footage, let AI automatically index every frame, then search for anything using natural language.

**Find anything in any footage.** Search across hours of video in seconds. Just describe what you're looking for.

## ✨ Core Features

- **🚀 One-Click Video Upload** — Upload `.mp4` or `.mov` files and let the indexing begin
- **🧠 Intelligent Frame Analysis** — Automatically extracts frames every 2 seconds and analyzes each with GPT-5 vision
- **🔍 Semantic Search** — Find exactly what you're looking for using natural language (e.g., *"person wearing red shirt"*, *"suspicious activity"*)
- **⚡ Real-Time Indexing Progress** — Watch the AI analyze your videos in real-time
- **📊 Dashboard** — Manage videos, view indexing stats, and search history

## 🏗️ Architecture

### Video Indexing Pipeline
1. **Upload** → User uploads video to cloud storage (GCS) via presigned URL
2. **Extract** → Backend downloads and splits video into frames (every 2 seconds)
3. **Analyze** → Each frame sent to GPT-5-mini vision model for semantic description
4. **Store** → Frame descriptions indexed in PostgreSQL for fast retrieval
5. **Search** → User queries matched against frame database using semantic matching

### Natural Language Search
- Query the entire database or search within specific videos
- GPT-5-mini semantically matches user queries against stored frame descriptions
- Results ranked by relevance with match explanations
- Includes timestamp and thumbnail preview

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite + TailwindCSS + shadcn/ui |
| **Backend** | Express 5 + TypeScript |
| **Database** | PostgreSQL + Drizzle ORM |
| **AI/Vision** | OpenAI GPT-5-mini via Replit AI Integrations |
| **Storage** | GCS via Replit Object Storage |
| **Video Processing** | ffmpeg |
| **Monorepo** | pnpm workspaces |
| **Build** | esbuild |

## 📦 Project Structure

```
trace/
├── artifacts/
│   ├── api-server/          # Express backend (REST API)
│   ├── cctv-search/         # React + Vite frontend
│   └── mockup-sandbox/      # Component preview sandbox
├── lib/
│   ├── api-spec/            # OpenAPI specification
│   ├── api-zod/             # Zod validation schemas
│   ├── api-client-react/    # Generated API client hooks
│   ├── db/                  # Database schema & migrations
│   └── integrations-openai-ai-*/ # AI integration packages
└── scripts/                 # Utilities
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 24+
- **pnpm** (package manager)
- PostgreSQL database
- GCS bucket for video storage
- OpenAI API key (via Replit AI Integrations)

### Setup

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database, storage, and API credentials

# Run database migrations
pnpm --filter @workspace/db run push

# Start development servers
# Terminal 1 - API server
pnpm --filter @workspace/api-server run dev

# Terminal 2 - Frontend
pnpm --filter @workspace/cctv-search run dev
```

### Build & Deploy

```bash
# Full typecheck and build
pnpm run build

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/videos` | List all uploaded videos |
| `POST` | `/api/videos` | Upload new video |
| `GET` | `/api/videos/:id` | Get video details |
| `POST` | `/api/videos/:id/index` | Start indexing process |
| `GET` | `/api/videos/:id/index-status` | Check indexing progress |
| `POST` | `/api/search` | Semantic search across frames |
| `GET` | `/api/search/history` | View search history |

## 📋 Database Schema

### Videos Table
- `id` — Unique identifier
- `name` — Video filename
- `objectPath` — GCS storage path
- `status` — pending \| indexing \| indexed \| error
- `totalFrames` — Extracted frame count
- `indexedFrames` — Analyzed frame count
- `durationSeconds` — Video length
- `errorMessage` — Error details (if failed)

### Frames Table
- `id` — Unique identifier
- `videoId` — Reference to video
- `timestampSeconds` — Frame position in video
- `objectPath` — GCS storage path of frame image
- `description` — AI-generated frame description

### Search History Table
- Tracks user search queries and results

## 🎓 How It Works

1. **Upload a video** → Creates pending video record
2. **Trigger indexing** → Background job starts processing
3. **Frame extraction** → ffmpeg splits video into snapshots
4. **AI analysis** → Each frame analyzed with GPT-5-mini vision model
5. **Storage** → Frame descriptions saved to database
6. **Search** → Submit natural language query → semantic matching → ranked results with timestamps

Example search flow:
```
Query: "person wearing red jacket"
     ↓
GPT-5-mini compares against 1000+ frame descriptions
     ↓
Returns top 10 matching frames with timestamps
     ↓
Click result → Jump to video at exact timestamp
```

## 🏆 Hackathon Context

**Built during Ship it Hacks 2026** using the Replit Agent platform. This project demonstrates:
- Full-stack agentic development with AI-driven architecture
- Seamless integration of vision AI (GPT-5) with web applications
- Real-time processing and semantic search capabilities
- Production-ready TypeScript monorepo patterns

## 🔐 Security & Privacy

- Videos stored in private GCS buckets
- Database uses authenticated PostgreSQL connections
- API-key protected endpoints
- Frame processing happens server-side (no client-side video processing)
- Search queries logged to database for analytics

## 📝 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...
PGHOST=...
PGUSER=...
PGPASSWORD=...

# AI Integration
AI_INTEGRATIONS_OPENAI_BASE_URL=https://...
AI_INTEGRATIONS_OPENAI_API_KEY=...

# Object Storage
DEFAULT_OBJECT_STORAGE_BUCKET_ID=...
PRIVATE_OBJECT_DIR=videos/
PUBLIC_OBJECT_SEARCH_PATHS=frames/

# Server
PORT=3000
BASE_PATH=/
SESSION_SECRET=...
```

## 🤝 Contributing

This is a hackathon project. Feel free to fork and extend!

## 📜 License

MIT

---

**Trace** — _Because every frame tells a story. Make them searchable._
