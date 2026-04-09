import crypto from 'crypto';
import { fetchWithBudget } from '@/lib/utils/fetchWithBudget';
import { signPaymentFailToken } from '@/lib/payments/failToken';
import {
  BarayCredentials,
  BarayPaymentPayload,
  BarayIntentResponse,
  BarayPaymentResult,
} from './types';

const BARAY_API_URL = 'https://api.baray.io';
const BARAY_PAYMENT_URL = 'https://pay.baray.io';

/**
 * Get Baray credentials from environment variables.
 * All three must come from the same API key row in dash.baray.io.
 */
export function getBarayCredentials(): BarayCredentials {
  const apiKey = process.env.BARAY_API_KEY?.trim();
  const secretKey = process.env.BARAY_SECRET_KEY?.trim();
  const iv = process.env.BARAY_IV?.trim();

  if (!apiKey || !secretKey || !iv) {
    throw new Error(
      'Missing Baray credentials. Ensure BARAY_API_KEY, BARAY_SECRET_KEY, and BARAY_IV are set.'
    );
  }

  // Baray expects sk = 32 bytes, iv = 16 bytes after base64 decode
  try {
    const keyLen = Buffer.from(secretKey, 'base64').length;
    const ivLen = Buffer.from(iv, 'base64').length;
    if (keyLen !== 32 || ivLen !== 16) {
      throw new Error(
        `Invalid Baray key lengths: secret key decoded to ${keyLen} bytes (expected 32), iv to ${ivLen} bytes (expected 16). Ensure BARAY_SECRET_KEY and BARAY_IV are the exact values from the same API key in dash.baray.io.`
      );
    }
  } catch (e) {
    if (e instanceof Error && !e.message.includes('Invalid Baray key lengths')) throw e;
    throw new Error(
      'Baray credentials must be valid Base64. Copy Encryption key (secret) → BARAY_SECRET_KEY and Cypher key (secret) → BARAY_IV from the same key row as your Public key in dash.baray.io.'
    );
  }

  return { apiKey, secretKey, iv };
}

/**
 * Encrypt payload using AES-256-CBC for Baray API
 * @param payload - The payment payload to encrypt
 * @param sk - Base64 encoded secret key (32 bytes)
 * @param iv - Base64 encoded initialization vector (16 bytes)
 * @returns Base64 encoded encrypted string
 */
export function encryptPayload(
  payload: BarayPaymentPayload,
  sk: string,
  iv: string
): string {
  const key = Buffer.from(sk, 'base64');
  const ivBuffer = Buffer.from(iv, 'base64');
  const plaintext = JSON.stringify(payload);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, ivBuffer);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return encrypted.toString('base64');
}

/**
 * Decrypt data from Baray webhook using AES-256-CBC
 * @param encryptedData - Base64 encoded encrypted string
 * @param sk - Base64 encoded secret key (32 bytes)
 * @param iv - Base64 encoded initialization vector (16 bytes)
 * @returns Decrypted string
 */
export function decryptOrderId(
  encryptedData: string,
  sk: string,
  iv: string
): string {
  const key = Buffer.from(sk, 'base64');
  const ivBuffer = Buffer.from(iv, 'base64');
  const encryptedBuffer = Buffer.from(encryptedData, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Generate a unique order ID
 */
export function generateOrderId(prefix: string = 'ORD'): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Create a payment intent with Baray
 * @param payload - Payment details
 * @returns Payment result with intent_id and payment_url
 */
export async function createPaymentIntent(
  payload: BarayPaymentPayload
): Promise<BarayPaymentResult> {
  try {
    const credentials = getBarayCredentials();
    
    // Encrypt the payload
    const encryptedData = encryptPayload(
      payload,
      credentials.secretKey,
      credentials.iv
    );

    // Send request to Baray
    const response = await fetchWithBudget(
      `${BARAY_API_URL}/pay`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': credentials.apiKey,
        },
        body: JSON.stringify({ data: encryptedData }),
      },
      {
        timeoutMs: 8000,
        retries: 2,
        retryDelayMs: 250,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData.error ??
        errorData.message ??
        errorData.detail ??
        (Array.isArray(errorData.details) ? errorData.details.join(', ') : errorData.details) ??
        `HTTP ${response.status}: Payment request failed`;
      console.error('Baray API error response:', response.status, JSON.stringify(errorData));
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }

    const intentData: BarayIntentResponse = await response.json();

    return {
      success: true,
      intent_id: intentData._id,
      payment_url: `${BARAY_PAYMENT_URL}/${intentData._id}`,
    };
  } catch (error) {
    console.error('Baray payment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment',
    };
  }
}

/**
 * Process webhook callback from Baray
 * @param encryptedOrderId - Encrypted order ID from webhook
 * @param bank - Bank that processed the payment
 * @returns Decrypted order ID
 */
export function processWebhook(
  encryptedOrderId: string,
  bank: string
): { order_id: string; bank: string } {
  const credentials = getBarayCredentials();
  const orderId = decryptOrderId(
    encryptedOrderId,
    credentials.secretKey,
    credentials.iv
  );

  return {
    order_id: orderId,
    bank,
  };
}

/**
 * Build the success redirect URL
 */
export function buildSuccessUrl(
  baseUrl: string,
  orderId: string,
  contentId?: string
): string {
  const params = new URLSearchParams({
    order_id: orderId,
    ...(contentId && { id: contentId }),
  });
  return `${baseUrl}/payment/success?${params.toString()}`;
}

/**
 * Build the failure/cancel redirect URL
 */
export function buildFailUrl(
  baseUrl: string,
  orderId: string,
  userId: string,
  contentId?: string
): string {
  const params = new URLSearchParams({
    order_id: orderId,
    cancel_token: signPaymentFailToken({ orderId, userId }),
    ...(contentId && { id: contentId }),
  });
  return `${baseUrl}/payment/failed?${params.toString()}`;
}
