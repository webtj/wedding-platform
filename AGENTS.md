# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Reviews

- `docs/project-review-2026-06-04.md` — 全维度项目评估报告（架构 + 产品 + 竞品 + 工程质量 + P0-P3 路线图），开工前的必读

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
bun run build      # Build both projects
```

### API (wedding-platform-api/)

```bash
cd wedding-platform-api

pnpm dev           # Start dev server with hot reload
pnpm build         # Build for production
pnpm test          # Run Vitest tests (verbose, each case shown)
pnpm lint          # TypeScript type check
pnpm prisma:generate  # Regenerate Prisma client
pnpm prisma:migrate   # Run database migrations
pnpm prisma:seed      # Seed database
```

### Admin (wedding-platform-admin/)

```bash
cd wedding-platform-admin

bun dev            # Start dev server (port 3000)
bun run build      # Production build
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

## Test Coverage (B. Audit — 2026-06-05)

- **66 test files / 563 tests / 73.74% statements / 84.69% functions**
- Vitest verbose reporter (`--reporter=verbose`): each case shows `✓ file > Describe > test name`
- Mock strategy: `{ prisma: { model: { method: vi.fn() } } } as never` — no test DB, pure unit tests
- Pre-existing bugs found & fixed during coverage audit:
  - `token.service.ts:54-62` — `verifyAccessToken` async/await bug (原始 Error 直接抛出)
  - `settings.service.ts:94` — `decryptIfNeeded` 对非 JSON 字符串静默返回 encrypted 原值
- Knip dead code cleanup: 0 unused exports, barrel re-exports trimmed, 8 unused deps removed
- Remaining 0%: `result-composer.service.ts` (sharp + fetch, 需 mock 或真实图片)
