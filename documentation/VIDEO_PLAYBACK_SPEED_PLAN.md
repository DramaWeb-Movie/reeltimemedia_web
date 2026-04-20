# Web Video Playback Speed Plan

Date: 2026-04-17

This document focuses only on web playback performance:

- faster video start
- quality that adapts to the user's internet speed
- less buffering
- smoother episode-to-episode watching

## Main Goal

For the web app, users should feel:

- the video starts quickly
- the player picks the right quality automatically
- weak internet still plays instead of freezing
- strong internet looks sharp without manual work

## Current State

The good news is the web app already has the right base:

- `reeltimemedia_web/components/watch/HlsPlayer.tsx`
  - already uses `hls.js`
  - already supports adaptive quality
  - already starts low and can ramp up
- `reeltimemedia_web/components/watch/WatchAccessGate.tsx`
  - already fetches a watch session first
- `reeltimemedia_web/app/api/watch/session/route.ts`
  - already creates short-lived playback access

So the player logic is not the biggest problem.

The biggest problem is the delivery path.

## Biggest Bottlenecks

### 1. HLS is still going through Vercel

Evidence:
- `reeltimemedia_web/app/api/watch/hls/route.ts:174-211`

Why this is bad:
- every manifest and segment request goes through your Next.js app
- this adds latency before the video can play
- this adds more chances to buffer
- this costs more on Vercel

What to do:
- keep auth and session creation in Next.js
- stop sending HLS video bytes through Next.js
- return signed HLS URLs so `hls.js` loads directly from CDN/R2

This is the single biggest speed improvement.

### 2. Titles can be published before adaptive HLS is ready

Evidence:
- `reeltimemedia_admin/app/api/movies/multipart-complete/route.ts:84-92`
- `reeltimemedia_admin/app/api/movies/series-multipart-complete/route.ts:126-135`
- `reeltimemedia_web/lib/watch/playbackAccess.ts:46-57`
- `reeltimemedia_web/components/watch/HlsPlayer.tsx:184-214`

Why this is bad:
- users may watch the original file instead of adaptive HLS
- large original files start slower
- seeking is heavier
- weak internet suffers more

What to do:
- published web content should require `hls_manifest_url`
- if HLS is not ready yet, keep the title in `encoding` or `processing`
- use progressive fallback only for admin QA or legacy content

If you want internet-based quality, HLS must be the normal path, not the exception.

### 3. Playback metadata is stored only in memory

Evidence:
- `reeltimemedia_web/lib/watch/playbackMetadata.ts:9-55`

Why this is bad on Vercel:
- one server instance may create the playback session
- another server instance may not know about it
- this can cause extra lookups and less stable playback under load

What to do:
- move playback metadata to shared Redis or KV
- keep memory cache only for local development

This is more about consistency and scale, but it also helps performance.

### 4. Free content still does auth work before deciding access

Evidence:
- `reeltimemedia_web/lib/watch/playbackAccess.ts:43-57`

Why this matters:
- free content should be the cheapest path
- you do not want extra Supabase auth work before every free playback

What to do:
- decide free movie / free episode first
- only hit authenticated user checks when the title actually needs purchase or subscription validation

### 5. Progressive fallback exposes the raw public file

Evidence:
- `reeltimemedia_web/app/api/watch/stream/route.ts:82-90`

Why this hurts performance and product quality:
- users may hit the original file path instead of adaptive streaming
- large source files are worse on mobile data
- this weakens the premium streaming feel

What to do:
- if fallback is needed, use a signed URL, not a public raw URL
- long term, make HLS the only playback format for published content

## Best Architecture For Fast Playback

This is the target flow:

1. Watch page loads
2. `POST /api/watch/session`
3. Server checks access
4. Server returns a signed HLS master manifest URL
5. `hls.js` loads the master manifest directly from CDN/R2
6. `hls.js` automatically chooses quality based on bandwidth
7. User sees fast startup and adaptive quality

