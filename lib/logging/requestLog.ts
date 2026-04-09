type RequestLike = Pick<Request, 'headers' | 'method' | 'url'> & {
  ip?: string;
};

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'auth',
  'secret',
  'signature',
  'sig',
  'password',
  'otp',
  'code',
  'order_id',
  'reference',
  'intent_id',
  'qr_id',
]);

const SENSITIVE_PATH_PATTERNS = [
  /^\/api\/payments\//,
  /^\/api\/watch\/hls$/,
  /^\/api\/watch\/stream$/,
];

export function sanitizePathForLogs(urlString: string): string {
  const url = new URL(urlString);
  const path = url.pathname;
  if (SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(path))) {
    return path;
  }

  if (!url.searchParams.size) {
    return path;
  }

  const sanitizedParams = new URLSearchParams();
  for (const [key, value] of url.searchParams.entries()) {
    const lower = key.toLowerCase();
    sanitizedParams.set(key, SENSITIVE_QUERY_KEYS.has(lower) ? '[REDACTED]' : value);
  }

  const query = sanitizedParams.toString();
  return query ? `${path}?${query}` : path;
}

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

function getRateLimitKey(request: RequestLike, namespace?: string): string {
  const ip = getClientIp(request);
  const prefix = namespace ? `${namespace}|` : '';
  if (ip !== 'unknown') return `${prefix}${ip}`;
  const ua = request.headers.get('user-agent')?.trim();
  return ua ? `${prefix}unknown|ua:${ua}` : `${prefix}unknown`;
}

type CheckRateLimitOptions = {
  namespace?: string;
  max?: number;
  windowMs?: number;
  blockMs?: number;
};

async function checkRedisRateLimit(params: {
  key: string;
  max: number;
  windowMs: number;
  blockMs: number;
}): Promise<{ allowed: boolean; retryAfterSeconds?: number } | null> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!redisUrl || !redisToken) return null;

  try {
    const { key, max, windowMs, blockMs } = params;
    const now = Date.now();
    const windowKey = `rl:w:${key}`;
    const blockKey = `rl:b:${key}`;

    const authHeaders = { Authorization: `Bearer ${redisToken}` };
    const jsonHeaders = {
      ...authHeaders,
      'Content-Type': 'application/json',
    };

    const blockRes = await fetch(`${redisUrl}/get/${encodeURIComponent(blockKey)}`, {
      headers: authHeaders,
      cache: 'no-store',
    });
    const blockJson = (await blockRes.json().catch(() => ({}))) as { result?: string | null };
    const blockedUntil = Number(blockJson.result ?? 0);
    if (blockedUntil > now) {
      return { allowed: false, retryAfterSeconds: Math.ceil((blockedUntil - now) / 1000) };
    }

    const incrRes = await fetch(`${redisUrl}/incr/${encodeURIComponent(windowKey)}`, {
      method: 'POST',
      headers: authHeaders,
      cache: 'no-store',
    });
    const incrJson = (await incrRes.json().catch(() => ({}))) as { result?: number };
    const count = Number(incrJson.result ?? 0);

    if (count <= 1) {
      await fetch(`${redisUrl}/expire/${encodeURIComponent(windowKey)}/${Math.ceil(windowMs / 1000)}`, {
        method: 'POST',
        headers: authHeaders,
        cache: 'no-store',
      });
    }

    if (count > max) {
      const blockedUntilMs = now + blockMs;
      await fetch(`${redisUrl}/set/${encodeURIComponent(blockKey)}`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(blockedUntilMs.toString()),
        cache: 'no-store',
      });
      await fetch(`${redisUrl}/expire/${encodeURIComponent(blockKey)}/${Math.ceil(blockMs / 1000)}`, {
        method: 'POST',
        headers: authHeaders,
        cache: 'no-store',
      });
      return { allowed: false, retryAfterSeconds: Math.ceil(blockMs / 1000) };
    }

    return { allowed: true };
  } catch (error) {
    console.warn('Redis rate limit check failed, using local fallback:', error);
    return null;
  }
}

export async function checkRateLimit(
  request: RequestLike,
  options?: CheckRateLimitOptions
): Promise<{
  allowed: boolean;
  status: number;
  retryAfterSeconds?: number;
}> {
  const max = options?.max ?? RATE_LIMIT_MAX;
  const windowMs = options?.windowMs ?? RATE_LIMIT_WINDOW_MS;
  const blockMs = options?.blockMs ?? RATE_LIMIT_BLOCK_MS;
  const key = getRateLimitKey(request, options?.namespace);

  const sharedResult = await checkRedisRateLimit({ key, max, windowMs, blockMs });
  if (sharedResult) {
    return sharedResult.allowed
      ? { allowed: true, status: 200 }
      : {
          allowed: false,
          status: 429,
          retryAfterSeconds: sharedResult.retryAfterSeconds,
        };
  }

  const now = Date.now();
  // Local fallback if shared Redis limiter is not configured.

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
  if (now - state.windowStart > windowMs) {
    state.windowStart = now;
    state.count = 0;
  }

  state.count += 1;

  if (state.count > max) {
    state.blockedUntil = now + blockMs;
    const retryAfterSeconds = Math.ceil(blockMs / 1000);
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
  const path = sanitizePathForLogs(request.url);
  const ms = Math.max(0, Math.round(durationMs));

  // morgan-ish single line (easy to grep in logs)
  return `${ip} - ${request.method} ${path} ${status} - ${ms}ms`;
}

export function logApiRequest(params: {
  request: RequestLike;
  status: number;
  durationMs: number;
  route?: string;
  meta?: Record<string, unknown>;
}) {
  const { request, status, durationMs, route, meta } = params;
  const event = {
    at: new Date().toISOString(),
    event: 'api_request',
    route: route ?? new URL(request.url).pathname,
    method: request.method,
    path: sanitizePathForLogs(request.url),
    status,
    durationMs: Math.max(0, Math.round(durationMs)),
    ip: getClientIp(request),
    ...(meta ? { meta } : {}),
  };
  console.log(JSON.stringify(event));
}
