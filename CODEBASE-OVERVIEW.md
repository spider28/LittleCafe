# LittleCafe — Codebase Overview

A scan of the repository as of 2026-08-20 (branch `main`, uncommitted work on top of `d319771`): what the project is, what it is built with, and how the chatbot works end to end.

> **Latest change:** the chatbot moved from GitHub Models to **Google Gemini** after GitHub Models was retired on
> July 30, 2026. See [§4.7](#47-provider-selection--admin-not-env) for the provider model and [§8](#8-current-runtime-state-and-observations) for what still needs doing.

---

## 1. What the project is

**LittleCafe** is a responsive cafe website with three parts:

1. **Public marketing/ops site** — Home, Pricing, Gallery, Menu, Calendar, Partnership, Waiver, Contact.
2. **Admin console** (`/admin`) — chatbot configuration and knowledge management, reservations, gallery uploads, waiver search, contact messages, and visit analytics.
3. **A site-wide AI chatbot** — RAG over admin-curated knowledge, plus a LangGraph state machine for multi-turn party planning.

The git history shows the project was built up chatbot-feature-by-feature: v1 chat → provider settings → rate-limit logging → RAG → LangGraph multi-step → LangSmith tracing → admin-reviewed knowledge gaps → Gemini provider migration.

---

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components, Server Actions) |
| UI | React 19, Tailwind CSS 3.4 with custom tokens (`roast`, `crema`, `ink`, `berry`), `lucide-react`, `clsx` |
| Language | TypeScript 5.7 (strict, `@/*` path alias) |
| Data / Auth / Storage | Supabase — Postgres + `pgvector`, Auth (email + password), Storage (`gallery` bucket), RLS on every table |
| LLM providers | Google Gemini (default), OpenAI Responses API, or GitHub Models (retired) — raw `fetch`, no vendor SDK |
| Embeddings | `gemini-embedding-001` / `text-embedding-3-small`, `vector(1536)`, HNSW cosine index |
| Orchestration | `@langchain/langgraph` v1.4 (`StateGraph` + `Annotation.Root`) |
| Observability | LangSmith `traceable` wrappers around every model/embedding call |
| Validation | Zod 3 |
| Email | Resend (contact form notifications) |
| Testing | Vitest (unit) + Playwright (e2e) |
| Deploy target | Vercel |

### Notable structural choices

- **No API layer for mutations.** Everything except `/api/chat` and `/api/visits` goes through Server Actions in [`src/lib/actions.ts`](src/lib/actions.ts).
- **Two Supabase clients.** `createSupabaseServerClient()` (anon key + cookies, RLS-enforced) for user-scoped work; `createSupabaseAdminClient()` (service-role, nullable) only for chat threads, knowledge-gap capture, and visit analytics. See [`src/lib/supabase.ts`](src/lib/supabase.ts).
- **`src/proxy.ts` is Next.js 16's renamed middleware.** It only stamps `x-littlecafe-pathname` / `x-littlecafe-search` headers so visit tracking can read the route.
- **The app degrades without env vars** — pages render, but forms, auth, uploads, email, and chatbot replies need their matching keys.
- **One provider registry.** [`src/lib/chat-providers.ts`](src/lib/chat-providers.ts) is the single source for each provider's key, endpoints, models, API shape, and retirement status. The route, the RAG layer, and the Admin UI all read from it instead of branching on provider names, so adding a provider is one entry plus a schema CHECK.

---

## 3. Repository layout

```
src/
  app/
    api/chat/route.ts        # the chatbot endpoint
    api/visits/route.ts      # visit logging
    admin/                   # layout (auth gate) + 6 admin subpages
    <public pages>/          # home, pricing, gallery, menu, calendar, ...
  components/
    Chatbot.tsx              # floating chat widget (client)
    VisitTracker.tsx, Header, Footer, CalendarGrid, ActionForm, Field, ...
    admin/                   # AdminPanel, AdminTabs, AdminSectionHeader
  lib/
    chat-providers.ts        # per-provider keys, endpoints, models, API shape
    chat-workflow.ts         # LangGraph party-planning state machine
    chat-thread-store.ts     # thread state persistence
    rag.ts                   # embeddings + vector retrieval
    knowledge-gaps.ts        # unanswered-question capture
    langsmith.ts             # traced fetch wrappers
    actions.ts               # all Server Actions
    data.ts, admin.ts, env.ts, schemas.ts, content.ts, visits.ts, supabase.ts
  proxy.ts                   # Next 16 middleware
  types/database.ts
supabase/schema.sql          # idempotent full schema + RLS + RPCs
tests/                       # 6 Vitest files
e2e/public.spec.ts           # Playwright
```

