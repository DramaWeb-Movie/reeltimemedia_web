import crypto from 'crypto';
import { timingSafeEqualText } from '@/lib/security/timingSafeEqual';

const DEFAULT_FAIL_TOKEN_TTL_SECONDS = 6 * 60 * 60;

function getFailTokenSecret(): string {
  const secret =
    process.env.PAYMENT_REDIRECT_SECRET?.trim() ||
    process.env.BARAY_SECRET_KEY?.trim();

  if (!secret) {
    throw new Error(
      'PAYMENT_REDIRECT_SECRET or BARAY_SECRET_KEY is required for payment redirect tokens'
    );
  }

  return secret;
}

function getFailTokenTtlSeconds(): number {
  const raw = process.env.PAYMENT_REDIRECT_TOKEN_TTL_SECONDS?.trim();
  if (!raw) return DEFAULT_FAIL_TOKEN_TTL_SECONDS;

  const ttl = Number.parseInt(raw, 10);
  if (!Number.isFinite(ttl) || ttl < 300 || ttl > 7 * 24 * 60 * 60) {
    return DEFAULT_FAIL_TOKEN_TTL_SECONDS;
  }

  return ttl;
}

function signValue(orderId: string, userId: string, expiresAt: number): string {
  return crypto
    .createHmac('sha256', getFailTokenSecret())
    .update(`${orderId}.${userId}.${expiresAt}`)
    .digest('base64url');
}

export function signPaymentFailToken(params: {
  orderId: string;
  userId: string;
  ttlSeconds?: number;
}): string {
  const expiresAt =
    Math.floor(Date.now() / 1000) + (params.ttlSeconds ?? getFailTokenTtlSeconds());
  const signature = signValue(params.orderId, params.userId, expiresAt);

  return `${expiresAt}.${signature}`;
}

export function verifyPaymentFailToken(params: {
  orderId: string;
  userId: string;
  token: string;
}): boolean {
  const token = params.token.trim();
  const dotIndex = token.indexOf('.');
  if (dotIndex <= 0 || dotIndex === token.length - 1) {
    return false;
  }

  const expiresAtRaw = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expiresAt = Number.parseInt(expiresAtRaw, 10);

  if (!Number.isFinite(expiresAt)) {
    return false;
  }

  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = signValue(params.orderId, params.userId, expiresAt);
  return timingSafeEqualText(signature, expected);
}
