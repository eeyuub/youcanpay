/**
 * Refund reason codes
 */
export enum RefundReason {
  DUPLICATE = 'duplicate',
  FRAUDULENT = 'fraudulent',
  REQUESTED_BY_CUSTOMER = 'requested_by_customer',
  OTHER = 'other',
}

/**
 * Parameters for creating a refund
 */
export interface CreateRefundParams {
  /** The transaction ID to refund */
  transactionId: string;
  /** Amount to refund in centimes (optional for partial refund, omit for full refund) */
  amount?: number;
  /** Reason for the refund */
  reason?: RefundReason | string;
}

/**
 * Refund amount details
 */
export interface RefundAmount {
  amount: number;
  currency: string;
  localized: string;
}

/**
 * Refund object returned by YouCanPay API
 */
export interface Refund {
  id: string;
  transaction_id: string;
  amount: RefundAmount;
  amount_in_mad: number;
  status: number;
  status_text: string;
  reason: number;
  reason_text: string;
  created_at: string;
}

/**
 * Parameters for listing refunds
 */
export interface ListRefundsParams {
  /** Page number for pagination */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Filter by status */
  status?: number;
  /** Filter by transaction ID */
  transaction_id?: string;
  /** Sort by field */
  sort_by?: 'amount' | 'status' | 'reason' | 'created_at';
  /** Sort order */
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated refund list response
 */
export interface RefundListResponse {
  data: Refund[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
