export interface Transaction {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  /** Payment status: 'pending', 'paid', 'failed', etc. */
  status: string;
  /** Payment method: 'credit_card', 'cashplus', etc. */
  payment_method?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, string>;
}

/** Transaction status values returned by YouCanPay */
export type TransactionStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