---

## 4. The chatbot

### 4.1 Request flow

```mermaid
flowchart TD
    A[Chatbot.tsx widget<br/>sessionId in localStorage] -->|POST last 10 msgs| B[/api/chat]
    B --> C{chatbot_enabled?}
    C -->|no| C1[404]
    C -->|yes| D[Validate with chatRequestSchema<br/>keep last 8 messages]
    D --> E[Load thread state from<br/>chatbot_threads by sessionId]
    E --> F[LangGraph: runChatWorkflow]
    F --> G{route}
    G -->|party| H[Deterministic reply<br/>NO LLM call]
    G -->|faq| I[Embed question<br/>active provider, 1536 dims]
    I --> J[RPC match_chatbot_knowledge<br/>cosine, per-provider threshold, top 5<br/>filtered to this provider]
    J --> K[Build instructions + context]
    K --> L{API shape}
    L -->|responses| M[OpenAI Responses API]
    L -->|chat-completions| N[Gemini / GitHub Models]
    M --> O[Reply]
    N --> O
    O --> P{retrieval succeeded<br/>but 0 matches?}
    P -->|yes| Q[capture_chatbot_knowledge_gap<br/>→ admin review queue]
    P -->|no| R[Return reply]
    Q --> R
```

### 4.2 Client widget — [`src/components/Chatbot.tsx`](src/components/Chatbot.tsx)

- Floating bottom-right panel, mounted in [`src/app/layout.tsx`](src/app/layout.tsx) **only when** `chatbot_enabled` is true in `site_settings`.
- Generates a stable session ID with `crypto.randomUUID()` and keeps it in `localStorage` under `littlecafe-chat-session`.
- Sends the last 10 messages per request; inputs capped at 1200 characters (matching `chatMessageSchema`).
- Purely local message state — no history is replayed from the server on reload.
- Suggested-prompt chips appear on a fresh conversation and map to the two supported lanes (RAG FAQ and party planning); the composer is an auto-growing textarea with Enter to send and Shift + Enter for a newline; Escape closes the panel.
- Motion uses the `chat-panel` / `chat-bubble` / `chat-dot` keyframes defined in [`tailwind.config.ts`](tailwind.config.ts), with a global `prefers-reduced-motion` opt-out in [`src/app/globals.css`](src/app/globals.css).

### 4.3 API route — [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts)

Runs on the Node.js runtime. Steps:

1. **Gate** — `getChatbotSettings()`; returns 404 if the chatbot is disabled.
2. **Validate** — `chatRequestSchema` (1–16 messages, optional `sessionId`); trims to the last 8 messages.
3. **Load thread state** — from `chatbot_threads.state` (JSONB) via the service-role client.
4. **Run LangGraph** — see §4.4. State is saved back after every turn.
5. **Branch** — if the workflow routes to `party` and produced a reply, return it immediately; **no LLM is called**.
6. **Retrieve** — otherwise embed the latest user message and query the `match_chatbot_knowledge` RPC.
7. **Generate** — send instructions + retrieved knowledge + static cafe facts to the selected provider, capped at 350 output tokens.
8. **Capture gaps** — if retrieval succeeded but matched nothing, queue the question for admin review.

Two API shapes are handled, selected by [`chat-providers.ts`](src/lib/chat-providers.ts):

| | `responses` (OpenAI) | `chat-completions` (Gemini, GitHub Models) |
| --- | --- | --- |
| Endpoint | `/v1/responses` | `/v1beta/openai/chat/completions`, `/inference/chat/completions` |
| System prompt | `instructions` field + `developer` role message | single `system` message |
| Token cap | `max_output_tokens: 350` | `max_tokens: 350` |
| Extraction | `output_text` or flattened `output[].content[].text` | `choices[0].message.content` |

Gemini is reachable through its OpenAI-compatible endpoint, so it reuses the same code path as GitHub Models
rather than needing a third branch.

**Thinking tokens.** Gemini 3 Flash is a reasoning model and spends internal thinking tokens out of the same
budget as `max_tokens`. At the app's 350-token cap it consumed ~287 on thinking, truncating replies
(`finish_reason: "length"`); at smaller caps it returned an empty `message` with `completion_tokens: 0`, which the
route surfaces as a 502. Sending `reasoning_effort: "none"` (configurable via `GEMINI_REASONING_EFFORT`) removes
the thinking budget entirely — the same question then finished cleanly in 106 total tokens instead of 412.

