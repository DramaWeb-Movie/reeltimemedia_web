type RequestLike = Pick<Request, 'headers' | 'method' | 'url'> & {
  ip?: string;
};

export function getClientIp(request: RequestLike): string {
  const direct = typeof request.ip === 'string' ? request.ip : undefined;
  if (direct && direct.trim()) return direct.trim();

  // Prefer CDN / proxy headers when present.
  const cf = request.headers.get('cf-connecting-ip');
  if (cf && cf.trim()) return cf.trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor && forwardedFor.trim()) {
    // x-forwarded-for is a comma-separated list: client, proxy1, proxy2...
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  return 'unknown';
}

type RateLimitState = {
  windowStart: number;
  count: number;
  blockedUntil: number;
};

const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_BLOCK_MS = 5 * 60 * 1000; // 5 minutes

// Simple in-memory store (per server instance). Good enough for basic abuse protection.
const rateLimitStore = new Map<string, RateLimitState>();

function getRateLimitKey(request: RequestLike): string {
  const ip = getClientIp(request);
  if (ip !== 'unknown') return ip;
  const ua = request.headers.get('user-agent')?.trim();
  return ua ? `unknown|ua:${ua}` : 'unknown';
}

export function checkRateLimit(request: RequestLike): {
  allowed: boolean;
  status: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const key = getRateLimitKey(request); // per-IP (global across pages)

  let state = rateLimitStore.get(key);

  if (!state) {
    state = { windowStart: now, count: 0, blockedUntil: 0 };
  }

  // Still blocked?
  if (state.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((state.blockedUntil - now) / 1000);
    rateLimitStore.set(key, state);
    return {
      allowed: false,
      status: 429,
      retryAfterSeconds,
    };
  }

  // New window if outside the current 2-minute period.
  if (now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
    state.windowStart = now;
    state.count = 0;
  }

  state.count += 1;

  if (state.count > RATE_LIMIT_MAX) {
    state.blockedUntil = now + RATE_LIMIT_BLOCK_MS;
    const retryAfterSeconds = Math.ceil(RATE_LIMIT_BLOCK_MS / 1000);
    rateLimitStore.set(key, state);
    return {
      allowed: false,
      status: 429,
      retryAfterSeconds,
    };
  }

  rateLimitStore.set(key, state);

  return {
    allowed: true,
    status: 200,
  };
}

export function formatRequestLogLine(params: {
  request: RequestLike;
  status: number;
  durationMs: number;
}) {
  const { request, status, durationMs } = params;
  const ip = getClientIp(request);
  const url = new URL(request.url);
  const path = `${url.pathname}${url.search}`;
  const ms = Math.max(0, Math.round(durationMs));

  // morgan-ish single line (easy to grep in logs)
  return `${ip} - ${request.method} ${path} ${status} - ${ms}ms`;
}

