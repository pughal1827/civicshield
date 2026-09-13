# Phase 12 — Convert CivicShield to Real Supabase Tasks

- [x] `1. Storage Configuration & Production Fail-Closed Rules`
  - [x] Enforced strict production storage mode rules in `lib/db/storage-config.ts` & `lib/db/supabase-admin.ts`
  - [x] Updated `lib/ai/gemini.ts` to require `GEMINI_API_KEY` in production mode
- [x] `2. API Routes Supabase Persistence & Fail-Closed Guarding`
  - [x] Updated `app/api/reports/submit/route.ts`
  - [x] Updated `app/api/reports/track/route.ts`
  - [x] Updated `app/api/incidents/route.ts`
  - [x] Updated `app/api/incidents/[id]/route.ts`
  - [x] Updated `app/api/incidents/verify/route.ts`
  - [x] Updated `app/api/incidents/merge/route.ts`
  - [x] Updated `app/api/citizen/nearby/route.ts`
  - [x] Updated `app/api/citizen/notifications/route.ts`
  - [x] Updated `app/api/authority/operations/command-center/route.ts`
  - [x] Updated `app/api/upload/route.ts`
- [x] `3. Validation & Build`
  - [x] Ran `npx tsc --noEmit` (0 errors)
  - [x] Ran `npm run build` (50 routes compiled successfully)
  - [x] Verified Demo & Production mode persistence behaviors
