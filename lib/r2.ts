/**
 * Cloudflare R2: stream via S3 API so the browser never hits r2.cloudflarestorage.com
 * (avoids ERR_SSL_VERSION_OR_CIPHER_MISMATCH in some environments).
 * Requires: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_HOST
 */

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'https';

/** HTTPS agent that enforces TLS 1.2+ to avoid SSL handshake failure with Cloudflare R2. */
const r2HttpsAgent = new https.Agent({
  minVersion: 'TLSv1.2',
  keepAlive: true,
});

function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
    requestHandler: new NodeHttpHandler({
      httpsAgent: r2HttpsAgent,
    }),
  });
}

/** Parse bucket key from a stored video URL if it matches R2_PUBLIC_HOST. */
function getR2BucketAndKey(videoUrl: string): { bucket: string; key: string } | null {
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicHost = process.env.R2_PUBLIC_HOST?.trim();
  if (!bucket || !publicHost || !videoUrl?.trim()) return null;

  let parsed: URL;
  try {
    parsed = new URL(videoUrl);
  } catch {
    return null;
  }

  const hostToMatch = new URL(publicHost).host;
  if (parsed.host !== hostToMatch) return null;

  const key = parsed.pathname.replace(/^\//, '');
  if (!key) return null;

  return { bucket, key };
}

/**
 * True if the stored video URL is from our R2 bucket (so we can stream via R2 instead of public URL).
 */
export function isR2Url(videoUrl: string): boolean {
  return getR2BucketAndKey(videoUrl) !== null;
}

/**
 * Generate a short-lived presigned R2 URL so the browser fetches directly from R2
 * without proxying through Vercel. Returns null if URL is not an R2 URL or R2 is misconfigured.
 */
export async function getR2PresignedUrl(
  videoUrl: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const bucketKey = getR2BucketAndKey(videoUrl);
  if (!bucketKey) return null;

  const client = getR2Client();
  if (!client) return null;

  try {
    const command = new GetObjectCommand({ Bucket: bucketKey.bucket, Key: bucketKey.key });
    return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  } catch (err) {
    console.error('R2 presign error:', err);
    return null;
  }
}
