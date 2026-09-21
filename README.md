<div align="center">

# ⚡ Cuelara

### The Professional Prompt Engineering & Token Optimization Suite

**Precision-engineered prompts. Zero hallucination padding. Up to 50% token savings.**

[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-v7-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](./LICENSE)

<br/>

> *"Most prompt tools focus on making prompts longer. Cuelara focuses on making them sharper, shorter, and mathematically precise."*

</div>

---

## 🌟 Overview

**Cuelara** is a production-grade AI prompt engineering platform built for developers, AI engineers, and teams running LLMs at scale. Instead of bloating prompts with conversational filler and redundant instructions, Cuelara applies structural rigor, constraint anchoring, and token compression to maximize model reasoning while slashing inference latency and API costs.

Whether you're developing autonomous agents, fine-tuning system prompts for production APIs, or refining complex multi-step reasoning workflows, Cuelara gives you the surgical precision needed to get deterministic, high-fidelity outputs from any frontier model.

---

## 🛠️ Core Toolkit

<div align="center">

| Tool | Focus | Impact |
| :--- | :--- | :--- |
| **[Prompt Optimizer](#-prompt-optimizer)** | Structure & Role Anchoring | Converts messy drafts into battle-tested production prompts |
| **[Token Optimizer](#-token-optimizer)** | Token Reduction & Compression | Cuts token usage by up to 50% with zero loss of semantic intent |
| **[Prompt Debugger](#-prompt-debugger)** | Static & Semantic Auditing | Identifies ambiguities, edge-case loopholes, and hallucination triggers |
| **[Prompt Formatter](#-prompt-formatter)** | Syntax & Standardisation | Structures inputs using industry-standard XML tags, markdown, and delimiters |
| **[Intelligence Score](#-intelligence-score)** | Quantitative Evaluation | Benchmarks prompt readiness, constraint firmness, and clarity |
| **[Compare & Estimate](#-compare--estimate)** | Token Economics | Real-time multi-model cost calculations across OpenAI, Anthropic, and Gemini |
| **[Context Extractor](#-context-extractor)** | Document Ingestion | Extracts core rules and constraints directly from PDFs, DOCX, and raw files |

</div>

---

### ⚡ Prompt Optimizer
Transforms unstructured, ambiguous ideas into high-performing prompts engineered for deterministic execution.
- **Role & Persona Anchoring:** Grounds the model with domain expertise and behavioral boundaries.
- **Negative Constraints:** Explicitly defines what *not* to do, preventing conversational deviations and runaway output.
- **Mode Selection:** Tailors structure for specialized domains including **Code & Architecture**, **System Prompts**, **Creative Workflows**, and **Formal Reasoning**.
- **Real-time Streaming:** Low-latency token generation powered by optimized server-sent event protocols.

### 📉 Token Optimizer
Reduces token volume without stripping essential instructions, domain terminology, or output formatting constraints.
- **Semantic Compaction:** Strips conversational pleasantries, syntactic redundancy, and duplicate context.
- **BPE-Accurate Counting:** Real-time token calculation using native Byte-Pair Encoding (`gpt-tokenizer`).
- **Visual Diff Inspection:** Side-by-side highlighting showing exact character and token reductions.
- **Cost Scaling:** Directly reduces recurring API spend for high-throughput batch and agentic pipelines.

### 🔍 Prompt Debugger
Runs deep diagnostic audits on your prompts before they are deployed to production systems.
- **Loophole & Edge-Case Detection:** Uncovers conflicting instructions and vague requirements.
- **Hallucination Risk Analysis:** Flags ungrounded assumptions and missing factual boundaries.
- **Security & Leak Prevention:** Identifies vulnerabilities susceptible to prompt injection or system prompt extraction.
- **Actionable Fixes:** Provides line-by-line remediation suggestions with one-click corrections.

### 🧹 Prompt Formatter
Brings discipline and cleanliness to messy, unformatted text blocks.
- **XML Tag Hierarchy:** Encapsulates content into clean semantic blocks (`<context>`, `<instructions>`, `<constraints>`, `<output_format>`).
- **Markdown Normalization:** Standardizes headings, lists, bullet structures, and code fences.
- **Fluff Elimination:** Strips filler phrases like *"Please make sure to"* and *"I want you to act as"*.

### 📊 Intelligence Score Engine
Evaluates prompt engineering quality using a comprehensive scoring index:
- **Clarity & Specificity Index:** Measures deterministic instructions against open-ended ambiguity.
- **Constraint Rigor:** Evaluates the presence and enforceability of negative and positive constraints.
- **Context Sufficiency:** Verifies whether background variables, input parameters, and output expectations are complete.

### 💰 Compare & Estimate
An interactive cost workbench to model token economics across the world's leading LLMs.
- **Cross-Provider Matrix:** Every model side by side — **OpenAI (GPT-4o, GPT-4o mini)**, **Anthropic (Claude Sonnet 5, Haiku 4.5)**, **Google (Gemini 3.6 Flash, 3.1 Pro)**, and **DeepSeek V4-Flash** — with input/output rates, context-window usage, and net savings per model.
- **Input vs Output Economics:** A Recharts breakdown showing that shortening a prompt cuts input cost while output cost stays fixed, with an adjustable expected-output length.
- **Scale Tiers:** Savings projected at 1K, 10K, 100K, and 1M requests per month, or any custom volume.
- **Single Pricing Source:** All rates live in `src/lib/model-pricing.ts`, dated and linked to each provider's pricing page.

### 📑 Context Extractor
Converts bloated reference documents into lightweight, high-density context blocks.
- **Native Document Support:** Parses **PDF** and **Word (DOCX)** documents directly in the browser using high-fidelity extractors (`pdf-parse`, `mammoth`).
- **Rule Distillation:** Filters background noise, marketing speak, and boilerplate to leave only actionable business logic and data schemas.

---

## 🎯 The Cuelara Philosophy

```
  ┌─────────────────────────────────────────────────────────┐
  │                    Conventional Tools                   │
  │   Vague Input ──▶ AI Expander ──▶ 1,500 Bloated Tokens  │
  │   (More tokens = Slower latency, higher API bills)      │
  └─────────────────────────────────────────────────────────┘
                               vs
  ┌─────────────────────────────────────────────────────────┐
  │                     Cuelara Engine                      │
  │   Raw Idea ──▶ Structural Optimization ──▶ 350 Tokens   │
  │   (Higher reasoning quality, deterministic output)      │
  └─────────────────────────────────────────────────────────┘
```

1. **Better Prompts, Not Longer Prompts**  
   We believe prompt engineering is an optimization discipline, not a creative writing exercise. Every token should earn its place in the context window.
2. **Deterministic Output Over Fluff**  
   Frontier models thrive on clear role definitions, strict boundary declarations, and structured schemas, not endless paragraphs of natural language.
3. **Model-Agnostic Precision**  
   While tailored for frontier reasoning architectures, Cuelara prompts adhere to foundational LLM attention mechanisms, ensuring portability across all major providers.
4. **Zero-Invention Guarantee**  
   Cuelara refines your intent without hallucinating extra requirements, changing technical constraints, or assuming unstated frameworks.

---

## 🌐 Model Compatibility

Cuelara-engineered prompts are rigorously tested and verified across all leading frontier models and AI-assisted development environments:

| Model Family | Key Targets | Supported Features |
| :--- | :--- | :---: |
| **OpenAI** | GPT-4o, GPT-4o-mini, o1, o3-mini | Structured Outputs, System Instructions, JSON Schema |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus | XML Tag Architectures, Artifact Formatting, Thinking Blocks |
| **Google** | Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 1.5 Pro | Multi-modal Prompts, Large-Context Pinpointing, System Roles |
| **Open Weights & Frontier** | DeepSeek V3/R1, Grok 2/3, Qwen 2.5, Llama 3.3 | Concise Reasoning Anchors, Minimal Attention Loss |
| **AI IDEs & Coding Agents** | Cursor, Windsurf, GitHub Copilot, Lovable, Bolt | `.cursorrules`, System Prompts, Multi-file Context Formatting |

---

## 🏗️ Architecture & Engineering Highlights

```
                          ┌──────────────────────────┐
                          │   Next.js 16 Client      │
                          │ (React 19 / Tailwind v4) │
                          └─────────────┬────────────┘
                                        │
                         Streaming HTTP / SSE Protocol
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │   Next.js API Gateway    │
                          │ Rate-Limiting & Security │
                          └─────────────┬────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
┌──────────────────────────┐                         ┌──────────────────────────┐
│  Primary Inference Core  │                         │  Failover LLM Chain      │
│  Gemini GenAI Engine     │ ──(Automatic Fallback)─▶│  Secondary Provider      │
│  (Dynamic Key Rotation)  │                         │  (Zero-Downtime Pipeline)│
└──────────────────────────┘                         └──────────────────────────┘
             │                                                     │
             └──────────────────────────┬──────────────────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │ PostgreSQL / Prisma ORM  │
                          │ NextAuth Session Engine  │
                          └──────────────────────────┘
```

- **Resilient AI Pipeline:** Intelligent provider failover architecture with key rotation mechanisms, graceful retries, and comprehensive error shielding.
- **Client-Side Tokenization:** Near-instant token evaluations running directly in WebAssembly/V8 contexts without leaking prompt data over the wire.
- **Stateless & Private:** High-performance prompt processing with zero telemetry logging on private prompt inputs.
- **Fluid Micro-Interactions:** Modern UI constructed with Tailwind CSS v4, Radix UI primitives, Lucide iconography, and responsive Framer Motion animations.

---

## 💻 Technology Stack

```
Frontend Architecture
├── Next.js 16 (App Router, Server Actions, Dynamic Layouts)
├── React 19 (Concurrent Rendering, Server Components)
├── Tailwind CSS v4 (Modern CSS Engine, Fluid Theme Variables)
├── Framer Motion (Micro-animations & Interactive State Transitions)
├── Radix UI (Accessible Dialogs, Menus, and Slots)
└── Lucide React (Streamlined Iconography)

Backend & AI Layer
├── Google GenAI SDK (@google/genai)
├── Dynamic Multi-Tier Model Chain & Key Rotation
├── gpt-tokenizer (Accurate BPE Tokenizer)
├── diff (Character & Word Level Diffing Engine)
├── pdf-parse & mammoth (In-browser Document Analysis)
└── Recharts (Responsive Model Cost Visualizations)

Database & Security
├── Prisma ORM v7 (@prisma/client, @prisma/adapter-pg)
├── PostgreSQL Connection Pooling (pg)
├── NextAuth.js (Session Management & Adapter Verification)
└── Bcrypt.js (Secure Authentication)
```

---

## 🔒 Security & Privacy

- **No Prompt Storage:** Your prompts belong strictly to you. Cuelara does not store, index, or use your prompt text for AI training.
- **Direct Streaming:** Optimization streams directly from the underlying inference provider to your client session.
- **Enterprise-Grade Sanitization:** Secure input isolation protects against accidental client-side injection and token overflow.

---

## 📥 Blog Sync API (portfolio → Cuelara)

`POST /api/blog-posts` receives blog posts pushed from the portfolio site. It is idempotent: `external_id` (the post ID on the sending site) is the source of truth, so retries and duplicate deliveries update the same row.

- **Auth:** `Authorization: Bearer <PORTFOLIO_API_TOKEN>` (constant-time compare; 401 if missing/invalid or if the env var is unset).
- **Responses:** `201` created, `200` updated → `{ "id", "external_id", "status": "created"|"updated", "url" }`. `422` `{ "message", "errors": { field: [messages] } }` on validation failure, `400` malformed JSON, `413` body over 1 MB, `500` generic error. Only 2xx means the post is fully saved.
- **Slugs:** a slug already used by a different post gets `-2`, `-3`, ...; an existing post's slug never changes on update.
- **Categories/tags:** found or created by slugified name and replaced on every update, in the same transaction as the post.
- **Images:** `image_url` is hotlinked, never downloaded. `canonical_url` is rendered as `<link rel="canonical">` on `/blog/<slug>`.
- **Visibility:** only `status = published` with `published_at <= now` is served on `/blog/<slug>`; drafts 404. Markdown is rendered with `react-markdown` (raw HTML is escaped).

```bash
# Create (201) — repeat the same command to update (200)
curl -i -X POST http://localhost:3000/api/blog-posts \
  -H "Authorization: Bearer $PORTFOLIO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: post-123-v1" \
  -d '{
    "external_id": 123,
    "title": "Hello world",
    "slug": "hello-world",
    "excerpt": "A short teaser",
    "body": "## Hi\n\nMarkdown body",
    "status": "published",
    "image_url": "https://portfolio.example/storage/hello.png",
    "source_image_url": null,
    "categories": ["Guides"],
    "tags": ["laravel", "nextjs"],
    "published_at": "2026-09-21T10:00:00+00:00",
    "canonical_url": "https://portfolio.example/blog/hello-world"
  }'

# 401: no token        -> curl -i -X POST http://localhost:3000/api/blog-posts -d '{}'
# 422: invalid payload -> same request with a Bearer token and  -d '{"title": ""}'
```

Run the tests (in-memory Postgres, no external database needed) with `npm test`.

Database changes ship as a Prisma migration; apply it with `npx prisma migrate deploy`.

---

## 🤝 Community & Contributions

Cuelara is an open-source initiative designed to establish industry-standard prompt engineering conventions. Contributions, feature suggestions, and pull requests are welcomed:

- **Issues:** Found a bug or have an idea for an optimizer mode? [Open an Issue](https://github.com/aliyanfaisal/Cuelara-AI-Prompt-Optimizer-Debugger-Token-Reducer/issues).
- **Discussions:** Share innovative prompt patterns, token compression strategies, and benchmark reports.

---

<div align="center">

**Cuelara** — Built for developers who care about precision, not padding.

[Report Bug](https://github.com/aliyanfaisal/Cuelara-AI-Prompt-Optimizer-Debugger-Token-Reducer/issues) • [Request Feature](https://github.com/aliyanfaisal/Cuelara-AI-Prompt-Optimizer-Debugger-Token-Reducer/issues)

</div>