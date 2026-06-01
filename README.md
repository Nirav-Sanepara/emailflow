# 📧 EmailFlow

[![Next.js](https://img.shields.io/badge/Next.js-16-black)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)]()
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)]()
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)]()
[![License](https://img.shields.io/badge/License-MIT-yellow)]()

Event-driven email automation platform. Non-technical users can create templates, define trigger rules, simulate events, and send personalized emails — all without writing code.

> Test credentials: `admin@example.com` / `Test123456`

---

## Features

- **Template Management** — Handlebars placeholders (`{{first_name}}`), live preview, AI copywriting assistant (rewrite tone, generate subject variants, fix grammar)
- **Rule Engine** — Event-driven rules with condition builder. Supports user profile, plan features, and event payload fields. Smart operator filtering per field type.
- **Event Simulator** — Test any rule without coding: load user by email, pick event type, fill payload, and see instant match/fail results
- **Idempotent Processing** — Duplicate events are safely ignored. Same idempotency key = same event processed once.
- **Observability** — Events page, email delivery logs with status, evaluation logs showing per-condition pass/fail

## Quick Start

```bash
git clone <repo-url>
cd email-deepseek
npm install
cp .env.example .env.local   # fill in your keys
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `RESEND_API_KEY` | Email delivery via Resend |
| `OPENCODE_ZEN_API_KEY` | AI copywriting features |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

## Seed Data

```bash
npx prisma db seed
```

Creates: 3 plans (Free/Pro/Enterprise), 5 templates with placeholders, 5 rules with conditions, 5 test user profiles, 10 historical events, email logs, and evaluation logs.

### Test the Core Flow

1. Login as `admin@example.com` / `Test123456`
2. Go to **Event Simulator**
3. Enter email `pro_user@example.com`, event type `plan_upgraded`
4. Add payload `plan_name = "pro"`
5. Click **Send Event** — watch the rule match/evaluation results

## Architecture

```
├── app/api/          # Route handlers (events, templates, rules, AI)
├── app/(dashboard)/  # Pages (dashboard, templates, rules, events, logs)
├── components/       # Reusable UI (template editor, rule form, modals)
├── lib/
│   ├── ai/           # OpenAI integration for copywriting
│   ├── email/        # Handlebars renderer + Resend provider
│   ├── events/       # Event ingestion service
│   ├── rules/        # Rule engine + condition evaluator
│   ├── templates/    # Template CRUD + variable definitions
│   └── supabase/     # Auth helpers
└── prisma/           # Schema + migrations + seed
```

Key design decisions:
- Business logic in modules, not route handlers
- Rule conditions stored relationally (queryable, not opaque JSON)
- Condition evaluator uses operator registry — easy to add new operators
- Plans are a separate normalized table — feature-based rules work without magic strings
- Each rule evaluation is wrapped independently — one bad rule doesn't kill others

## API

### POST /api/events

```json
{
  "event_type": "plan_upgraded",
  "user_id": "test-user-pro",
  "payload": { "plan_name": "pro", "first_name": "Pro" },
  "idempotency_key": "unique_123"
}
```

Response: `{ "received": true, "alreadyProcessed": false }`

## What I'd Improve

- Queue-based processing (BullMQ + Redis) instead of inline async evaluation
- Rate limiting to prevent event floods
- Template versioning with rollback support
- Dead letter queue for failed deliveries
- Zod validation for rule condition values (currently typed as `any` in places)
- Dashboard analytics (send rates, match rates, engagement metrics)

## Built With

[Next.js](https://nextjs.org/) · [Supabase](https://supabase.com/) · [Prisma](https://prisma.io/) · [Resend](https://resend.com/) · [OpenAI](https://openai.com/) · [shadcn/ui](https://ui.shadcn.com/)

## License

MIT
