# Clamo

Legal self-representation made simple for Italian small claims court (Giudice di Pace).

Clamo guides users through a discovery chat, automatically creates a legal case, generates personalized tasks, and organizes documents (S3 uploads) from filing to hearing.

## Use Cases

- Disputes over movable property (art. 316 c.p.c. – Cartabia reform)
- Opposition to administrative sanctions (L. 689/1981; D.Lgs. 150/2011)

## Architecture

- App Router (Next.js 15) with server/client components
- Authentication: Supabase Auth (auth only; DB via Prisma)
- API: tRPC (no Next.js routes for business logic)
- ORM: Prisma (PostgreSQL), JSON fields for flexibility (`chat_history`, `progress`, `Case.data`, `Task.metadata`)
- Storage: AWS S3 (document uploads with presigned URLs)
- AI: Vercel AI SDK (`generateObject`/`generateText`) with OpenAI and Perplexity
- Court finder: Full `LISTA_GIUDICI` text and LLM resolution + local fallback

```
┌───────────────────────────────────────────────────────────────┐
│ Client (Next.js)                                              │
│  - Landing (chat CTA)                                         │
│  - Discovery chat                                             │
│  - Case Dashboard (Tasks, Documents, Deadlines)               │
└───────────────▲───────────────────────────────────────────────┘
                │ tRPC
┌───────────────┴───────────────────────────────────────────────┐
│ Server (tRPC Routers)                                         │
│  - chat: discovery, creates Case + tasks                      │
│  - case: list, get, upload URL, attach document              │
│  - task/document (optional)                                  │
└───────────────▲───────────────────────────────────────────────┘
                │ Prisma
┌───────────────┴───────────────────────────────────────────────┐
│ Database (PostgreSQL)                                         │
│  - User, Case, Task, CaseDocument, Chat                       │
└───────────────────────────────────────────────────────────────┘

S3 (uploads)  •  AI (OpenAI/Perplexity)  •  Supabase (Auth)
```

## Data Model (Summary)

- `Case` (type: `BENI_MOBILI` | `SANZIONI_AMMINISTRATIVE`, `data: Json`, `stage`, `completed`)
- `Task` (title, description, `metadata: Json` with checklist/due_by, status)
- `CaseDocument` (file_name, content_type, s3_key, url?, category?, metadata?)
- `Chat` (chat_history JSON, `progress` JSON, `case_id?`)

## Flow

1. Discovery chat (client) → `chat.sendMessage` (tRPC) collects data and updates `progress`
2. At discovery end → creates a `Case`
3. Task generation (AI) via `generateObject` with simple, personalized prompt (everyday language)
4. Court finder: LLM with `LISTA_GIUDICI` to identify competent office (local fallback)
5. Documents: S3 presigned URL → `attachDocument` saves metadata in Prisma

## Tech Stack

- Next.js 15, React 19
- TypeScript
- tRPC
- Prisma (PostgreSQL)
- Supabase Auth
- AWS S3
- Vercel AI SDK (OpenAI, Perplexity)
- Tailwind + shadcn/ui
- Lovable (blog)
- Beyond Presence (landing page visitor activation)

## Development

1. Copy `.env.example` to `.env` and set keys (DB, Supabase, S3, AI)
2. Install dependencies: `npm i`
3. Generate Prisma client: `npx prisma generate`
4. Run migrations: `npx prisma migrate dev`
5. Start dev server: `npm run dev`

Optional variables:
- `PERPLEXITY_API_KEY` for enhanced court finder and task generation

## Security & Notes

- Supabase for auth only; all data operations through Prisma
- Input validated with Zod in tRPC routers
- JSON fields for flexibility, avoiding schema lock-in
- No legal advice: generated text is practical procedural guidance only