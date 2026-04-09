# Performance Review

Date: 2026-04-09

Scope:
- Rendering strategy, streaming path, middleware overhead, catalog loading, images, and build behavior
- Checks run: `npm run lint`, `npm run build`

## Summary

The main performance concern is the playback path. Right now the app does extra session and database work on requests that can become very high-volume under HLS or range-based video playback. The browse experience also loads more data dynamically than it needs to.

## Findings

### 1. High: streaming requests still trigger database lookups and session work

Evidence:
- `middleware.ts:5-20`
- `middleware.ts:23-26`
- `lib/supabase/middleware.ts:13-39`
- `app/api/watch/hls/route.ts:147-155`
- `app/api/watch/stream/route.ts:43-55`
- `lib/watch/playbackAccess.ts:84-98`

Why it matters:
- Middleware runs on nearly every non-static request and always calls `supabase.auth.getClaims()`.
- The HLS route verifies the token, may call `auth.getUser()`, and then fetches the manifest URL from the database again.
- The progressive stream route does the same for the raw video URL.
- HLS playback can generate many requests per minute, so even small overhead multiplies quickly.

Recommendation:
- Exclude `/api/watch/hls` and `/api/watch/stream` from middleware session refresh if possible.
- Put the resolved playback target or a compact media key inside the playback token or a short-lived server-side cache.
- Keep one authorization decision per playback session, not per media chunk.

### 2. High: browse page is forced dynamic and loads the full catalog

Evidence:
- `app/(main)/browse/page.tsx:4-10`
- `lib/movies.ts:148-176`

Why it matters:
- `export const dynamic = 'force-dynamic'` prevents caching benefits.
- `getMovies()` loads all published titles, and filtering happens client-side in `BrowseContent`.
- This is fine for a small catalog but scales poorly for TTFB, payload size, and memory.

Recommendation:
- Move browse filtering to the server or an API route with pagination.
- Only fetch the current page of results plus filter metadata.
- Reserve `force-dynamic` for pages that truly must vary per request.

### 3. Medium: personalized purchase lookups make otherwise cacheable pages dynamic

Evidence:
- `app/(main)/home/page.tsx:4-14`
- `app/(main)/movies/page.tsx:13-16`

Why it matters:
- Fetching user purchase state on the server makes these routes personalized.
- That reduces the caching value of pages whose main content is mostly shared.

Recommendation:
- Render the shared catalog statically or with ISR.
- Load purchase state separately on the client or in a smaller dynamic island.
- Keep the expensive shared content cacheable and personalize only the button state.

### 4. Medium: custom image loader bypasses real image resizing

Evidence:
- `next.config.ts:12-29`
- `imageLoader.ts:10-18`

Why it matters:
- The loader returns the original image URL and only appends `w` and `q` query params.
- Unless the upstream CDN actually transforms on those params, users still download the original image bytes.
- This hurts LCP and wastes bandwidth on poster-heavy pages.

Recommendation:
- Use a loader backed by real image transformations.
- Good options:
  - Cloudflare Image Resizing / Images
  - Pre-generated thumbnail variants in storage
  - Re-enabling Next image optimization if the timeout issue can be solved upstream

### 5. Low: build depends on external Google Fonts fetches

Evidence:
- `app/layout.tsx:2-23`

Why it matters:
- In restricted CI or offline environments, builds can fail or slow down because fonts are fetched during build.
- This is more of a deployment reliability issue than a runtime issue, but it affects release performance.

Recommendation:
- Consider self-hosting fonts with `next/font/local` if build environments are not guaranteed to have open network access.

## Check Results

- `npm run lint`: failed
  - `hooks/usePaymentAccess.ts:213` violates the React refs rule
- `npm run build`: passed after allowing network access for Google Fonts

## Fast Wins

1. Narrow middleware so media proxy routes skip session refresh
2. Stop re-querying media metadata on every HLS/stream request
3. Replace full-catalog browse loading with paginated server filtering
4. Make poster image delivery use real resized variants
