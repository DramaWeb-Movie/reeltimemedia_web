import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';
const MIN_SECRET_LEN = 32;

function getSecretBytes(): Uint8Array {
  const raw = process.env.PLAYBACK_JWT_SECRET?.trim();
  if (raw && raw.length >= MIN_SECRET_LEN) {
    return new TextEncoder().encode(raw);
  }
  if (process.env.NODE_ENV === 'development') {
    // Dev-only fallback so local playback works without env setup; never use in production.
    return new TextEncoder().encode('dev-playback-jwt-secret-min-32-chars!');
  }
  throw new Error(
    `PLAYBACK_JWT_SECRET is required (at least ${MIN_SECRET_LEN} characters) for playback tokens`
  );
}

export type PlaybackTokenPayload = {
  sub: string;
  contentId: string;
  ep: number;
  playbackKey: string;
  jti: string;
};

export function getPlaybackTokenTtlSeconds(): number {
  const raw = process.env.PLAYBACK_TOKEN_TTL_SECONDS?.trim();
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 60 && n <= 3600) return n;
  }
  return 900;
}

export async function signPlaybackToken(payload: Omit<PlaybackTokenPayload, 'jti'>): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const secret = getSecretBytes();
  const ttl = getPlaybackTokenTtlSeconds();
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttl * 1000);

  const token = await new SignJWT({
    cid: payload.contentId,
    ep: payload.ep,
    pk: payload.playbackKey,
    jti,
  })
    .setProtectedHeader({ alg: ALG, typ: 'JWT' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);

  return { token, expiresAt };
}

export async function verifyPlaybackToken(token: string): Promise<PlaybackTokenPayload | null> {
  try {
    const secret = getSecretBytes();
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const cid = payload.cid;
    const ep = payload.ep;
    const pk = payload.pk;
    const jti = payload.jti;
    if (!sub || typeof cid !== 'string' || !cid.trim()) return null;
    if (typeof ep !== 'number' || !Number.isFinite(ep) || ep < 1) return null;
    if (typeof pk !== 'string' || !pk.trim()) return null;
    if (typeof jti !== 'string' || !jti) return null;
    return {
      sub,
      contentId: cid.trim(),
      ep: Math.floor(ep),
      playbackKey: pk.trim(),
      jti,
    };
  } catch {
    return null;
  }
}
