import type { ImageLoaderProps } from 'next/image';

/** Must match `images.remotePatterns` R2 hostname in next.config.ts */
const R2_PUBLIC_HOST = 'pub-ac9788ff252148bd812a13ddd99ab8a4.r2.dev';

/**
 * Next.js fetches remote images for `/_next/image` with a ~7s timeout. Large R2 thumbnails
 * can exceed that and return 500/504. Serve R2 URLs directly so the browser talks to the CDN.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  const q = quality ?? 75;
  // With a custom loader, return a concrete URL directly.
  // Appending width/quality keeps Next.js happy that loader uses width.
  const separator = src.includes('?') ? '&' : '?';
  if (src.includes(R2_PUBLIC_HOST) || src.startsWith('/')) {
    return `${src}${separator}w=${encodeURIComponent(String(width))}&q=${encodeURIComponent(String(q))}`;
  }
  return src;
}
