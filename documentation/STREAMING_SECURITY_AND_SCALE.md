# Streaming security and scale roadmap

This document describes how to evolve ReelTime Media’s playback stack from the current **server-proxied stream** (`/api/watch/stream`) toward patterns used by stronger commercial video products: **short-lived access tokens**, **CDN or origin delivery**, and optional **DRM**. It complements the access rules already enforced in `app/api/watch/stream/route.ts`.

---

## 1. Current baseline (what you have)

- **Authorization** is enforced on the server before bytes are fetched: free tier, movie purchase, or active subscription.
- **Storage URLs** are not placed in `<video src>`; the app proxies through your domain.
- **Range requests**, **rate limiting**, and **upstream timeouts** support seeking and basic abuse control.
- **Referer / Origin** checks reduce casual hotlinking but are not a cryptographic guarantee.

The gaps to close for “good” commercial streaming are mainly: **tokenized playback**, **moving bytes off the app server**, and **clear product rules** (e.g. subscription scope).

---

## 2. Target properties

| Property | Why it matters |
|----------|----------------|
| **Short-lived playback token** | Stolen links expire; you can bind token to user/session and content. |
| **CDN or signed origin URL** | Video scales without every byte passing through Next.js. |
| **Signed URLs with TTL** | Object storage (e.g. R2/S3) serves directly; signature proves right to read for a window. |
| **Optional DRM** | Required only for strict licensor contracts; adds cost and complexity. |
| **Subscription scope** | If plans differ by catalog, enforce “this user may play *this* title,” not only “has any subscription.” |

---

## 3. Phase A — Playback session token (highest priority)

### 3.1 Idea

Instead of the player loading:

`/api/watch/stream?contentId=…&ep=…`

the flow becomes:

1. **Client** calls `POST /api/watch/session` (or `GET` with cookie auth only) with `contentId` and `ep`.
2. **Server** runs the **same** access checks you have today (free / purchase / subscription).
3. On success, the server creates a **short-lived token** (e.g. 5–15 minutes) stored in one of:
   - **Signed JWT** (stateless): claims include `sub` (user id or `guest`), `contentId`, `ep`, `exp`, optional `jti` for revocation; signed with a server secret or asymmetric key.
   - **Opaque token + Redis/Upstash**: store `{ userId, contentId, ep, expiresAt }` keyed by token id; easier to revoke instantly.
4. Response returns either:
   - `{ playbackUrl: "/api/watch/stream?token=..." }`, or  
   - `{ playbackUrl: "https://cdn.example.com/...?signature=..." }` once Phase B exists.

5. **`/api/watch/stream`** (or a dedicated edge route) **only** accepts `token=…`, verifies signature or looks up KV, re-checks `exp`, then serves or redirects.

### 3.2 Security notes

- Tokens must be **unguessable** (opaque IDs or signed payloads with strong secret).
- **Rotate signing keys** if using JWT; support `kid` in header for rotation.
- For **guest / free** content, you can still issue a token with `sub: "anon"` and short TTL to avoid fully open URLs.
- Optionally bind **IP or User-Agent** in the token claim and compare loosely (can break mobile networks; use as optional hardening only).

### 3.3 UX

- Refresh token before expiry for long sessions (e.g. on `timeupdate` or every N minutes), or on 401 from stream.
- On token expiry, show a single “Resume” that fetches a new session without full page reload.

---

## 4. Phase B — Signed URLs at the edge (performance + security)

### 4.1 Problem with full proxy

Proxying every range request through Node increases **latency**, **cost**, and **failure domain** at scale. Prefer: **your app authorizes once**, then the **browser talks to CDN/storage** for media bytes.

### 4.2 Pattern

1. After access checks, compute a **presigned GET** URL for the object key (AWS S3, Cloudflare R2, etc.) with **TTL** aligned with the playback token (e.g. 10–60 minutes).
2. Return that URL to the client **only** inside a successful session response (HTTPS only).
3. Configure bucket policy so objects are **not** public; access only via signed query params.

