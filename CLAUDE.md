# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wedding planning platform monorepo with two sub-projects:
- `wedding-platform-admin/` — Next.js 16 + shadcn/ui management dashboard
- `wedding-platform-api/` — NestJS + Prisma backend API

## Common Commands

### From Root (admin/)

```bash
bun start          # Start both API (port 4000) + Admin (port 3000)
bun stop           # Stop all services
bun test           # Run all tests (API unit tests + Admin type check)
bun build          # Build both projects
```

### API (wedding-platform-api/)

```bash
cd wedding-platform-api

pnpm dev           # Start dev server with hot reload
pnpm build         # Build for production
pnpm test          # Run Vitest tests
pnpm lint          # TypeScript type check
pnpm prisma:generate  # Regenerate Prisma client
pnpm prisma:migrate   # Run database migrations
pnpm prisma:seed      # Seed database
```

### Admin (wedding-platform-admin/)

```bash
cd wedding-platform-admin

bun dev            # Start dev server (port 3000)
bun build          # Production build
bun lint           # OxLint check
bun format         # Format with oxfmt
```

## Architecture

### Frontend (wedding-platform-admin)

- **Framework**: Next.js 16 App Router, React 19, TypeScript 5.9
- **UI**: shadcn/ui (Radix primitives), Tailwind CSS v4, OKLCH themes
- **Data**: TanStack Query (prefetch + useSuspenseQuery), TanStack Form + Zod, TanStack Table
- **State**: Zustand (local), nuqs (URL params)
- **Auth**: Clerk (via shim at `@/lib/auth/clerk-shim` to adapt to custom auth)
- **Linting**: OxLint + oxfmt (not ESLint/Prettier)

Key patterns:
- Feature-based structure: `src/features/<name>/api/{types,service,queries}.ts`
- Server prefetch: `void queryClient.prefetchQuery()` + `HydrationBoundary` + `dehydrate`
- Client fetch: `useSuspenseQuery` (not `useQuery`)
- Icons: only from `@/components/icons`, never import from `@tabler/icons-react` directly
- Page headers: use `PageContainer` props, never import `<Heading>` manually
- Forms: use `useAppForm` from `@/components/ui/tanstack-form`

### Backend (wedding-platform-api)

- **Framework**: NestJS 11
- **ORM**: Prisma with PostgreSQL
- **Auth**: JWT (bcryptjs for passwords)
- **Validation**: Zod schemas
- **Testing**: Vitest
- **Shared types**: `@wedding/shared` workspace package

Module structure: `src/<module>/{service,controller,module}.ts`

### Clerk Auth Shim

Admin uses Clerk's API surface but routes through custom shims at:
- `@clerk/nextjs` → `src/lib/auth/clerk-shim`
- `@clerk/nextjs/server` → `src/lib/auth/server-shim`

This allows using Clerk-compatible code while connecting to the custom NestJS auth backend.

## Environment

API `.env` requires:
- `DATABASE_URL` — PostgreSQL connection
- `REDIS_URL` — Redis connection
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — min 32 chars
- `CORS_ORIGINS` — comma-separated URLs

Admin `.env`:
- `NEXT_PUBLIC_API_BASE_URL` — API endpoint (default http://localhost:4000)

## Code Style

- Single quotes, JSX single quotes, no trailing comma, 2-space indent
- Components: function declarations, not arrow functions
- Types: prefer `interface` over `type` for objects
- Imports: use `@/*` alias for src paths

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. The
skill has multi-step workflows, checklists, and quality gates that produce better
results than an ad-hoc answer. When in doubt, invoke the skill. A false positive is
cheaper than a false negative.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke /office-hours
- Strategy, scope, "think bigger", "what should we build" → invoke /plan-ceo-review
- Architecture, "does this design make sense" → invoke /plan-eng-review
- Design system, brand, "how should this look" → invoke /design-consultation
- Design review of a plan → invoke /plan-design-review
- Developer experience of a plan → invoke /plan-devex-review
- "Review everything", full review pipeline → invoke /autoplan
- Bugs, errors, "why is this broken", "wtf", "this doesn't work" → invoke /investigate
- Test the site, find bugs, "does this work" → invoke /qa (or /qa-only for report only)
- Code review, check the diff, "look at my changes" → invoke /review
- Visual polish, design audit, "this looks off" → invoke /design-review
- Developer experience audit, try onboarding → invoke /devex-review
- Ship, deploy, create a PR, "send it" → invoke /ship
- Merge + deploy + verify → invoke /land-and-deploy
- Configure deployment → invoke /setup-deploy
- Post-deploy monitoring → invoke /canary
- Update docs after shipping → invoke /document-release
- Weekly retro, "how'd we do" → invoke /retro
- Second opinion, codex review → invoke /codex
- Safety mode, careful mode, lock it down → invoke /careful or /guard
- Restrict edits to a directory → invoke /freeze or /unfreeze
- Upgrade gstack → invoke /gstack-upgrade
- Save progress, "save my work" → invoke /context-save
- Resume, restore, "where was I" → invoke /context-restore
- Security audit, OWASP, "is this secure" → invoke /cso
- Make a PDF, document, publication → invoke /make-pdf
- Launch real browser for QA → invoke /open-gstack-browser
- Import cookies for authenticated testing → invoke /setup-browser-cookies
- Performance regression, page speed, benchmarks → invoke /benchmark
- Review what gstack has learned → invoke /learn
- Tune question sensitivity → invoke /plan-tune
- Code quality dashboard → invoke /health

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
