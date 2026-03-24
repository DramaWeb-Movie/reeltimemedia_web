import type { ImageLoaderProps } from 'next/image';

/** Must match `images.remotePatterns` R2 hostname in next.config.ts */
const R2_PUBLIC_HOST = 'pub-ac9788ff252148bd812a13ddd99ab8a4.r2.dev';

/**
 * Next.js fetches remote images for `/_next/image` with a ~7s timeout. Large R2 thumbnails
 * can exceed that and return 500/504. Serve R2 URLs directly so the browser talks to the CDN.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  const q = quality ?? 75;
  if (src.includes(R2_PUBLIC_HOST)) {
    return src;
  }
  const params = new URLSearchParams();
  params.set('url', src);
  params.set('w', String(width));
  params.set('q', String(q));
  return `/_next/image?${params.toString()}`;
}