`logRateLimitHeaders()` dumps rate-limit / retry / request-id headers to the console after each call — deliberate observability, not leftover debugging.

### 4.4 Party planning — [`src/lib/chat-workflow.ts`](src/lib/chat-workflow.ts)

A three-node LangGraph `StateGraph`:

```
START → classify ──(faq)──→ END
             └──(party)──→ updateParty → partyReply → END
```

- **`classify`** — pure regex, no LLM. Reset words (`cancel`, `reset`, `start over`, …) clear the snapshot, and an explicit "another/new/different <booking>" starts a fresh plan instead of amending the current one. A message counts as party-related if it mentions party/event/booking vocabulary. While a plan is **unconfirmed**, a message is kept in the lane only if it names the plan or carries a detail the planner could record — and a question about an FAQ topic (hours, menu, location, pets…) escapes to retrieval even when it contains a day word like "weekend". Once **confirmed**, only party-specific vocabulary keeps it in the lane.
- **`updateParty`** — regex slot extraction into `PartyPlanningState`: `partySize`, `budget`, `exactDate`, `dayPreference`, `timePreference`, `beveragesForKids`, `snacks`, `contactName`, `contactPhone`. Changing any detail after confirmation resets `confirmed` to false. `resolveRelativeDate()` turns "today", "tomorrow", "the day after tomorrow", and "next <weekday>" into a concrete date; a bare weekday stays a *preference* rather than a booked date.
- **`partyReply`** — `missingPartyFields()` drives the response: ask for up to two missing fields, or summarize and request confirmation, or acknowledge the confirmation.

**The workflow never writes a `reservations` row.** It ends by directing the guest to phone or the Contact page. Writing bookings via tool/function calling is the documented V2/V3 roadmap.

State is persisted per session in `chatbot_threads` with a 14-day `expires_at` ([`src/lib/chat-thread-store.ts`](src/lib/chat-thread-store.ts)). Note that nothing in the repo currently prunes expired rows.

### 4.5 RAG — [`src/lib/rag.ts`](src/lib/rag.ts)

- `createEmbedding(input, provider)` resolves the provider from the registry and returns `{ embedding, provider, model }` — the provenance travels with the vector so writers can record who produced it. A missing key raises a configuration-specific error naming the env var to add.
- **Width handling.** Providers that need to be told the size are sent `dimensions: 1536` (Gemini); those that are natively 1536 (OpenAI `text-embedding-3-small`) are left alone. `fitEmbeddingWidth()` then truncates anything longer — the documented way to shrink a Matryoshka embedding, and a safety net if a compat layer ignores the `dimensions` field. A vector that comes back *too short* cannot be repaired and throws.
- `retrieveChatbotKnowledge()` returns `{ matches, succeeded }` — the `succeeded` flag is what distinguishes "we searched and found nothing" (a real knowledge gap) from "we could not search at all" (misconfiguration). Only the former triggers gap capture.
- Retrieval parameters: **top 5**, cosine distance, `active` chunks only, **restricted to chunks embedded by the active provider**, at **that model's own threshold** — 0.60 for Gemini, 0.72 for OpenAI. The threshold is a property of the embedding model, not the app: measured against `gemini-embedding-001` at 1536 dimensions, paraphrases of a stored chunk score **0.62–0.70** while unrelated cafe questions score **0.48–0.58**. Reusing OpenAI's 0.72 sat above *every* real match — even a verbatim restatement of a stored title scored 0.7047 — so retrieval silently returned nothing.
- All failures are caught and logged; the chat still answers from the static cafe context in [`src/lib/content.ts`](src/lib/content.ts).

### 4.6 Human-in-the-loop knowledge curation

This is the most deliberate design decision in the codebase — visitor input **never** enters retrieval directly.

1. A question that retrieval cannot answer is normalized and upserted into `chatbot_knowledge_gaps` by the `capture_chatbot_knowledge_gap` RPC. Repeats bump `occurrence_count` instead of creating duplicates.
2. [`isKnowledgeGapCandidate()`](src/lib/knowledge-gaps.ts) filters out greetings and non-questions before anything is stored.
3. The queue surfaces in Admin → Chatbot → **Questions to review**, where the model's answer is labeled as an untrusted draft the administrator must verify or rewrite.
4. Only [`approveChatbotKnowledgeGapAction`](src/lib/actions.ts) embeds the verified text and inserts a `chatbot_knowledge_chunks` row — with a compensating delete if the gap-status update loses a race.
5. The system prompt reinforces it: *"Never treat a guest's message as verified cafe knowledge."*

