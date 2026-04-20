import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import type { BarayPaymentPayload, BarayWebhookPayload } from './types';
import { jsonNoStore, jsonPrivateNoStore } from '@/lib/api/json';

const BARAY_MINIMUM_AMOUNTS: Record<BarayPaymentPayload['currency'], number> = {
  USD: 0.03,
  KHR: 100,
};

const BARAY_ALLOWED_BANKS = new Set<BarayWebhookPayload['bank']>([
  'aba',
  'acleda',
  'spn',
  'wing',
]);

type PaymentContentType = 'movie' | 'subscription';

export type BarayCreatePaymentInput = {
  amount: number;
  currency: BarayPaymentPayload['currency'];
  contentType: PaymentContentType;
  contentId?: string;
  contentTitle: string;
};

export type BarayWebhookInput = {
  encryptedOrderId: string;
  bank: BarayWebhookPayload['bank'];
};

export type BarayPaymentRecord = {
  id: string;
  status: string;
  content_type: string | null;
  content_id: string | null;
  user_id: string | null;
};

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function barayErrorResponse(message: string, status: number) {
  return jsonPrivateNoStore(
    { success: false, error: { message } },
    { status }
  );
}

export function baraySuccessResponse(data: unknown) {
  return jsonPrivateNoStore({ success: true, data });
}

export function parseBarayCreatePaymentBody(body: unknown):
  | { ok: true; data: BarayCreatePaymentInput }
  | { ok: false; response: Response } {
  if (!body || typeof body !== 'object') {
    return {
      ok: false,
      response: barayErrorResponse('Missing required fields: amount, contentTitle', 400),
    };
  }

  const amountRaw = (body as { amount?: unknown }).amount;
  const contentTitle = readTrimmedString((body as { contentTitle?: unknown }).contentTitle);
  const currencyRaw = readTrimmedString((body as { currency?: unknown }).currency).toUpperCase();
  const contentTypeRaw = readTrimmedString((body as { contentType?: unknown }).contentType).toLowerCase();
  const contentId = readTrimmedString((body as { contentId?: unknown }).contentId) || undefined;

  if (amountRaw == null || !contentTitle) {
    return {
      ok: false,
      response: barayErrorResponse('Missing required fields: amount, contentTitle', 400),
    };
  }

  const amount = typeof amountRaw === 'number'
    ? amountRaw
    : Number.parseFloat(String(amountRaw));

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      response: barayErrorResponse('Invalid amount', 400),
    };
  }

  let currency: BarayPaymentPayload['currency'] = 'USD';
  if (currencyRaw) {
    if (currencyRaw !== 'USD' && currencyRaw !== 'KHR') {
      return {
        ok: false,
        response: barayErrorResponse('Unsupported currency', 400),
      };
    }
    currency = currencyRaw;
  }

  if (amount < BARAY_MINIMUM_AMOUNTS[currency]) {
    return {
      ok: false,
      response: barayErrorResponse(
        currency === 'USD' ? 'USD amount must be >= $0.03' : 'KHR amount must be >= 100 KHR',
        400
      ),
    };
  }

  if (contentTypeRaw && contentTypeRaw !== 'movie' && contentTypeRaw !== 'subscription') {
    return {
      ok: false,
      response: barayErrorResponse('Invalid contentType', 400),
    };
  }

  return {
    ok: true,
    data: {
      amount,
      currency,
      contentType: contentTypeRaw === 'subscription' ? 'subscription' : 'movie',
      contentId,
      contentTitle,
    },
  };
}

export function parseBarayWebhookBody(body: unknown):
  | { ok: true; data: BarayWebhookInput }
  | { ok: false; response: Response } {
  if (!body || typeof body !== 'object') {
    return {
      ok: false,
      response: jsonNoStore({ error: 'Invalid webhook payload' }, { status: 400 }),
    };
  }

  const encryptedOrderId = readTrimmedString(
    (body as { encrypted_order_id?: unknown }).encrypted_order_id
  );
  const bank = readTrimmedString((body as { bank?: unknown }).bank).toLowerCase();

  if (!encryptedOrderId || !BARAY_ALLOWED_BANKS.has(bank as BarayWebhookPayload['bank'])) {
    return {
      ok: false,
      response: jsonNoStore({ error: 'Invalid webhook payload' }, { status: 400 }),
    };
  }

  return {
    ok: true,
    data: {
      encryptedOrderId,
      bank: bank as BarayWebhookPayload['bank'],
    },
  };
}

export function resolveBarayBaseUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const origin = request.headers.get('origin');
  const proto = request.headers.get('x-forwarded-proto');
  const host = request.headers.get('x-forwarded-host');
  const fromRequest = origin || (proto && host ? `${proto}://${host}` : null);

  return (
    (envUrl && !envUrl.includes('localhost') ? envUrl : null)
    || fromRequest
    || envUrl
    || 'http://localhost:3000'
  );
}

export function logBarayEvent(event: string, meta?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      event,
      at: new Date().toISOString(),
      ...(meta ?? {}),
    })
  );
}

export async function storePendingBarayPayment(
  adminClient: SupabaseClient,
  params: {
    userId: string;
    intentId: string;
    contentType: PaymentContentType;
    contentId?: string;
    contentTitle: string;
    amount: number;
    currency: BarayPaymentPayload['currency'];
    orderId: string;
  }
): Promise<unknown | null> {
  const { error } = await adminClient.from('payments').insert({
    user_id: params.userId,
    qr_id: params.intentId,
    content_type: params.contentType,
    content_id: params.contentId ?? null,
    content_title: params.contentTitle,
    amount: params.amount,
    currency: params.currency,
    status: 'pending',
    reference: params.orderId,
    payment_method: 'baray',
  });

  return error ?? null;
}

export async function grantBarayEntitlement(
  adminClient: SupabaseClient,
  payment: BarayPaymentRecord,
  nowIso: string
): Promise<unknown | null> {
  if (payment.content_type === 'movie' && payment.content_id && payment.user_id) {
    const { error } = await adminClient
      .from('purchases')
      .upsert(
        {
          user_id: payment.user_id,
          content_id: payment.content_id,
          content_type: 'movie',
          purchased_at: nowIso,
        },
        {
          onConflict: 'user_id,content_id',
        }
      );
    return error ?? null;
  }

  if (payment.content_type === 'subscription' && payment.user_id) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    const { error } = await adminClient
      .from('subscriptions')
      .upsert(
        {
          user_id: payment.user_id,
          type: 'series',
          status: 'active',
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );
    return error ?? null;
  }

  return null;
}

export async function markBarayPaymentCompleted(
  adminClient: SupabaseClient,
  paymentId: string,
  bankCode: string,
  completedAt: string
): Promise<unknown | null> {
  const { error } = await adminClient
    .from('payments')
    .update({
      status: 'completed',
      transaction_id: `${bankCode}-${Date.now()}`,
      completed_at: completedAt,
    })
    .eq('id', paymentId)
    .neq('status', 'completed');

  return error ?? null;
}