That gives you:

- faster first frame
- better adaptive quality
- lower buffering
- less load on Vercel

## Priority Order

### Priority 1: Make adaptive HLS the default published path

Files:
- `reeltimemedia_admin/app/api/movies/multipart-complete/route.ts`
- `reeltimemedia_admin/app/api/movies/series-multipart-complete/route.ts`
- `reeltimemedia_web/lib/watch/playbackAccess.ts`

Actions:
- only allow published content when `hls_manifest_url` exists
- add a real `encoding` state in admin
- hide not-yet-encoded titles from the public watch experience

User impact:
- much more reliable quality switching
- fewer users stuck on giant source files

### Priority 2: Stop proxying HLS through Next.js

Files:
- `reeltimemedia_web/app/api/watch/hls/route.ts`
- `reeltimemedia_web/app/api/watch/session/route.ts`
- `reeltimemedia_web/components/watch/WatchAccessGate.tsx`

Actions:
- keep the session route
- return signed HLS URLs from the session route
- let `hls.js` load manifests and segments directly from storage/CDN

User impact:
- biggest startup speed improvement
- lower buffering on real devices
- better scaling on Vercel

### Priority 3: Make session and metadata resolution cheap

Files:
- `reeltimemedia_web/lib/watch/playbackMetadata.ts`
- `reeltimemedia_web/lib/watch/playbackAccess.ts`
- `reeltimemedia_web/app/api/watch/session/route.ts`
- `reeltimemedia_web/app/api/watch/stream/route.ts`

Actions:
- move playback metadata to Redis/KV
- skip auth work for free content
- keep media target info in shared cache so watch requests do not repeat unnecessary work

User impact:
- more stable playback under load
- fewer slow watch-session handshakes

### Priority 4: Tune the player for perceived speed

Files:
- `reeltimemedia_web/components/watch/HlsPlayer.tsx`

What is already good:
- `startLevel: -1`
- retries and timeouts are already configured
- quality selector already exists

Recommended tuning:
- keep adaptive mode as default always
- remember manual quality choice only if the user changes it
- cap quality to player size when helpful
- keep a smaller startup buffer, then expand after playback begins
- prefetch the next episode manifest only, not heavy media

User impact:
- video feels faster to start
- less waiting before playback begins

## Player Behavior You Want

For strong internet:
- start quickly at a safe level
- ramp up to 720p or 1080p automatically

For average internet:
- stay stable around a middle quality
- avoid constant up/down switching

For weak internet:
- prefer continuous playback over sharpness
- drop quality early instead of buffering too long

That is exactly what multi-bitrate HLS plus direct CDN delivery is good at.

## Professional UX Improvements Around Playback

Even if the core speed is fixed, users also judge quality by the surrounding experience.

Add these:

- show `Loading video...` only briefly, then show a poster with spinner
- if content is still encoding, show a clear `Available soon` state
- if playback falls back from HLS, log it and surface it internally
- show episode switching instantly with next-episode session prefetch
- store resume progress so returning users feel continuity

## Success Metrics To Track

Track these on the web side:

- time to first frame
- playback start success rate
- average number of stalls per session
- percent of sessions using HLS vs progressive fallback
- percent of sessions that drop to low bitrate
- watch-session API latency

If these improve, users will feel it immediately.

## The 3 Changes That Matter Most

If you only want the most important playback wins, do these first:

1. Do not publish titles until HLS is ready
2. Stop proxying HLS segments through Vercel
3. Return signed HLS URLs and let `hls.js` adapt quality directly from CDN/R2

## Bottom Line

If your goal is:

- fast video startup
- quality based on user internet
- satisfied users on web

Then the answer is not more UI work first.

The answer is:

- make HLS the real default
- deliver it directly from CDN/storage
- keep Vercel only for access control and session creation

That will give the biggest real-world performance improvement for your users.