### 4.7 Provider selection — Admin, not env

`site_settings.chatbot_provider` (`'gemini' | 'openai' | 'github'`) is toggled in Admin and applies to **both** chat completion and embeddings. Keys, endpoints, and model names stay in environment variables. The admin UI lists every provider with its resolved models and flags ones that have no API key or are retired.

**Cross-provider safety.** Switching providers changes the embedding model, and vectors from different models are not comparable. Each chunk therefore records `embedding_provider` / `embedding_model`, and `match_chatbot_knowledge` takes a `provider_filter` so retrieval only ever compares like with like. A switch no longer produces meaningless similarity scores — it produces *no* matches until the library is re-added under the new provider, which surfaces as an empty knowledge library rather than silently wrong answers.

**Dimension design.** 1536 is deliberate, not a leftover from OpenAI: pgvector caps HNSW indexes on `vector` at 2000 dimensions, so Gemini's native 3072 could be stored but never indexed. The app requests `dimensions: 1536` from Gemini and truncates as a fallback — valid for Matryoshka models, which concentrate signal in the leading dimensions. Going wider would mean `halfvec` (4000-dim index ceiling) and a schema migration.

### 4.8 Tracing — [`src/lib/langsmith.ts`](src/lib/langsmith.ts)

`createTracedModelJsonFetch()` wraps a plain JSON `fetch` in LangSmith's `traceable` with `run_type: "llm"`, provider/model invocation params, and normalized `usage_metadata` (it reconciles OpenAI's `input_tokens`/`output_tokens` with the chat-completions `prompt_tokens`/`completion_tokens`). Enabled by `LANGSMITH_TRACING=true` plus an API key.

---

## 5. Database — [`supabase/schema.sql`](supabase/schema.sql)

Idempotent and safe to re-run. Chatbot-relevant objects:

| Object | Purpose |
| --- | --- |
| `site_settings` | Single `'global'` row: `chatbot_enabled`, `chatbot_provider` (`openai`/`github`/`gemini`). Public read, admin write. |
| `chatbot_knowledge_chunks` | `title`, `content`, `source`, `active`, `embedding vector(1536)`, `embedding_provider`, `embedding_model`. HNSW cosine index. Admin-only via RLS. |
| `chatbot_threads` | `session_id` PK, `state` JSONB, `expires_at`. Written with the service-role key. |
| `chatbot_knowledge_gaps` | `normalized_question` UNIQUE, `question`, `suggested_answer`, `status` (pending/approved/dismissed), `occurrence_count`, FK to the chunk created on approval. |
| `match_chatbot_knowledge()` | `security definer` similarity search with an optional `provider_filter`. Granted to `anon` + `authenticated`; caps `match_count` at 10. |
| `capture_chatbot_knowledge_gap()` | `security definer` dedupe-upsert. Revoked from `public`, granted **only to `service_role`**. |

Other tables: `admin_profiles` (the allowlist), `gallery_photos`, `reservations`, `waiver_submissions`, `contact_messages`, `website_visits`. RLS is enabled on all of them, with a shared `public.is_admin()` helper.

---

## 6. Admin, auth, and analytics

- **Auth gate** — [`src/app/admin/layout.tsx`](src/app/admin/layout.tsx) renders a login view when signed out, an "access required" view when signed in but not allowlisted, and the tabbed console otherwise.
- **Allowlist** — [`isAdminUser()`](src/lib/admin.ts) matches either `ADMIN_EMAIL` from the environment or a row in `admin_profiles` (by `user_id` **or** `email`). Every mutating Server Action re-checks with `requireAdmin()` and redirects on failure.
- **Visit tracking** — `VisitTracker` posts to `/api/visits`; `proxy.ts` supplies the path. Admin, API, framework, and asset paths are ignored, and localhost/loopback traffic is filtered out of analytics.

---

## 7. Tests

