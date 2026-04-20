import { headers } from 'next/headers';

function stripTrailingSlash(s: string): string {
  return s.replace(/\/$/, '');
}

function inferProtocol(host: string, forwardedProto: string | null): 'http' | 'https' {
  const p = forwardedProto?.trim().toLowerCase();
  if (p === 'http' || p === 'https') return p;
  const h = host.toLowerCase();
  if (h.startsWith('localhost') || h.startsWith('127.')) return 'http';
  return 'https';
}

/**
 * Base URL with no trailing slash for resolving absolute links in server metadata.
 * Uses NEXT_PUBLIC_APP_URL when set; otherwise the incoming request host, then VERCEL_URL.
 */
export async function getServerSiteBaseUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return stripTrailingSlash(env);

  const h = await headers();
  const host = (h.get('x-forwarded-host') ?? h.get('host'))?.split(',')[0]?.trim();
  if (host) {
    const proto = inferProtocol(host, h.get('x-forwarded-proto'));
    return stripTrailingSlash(`${proto}://${host}`);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return stripTrailingSlash(`https://${vercelUrl}`);

  return '';
}

export function toAbsoluteUrl(
  siteBase: string,
  pathOrUrl: string | undefined | null
): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (!siteBase) return undefined;
  try {
    return new URL(pathOrUrl, `${siteBase}/`).toString();
  } catch {
    return undefined;
  }
}
