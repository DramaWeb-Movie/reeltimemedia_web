# Optimization Suggestions

Date: 2026-04-09

This roadmap turns the review into concrete next steps. It is ordered by impact and implementation value.

## Priority 0

### Lock down payment mutation paths

Targets:
- `app/api/payments/baray/fail/route.ts`
- `app/api/payments/baray/webhook/route.ts`

Actions:
- Remove unauthenticated payment failure updates
- Require webhook authentication in production
- Add rate limiting to all payment mutation endpoints

Expected benefit:
- Reduces fraud and payment-state corruption risk immediately

### Upgrade vulnerable dependencies

Targets:
- `package.json`
- `package-lock.json`

Actions:
- Upgrade `next`
- Run `npm audit fix`
- Re-test auth, images, watch routes, and payment flows

Expected benefit:
- Removes known high-severity exposure and reduces maintenance risk

## Priority 1

### Make playback authorization cheap

Targets:
- `middleware.ts`
- `lib/supabase/middleware.ts`
- `app/api/watch/hls/route.ts`
- `app/api/watch/stream/route.ts`
- `lib/watch/playbackAccess.ts`

Actions:
- Skip middleware session refresh for media proxy routes
- Store the resolved media key or manifest reference in the playback token
- Use a short-lived cache or KV lookup for playback metadata

Expected benefit:
- Lower DB traffic
- Lower auth overhead
- Better playback stability under load

### Split shared pages from personalized state

Targets:
- `app/(main)/home/page.tsx`
- `app/(main)/browse/page.tsx`
- `app/(main)/movies/page.tsx`

Actions:
- Keep content grids cacheable
- Fetch purchase badges separately
- Move browse filtering and pagination server-side

Expected benefit:
- Better cache hit rate
- Smaller server work per request
- Cleaner scaling as the catalog grows

## Priority 2

### Fix image delivery

Targets:
- `next.config.ts`
- `imageLoader.ts`

Actions:
- Serve real responsive image variants
- Standardize poster sizes for cards, hero banners, and detail pages
- Avoid shipping original-size images to small screens

Expected benefit:
- Faster LCP
- Lower bandwidth cost
- Better mobile performance

### Tighten the production CSP

Targets:
- `next.config.ts`

Actions:
- Remove `unsafe-eval`
- Replace broad inline allowances with nonces or hashes where practical
- Keep development and production CSP profiles separate

Expected benefit:
- Better XSS resistance without changing the app's UX

## Priority 3

### Clean up build and DX issues

Targets:
- `hooks/usePaymentAccess.ts`
- `app/layout.tsx`
- `middleware.ts`

Actions:
- Fix the ref update during render in `usePaymentAccess`
- Consider self-hosting fonts if builds must work in restricted environments
- Migrate deprecated `middleware` usage to the current Next.js `proxy` convention when you schedule framework maintenance

Expected benefit:
- Cleaner CI
- More reliable builds
- Less friction during future Next.js upgrades

## Suggested Execution Plan

1. Secure payment mutation routes and update dependencies
2. Remove avoidable work from watch/hls/stream requests
3. Rework browse/home/movies so shared content can stay cached
4. Improve image delivery and CSP hardening
5. Finish with lint cleanup and framework maintenance