| File | Covers |
| --- | --- |
| `tests/chat-workflow.test.ts` | Multi-turn slot filling, confirmation, reset wording, re-opening a confirmed party on edits, FAQ fall-through from confirmed *and* unconfirmed threads, clock-time parsing, relative dates, new-request reset |
| `tests/chat-providers.test.ts` | Provider validation, unknown-provider fallback, per-provider embedding width, thinking suppression, relevance thresholds, retirement flags |
| `tests/rag-embedding.test.ts` | Embedding width: pass-through at 1536, truncation from 3072, rejection of too-short vectors |
| `tests/knowledge-gaps.test.ts` | Question detection vs. greetings, size bounds |
| `tests/schemas.test.ts` | Contact, waiver, reservation ordering, gallery, knowledge-chunk validation |
| `tests/visits.test.ts`, `tests/visits-data.test.ts` | Path filtering, local-dev exclusion, client fallback, error propagation |
| `tests/admin.test.ts` | Case-insensitive allowlist matching |
| `e2e/public.spec.ts` | Public page smoke tests |

42 unit tests across 8 files. The `/api/chat` route handler itself still has no direct test coverage — the workflow, provider registry, and embedding-width logic are tested in isolation instead, and the network-dependent paths were verified by hand against the live API (see §8).

---

## 8. Current runtime state and observations

**The Gemini migration is complete and verified end to end.** Schema applied,
`site_settings.chatbot_provider = 'gemini'`, key in place. Confirmed against the live API:

| Check | Result |
| --- | --- |
| Model ID `gemini-3.7-flash` | Valid |
| `max_tokens` on the compat endpoint | Accepted (no `max_completion_tokens` needed) |
| Embeddings with `dimensions: 1536` | Returns exactly 1536 |
| FAQ lane through `/api/chat` | Correct weekend hours |
| Party lane | Works with no API key — LangGraph is deterministic |
| RAG round trip | Stored a loyalty-program chunk, asked in different words ("rewards card for regulars"), got the stored details back |
| Knowledge-gap capture | Unanswered questions queue as `pending` with the draft answer |
| Guardrail | Asked about a dog policy with no knowledge — deferred to phone/email instead of inventing one |

Env state: Supabase, `ADMIN_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `GEMINI_API_KEY`, and LangSmith are all set.
`OPENAI_API_KEY` / `OPENAI_MODEL` are empty, `GITHUB_TOKEN` is set but points at a retired service, and
`RESEND_API_KEY` is empty so contact emails will not send.

**The knowledge library is empty.** The two chunks that existed ("hours", "location") were embedded by GitHub
Models and could not be compared against Gemini vectors, so they were deleted. Neither is a real loss — both
duplicated `cafe.hours` / `cafe.address` from [`src/lib/content.ts`](src/lib/content.ts), which the route already
injects as static context on every request. New knowledge added in Admin will be embedded by Gemini and tagged
accordingly.

**Gemini returns 503 "model overloaded" intermittently** on the free tier. It is transient and retrying succeeds,
but there is no retry logic — the visitor sees "The chatbot could not answer right now." Gemini also sends no
`x-ratelimit-*` headers, so `logRateLimitHeaders()` logs only nulls for it.

Four other things worth tracking:

1. **`langsmith` is imported but is not a direct dependency.** [`src/lib/langsmith.ts`](src/lib/langsmith.ts) imports `langsmith/traceable`, which resolves only transitively through `@langchain/langgraph`. A dependency bump or a stricter install mode could break the build. Adding it to `package.json` would make this explicit.
2. **The `OPENAI_MODEL` fallback in [`src/lib/env.ts`](src/lib/env.ts) is `gpt-5.5`**, which is not a real model ID — the fallback path would fail against the live API.
3. **The Gemini relevance threshold has a narrow margin.** 0.60 sits between the highest unrelated score measured (0.5835, "How much is a latte?" — semi-related, both about drinks) and the lowest related one (0.6230). It separated every sample cleanly, but it was tuned on a single stored chunk. Worth re-checking once the knowledge library has real content: too high silently disables retrieval, too low pulls in wrong chunks.
4. **No retry on transient upstream failures.** A Gemini 503 surfaces directly to the visitor. A single retry with a short backoff in [`route.ts`](src/app/api/chat/route.ts) would cover it.

---

## 9. Roadmap the code points to

The README's V2/V3 section and the workflow's closing message agree: the next step is tool/function calling coordinated by LangGraph, exposing narrowly scoped tools to check reservation availability, collect guest details, and write `reservations` rows after explicit confirmation. The current party workflow already collects exactly the fields such a tool would need.

The README still frames this as OpenAI-specific. Gemini also supports function calling through the same OpenAI-compatible endpoint the chatbot now uses, so the roadmap is not blocked by the provider switch — but whichever provider is chosen, tool definitions would need a home in the provider registry alongside endpoints and models.
