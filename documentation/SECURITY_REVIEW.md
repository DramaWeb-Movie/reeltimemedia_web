# Security Review

Date: 2026-04-09

Scope:
- Next.js app routes, middleware, payment flows, playback flows, and production dependencies
- Checks run: `npm run lint`, `npm run build`, `npm audit --omit=dev`

## Summary

The app already has a solid baseline with security headers, short-lived playback tokens, and some rate limiting. The biggest risks are around payment state mutation, a permissive CSP, optional webhook authentication, and dependency advisories.

## Findings

### 1. High: payment failure endpoint can change payment state without authentication

Evidence:
- `app/api/payments/baray/fail/route.ts:8-50`

Why it matters:
- The route accepts only `order_id`, uses the admin client, and updates the `payments` table.
- There is no auth check, signature check, ownership check, or rate limit.
- Anyone who learns or guesses a pending `order_id` can mark that payment as `failed`.

Recommendation:
- Do not expose this as a public state-changing endpoint.
- Prefer one of these patterns:
  - Mark failed payments only from a trusted webhook/provider callback.
  - Require a signed one-time token tied to the order and current user.
  - At minimum, verify the authenticated user owns the payment before updating it.
- Add rate limiting to this route as a baseline hardening step.

### 2. Medium: CSP still allows `unsafe-inline` and `unsafe-eval`

Evidence:
- `next.config.ts:47-57`

Why it matters:
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` weakens XSS protection significantly.
- `unsafe-eval` is especially risky in production because it expands the blast radius of any injection bug.

Recommendation:
- Remove `unsafe-eval` in production.
- Move toward a nonce- or hash-based CSP for inline scripts.
- Keep a stricter production CSP than development if needed.

### 3. Medium: webhook authentication is optional instead of required

Evidence:
- `app/api/payments/baray/webhook/route.ts:30-40`

Why it matters:
- If `BARAY_WEBHOOK_SECRET` is not configured, the route will still process fulfillment logic.
- That means payment completion can depend only on payload decryptability and internal key secrecy.

Recommendation:
- Treat `BARAY_WEBHOOK_SECRET` as mandatory in every non-local environment.
- Fail fast during startup or on first request if the secret is missing in production.
- If Baray supports it, prefer an HMAC signature check over a shared header value.
- Optionally combine this with IP allowlisting at the edge or reverse proxy.

### 4. Medium: production dependency advisories need attention

Evidence:
- `npm audit --omit=dev`

Current results:
- `next@16.1.1` is reported in a high-severity advisory range.
- `fast-xml-parser` is flagged high through `@aws-sdk/xml-builder`.
- `picomatch` is also reported high in the production tree.

Recommendation:
- Upgrade `next` beyond the affected advisory range and retest streaming, images, and auth flows.
- Run `npm audit fix`, then manually review any remaining transitive issues.
- Re-run the build and smoke-test payments, playback, and image handling after upgrades.

## Check Results

- `npm run lint`: failed
  - `hooks/usePaymentAccess.ts:213` updates a ref during render
- `npm run build`: passed
- `npm audit --omit=dev`: 4 high-severity vulnerabilities reported

## Suggested Order

1. Lock down `app/api/payments/baray/fail/route.ts`
2. Make webhook authentication mandatory
3. Upgrade `next` and apply audit fixes
4. Tighten the production CSP
