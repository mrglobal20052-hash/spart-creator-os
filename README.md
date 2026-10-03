# SPART Creator OS

AI Creator Operating System for personal brands and virtual KOLs.

Production stack: Next.js + TypeScript + Supabase + Vercel.

## Core modules
- Supabase Auth + workspace onboarding
- Creator Identity / Virtual KOL
- Brand Brain
- Content Studio and approval workflow
- Social scheduler
- Analytics
- Subscription + immutable credit ledger

## Environment
Copy `.env.example` to `.env.local` and set the public Supabase values.

## Development
```bash
npm install
npm run dev
```

## v0.2: implemented behavior
- Approval: submit drafts, review the submitted text, approve or reject with comments.
- Scheduler: queue the exact approved text for an active workspace channel; cancel queued posts.
- Database RPCs validate membership, state, channel ownership, future dates and approved text snapshots. Operations are transactional.
- Analytics reads `captured_at`; Billing displays the credit ledger. Empty datasets are shown explicitly.
- Navigation works on mobile; sign-out clears workspace state.

`db/workflows.sql` records the production changes applied through migrations
`creator_approval_scheduler_workflows` and `approval_body_snapshot`.

## Remaining integrations
The scheduler currently stores an internal queue. No publishing worker is enabled.
Metricool's ChatGPT connector access is separate from runtime API credentials.
Production needs a server-side Metricool integration, channel synchronization,
media payloads for YouTube, idempotent dispatch and status reconciliation before auto-publishing.
AI generation, payment collection, provider analytics synchronization and custom SMTP remain unfinished.
No provider credentials should be stored in frontend variables or public database rows.

## Validation
Production build and TypeScript checks passed with public Supabase environment variables.
Rollback-only database checks passed: draft scheduling rejected, duplicate approval requests
rejected, repeat decisions rejected, modified approved text rejected, cross-workspace
channels rejected, past dates rejected, queue creation and cancellation restore correct states.
Auth email delivery and actual social publishing were not tested.