### 4.3 Range requests

Presigned URLs on S3-compatible storage typically support **Range** headers. Verify with your provider. The `<video>` element will request ranges against the **signed URL** origin; no need for your Next server in the middle for each chunk.

### 4.4 Optional: redirect instead of JSON

`GET /api/watch/stream?token=…` could **302** to the presigned URL after validating the token. Some players handle redirects well; test across Safari/iOS. If problematic, return JSON URL and set `video.src` in JS.

---

## 5. Phase C — Referer and hotlinking

Keep Referer/Origin checks as **supplementary** only. With signed URLs:

- Signatures already expire.
- You can restrict CDN **signed URL** usage to your **player hostname** where the provider supports it (e.g. custom headers are harder for `<video>`; often you rely on short TTL + token in app instead).

Do not rely on Referer alone for paid content.

---

## 6. Phase D — Subscription and catalog rules

Today, series playback may allow **any** active subscription. If your business sells **per-show** or **tiered** plans:

- Add a **join table** (e.g. `subscription_entitlements`: `user_id`, `plan_id`, `movie_id` or `content_id`, `valid_until`).
- During session creation, require an entitlement row for that **series** (or plan that includes it), not only `subscriptions.status = active`.

Document the intended rule: “all series one price” vs “per title” and implement checks in **one place** (session endpoint + stream/token verification) to match `usePaymentAccess` on the client.

---

## 7. Phase E — DRM (optional)

Consider only if a licensor requires it.

- **Widevine / FairPlay / PlayReady**: usually needs a **packaging** pipeline (encrypted MP4/DASH/HLS), **license server**, and a player (e.g. Shaka, Video.js with DRM). This is a large product investment.
- For most independent regional catalogs, **HTTPS + short-lived signed URLs + legal terms** is enough.

---

## 8. Implementation order (practical)

1. **Extract** “can this user play this `contentId` + `ep`?” into a **shared server function** used by both the current stream route and a new **session** route (avoid duplicated logic).
2. Add **`POST /api/watch/session`** returning a **JWT or opaque token** + optional expiry metadata.
3. Change **`/api/watch/stream`** to accept **`token`** first; keep old query params behind a feature flag during migration, then remove.
4. Update **`WatchAccessGate`** to request a session and set `video.src` to the tokenized URL.
5. Introduce **presigned R2/S3 URLs** and switch stream route from **proxy body** to **redirect** or **return URL** (measure player compatibility).
6. Add **monitoring**: 401/403 rate on session, 5xx from storage, p95 segment latency.

---

## 9. Environment and secrets

- **JWT signing secret** or **private key**: store in env, never in client.
- **Storage credentials** for signing: server-only; rotate with deployment docs.
- Document **`NEXT_PUBLIC_APP_URL`** accuracy for any future cookie/domain alignment (less critical once tokens replace Referer-only checks).

---

## 10. Quick reference — files to touch later

| Area | Likely location |
|------|------------------|
| Stream + access | `app/api/watch/stream/route.ts` |
| Session API (Phase A) | `app/api/watch/session/route.ts` |
| Player | `components/watch/WatchAccessGate.tsx` |
| Client access hints | `hooks/usePaymentAccess.ts` (align messaging only; enforcement stays server-side) |
| Shared authz | `lib/watch/playbackAccess.ts` |
| JWT | `lib/watch/playbackToken.ts` |
| Referer helper | `lib/watch/requestOrigin.ts` |

**Phase A implemented:** `POST /api/watch/session` returns `{ playbackUrl, expiresAt, expiresInSeconds }`. Playback uses `GET /api/watch/stream?token=…` only. Set `PLAYBACK_JWT_SECRET` (≥32 chars) in production; optional `PLAYBACK_TOKEN_TTL_SECONDS` (60–3600, default 900).

This roadmap is descriptive; implement in small PRs with tests for **denied** cases (no sub, wrong episode, expired token, replay old token after subscription lapse).
