import * as crypto from 'crypto';

/**
 * Raw webhook payload as sent by YouCanPay
 */
export interface YouCanPayRawWebhook {
  id: string;
  event_name: string;
  sandbox: boolean;
  payload: {
    transaction: {
      id: string;
      status: number;
      order_id: string;
      amount: string | number;
      currency: string;
      base_currency?: string | null;
      base_amount?: string | null;
      created_at: string;
    };
    payment_method?: {
      id: number;
      name: string;
      card?: {
        id: string;
        country_code?: string | null;
        brand?: string | null;
        last_digits: string;
        fingerprint: string;
        is_3d_secure: boolean;
      };
    };
    token?: {
      id: string;
    };
    customer?: {
      id: string;
      email?: string | null;
      name?: string | null;
      address?: string | null;
      phone?: string | null;
      country_code?: string | null;
      city?: string | null;
      state?: string | null;
      zip_code?: string | null;
    };
    metadata?: Record<string, string> | unknown[];
  };
}

/**
 * Parsed webhook payload with normalized fields
 */
export interface ParsedWebhookPayload {
  /** Webhook event ID */
  webhookId: string;
  /** Event name (e.g., 'transaction.paid') */
  eventName: string;
  /** Whether this is a sandbox transaction */
  sandbox: boolean;
  /** Transaction ID from YouCanPay */
  transactionId: string;
  /** Your order ID */
  orderId: string;
  /** Amount in centimes */
  amount: number;
  /** Currency code */
  currency: string;
  /** Raw status from YouCanPay (1 = paid) */
  rawStatus: number;
  /** Normalized status */
  status: 'paid' | 'failed' | 'refunded' | 'unknown';
  /** Whether payment was successful */
  isSuccess: boolean;
  /** Token ID used for payment */
  tokenId?: string;
  /** Card last 4 digits (if card payment) */
  cardLastDigits?: string;
  /** Card brand (if available) */
  cardBrand?: string;
  /** Whether 3D Secure was used */
  is3DSecure?: boolean;
  /** Customer email (if provided) */
  customerEmail?: string;
  /** Transaction creation timestamp */
  createdAt: string;
  /** Original raw payload */
  raw: YouCanPayRawWebhook;
}

/**
 * Webhook verification options
 */
export interface WebhookVerifyOptions {
  /** Your webhook secret */
  secret: string;
  /** Request query parameters (for URL-based secret) */
  query?: Record<string, string>;
  /** Request headers (for header-based secret) */
  headers?: Record<string, string>;
  /** Header name for signature (default: 'x-ycp-signature') */
  signatureHeader?: string;
  /** Query parameter name for secret (default: 'secret') */
  secretParam?: string;
}

/**
 * Parse raw YouCanPay webhook payload into normalized format
 */
export function parseWebhookPayload(payload: unknown): ParsedWebhookPayload {
  if (!payload || typeof payload !== 'object') {
    throw new WebhookParseError('Invalid webhook payload: not an object');
  }

  const p = payload as Record<string, unknown>;

  // Validate required top-level fields
  if (!p['id'] || !p['event_name'] || !p['payload']) {
    throw new WebhookParseError('Invalid webhook payload: missing required fields (id, event_name, payload)');
  }

  const rawPayload = p as unknown as YouCanPayRawWebhook;
  const transaction = rawPayload.payload?.transaction;

  if (!transaction) {
    throw new WebhookParseError('Invalid webhook payload: missing transaction data');
  }

  if (!transaction.id || !transaction.order_id) {
    throw new WebhookParseError('Invalid webhook payload: missing transaction_id or order_id');
  }

  const eventName = rawPayload.event_name;
  const rawStatus = Number(transaction.status);

  // Determine normalized status
  let status: 'paid' | 'failed' | 'refunded' | 'unknown';
  if (rawStatus === 1 || eventName === 'transaction.paid') {
    status = 'paid';
  } else if (eventName === 'transaction.failed') {
    status = 'failed';
  } else if (eventName === 'refund.success' || eventName === 'transaction.refunded') {
    status = 'refunded';
  } else {
    status = 'unknown';
  }

  const isSuccess = status === 'paid';

  return {
    webhookId: rawPayload.id,
    eventName,
    sandbox: rawPayload.sandbox,
    transactionId: transaction.id,
    orderId: transaction.order_id,
    amount: Number(transaction.amount),
    currency: transaction.currency,
    rawStatus,
    status,
    isSuccess,
    tokenId: rawPayload.payload.token?.id,
    cardLastDigits: rawPayload.payload.payment_method?.card?.last_digits,
    cardBrand: rawPayload.payload.payment_method?.card?.brand || undefined,
    is3DSecure: rawPayload.payload.payment_method?.card?.is_3d_secure,
    customerEmail: rawPayload.payload.customer?.email || undefined,
    createdAt: transaction.created_at,
    raw: rawPayload,
  };
}

/**
 * Verify webhook authenticity using secret token
 */
export function verifyWebhookSecret(options: WebhookVerifyOptions): boolean {
  const { secret, query, headers, secretParam = 'secret', signatureHeader = 'x-ycp-signature' } = options;

  if (!secret) {
    throw new WebhookVerifyError('Webhook secret is required');
  }

  // Check header-based signature first (preferred)
  if (headers) {
    const signature = headers[signatureHeader] || headers[signatureHeader.toLowerCase()];
    if (signature && signature === secret) {
      return true;
    }
  }

  // Fall back to query parameter (YouCanPay's method)
  if (query) {
    const querySecret = query[secretParam];
    if (querySecret && querySecret === secret) {
      return true;
    }
  }

  return false;
}

/**
 * Verify webhook with HMAC signature (for future use if YouCanPay adds this)
 */
export function verifyWebhookHMAC(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): boolean {
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Create HMAC signature for a payload
 */
export function createWebhookSignature(
  payload: string | object,
  secret: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): string {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto
    .createHmac(algorithm, secret)
    .update(data)
    .digest('hex');
}

/**
 * Error thrown when webhook parsing fails
 */
export class WebhookParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookParseError';
  }
}

/**
 * Error thrown when webhook verification fails
 */
export class WebhookVerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerifyError';
  }
}
