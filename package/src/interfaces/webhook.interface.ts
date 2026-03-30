export enum WebhookEventType {
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
  REFUND_SUCCESS = 'refund.success',
}

export interface WebhookPayload {
  id: string;
  event: WebhookEventType | string;
  transaction_id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'refunded';
  metadata?: Record<string, string>;
  created_at: string;
}
