export interface PayCreditCardParams {
  tokenId: string;
  creditCard: string;
  expireDate: string;
  cvv: string;
  cardHolderName: string;
}

export interface PayCashPlusParams {
  tokenId: string;
}

export interface PaymentResponse {
  success: boolean;
  code: string;
  message: string;
  transaction_id: string;
  order_id: string;
}

/** Raw API response from /cashplus/init - token can be string or object */
export interface CashPlusApiResponse {
  success?: boolean;
  transaction_id?: string;
  /** Token can be a string directly or an object with id */
  token: string | { id: string };
  amount?: number;
  currency?: string;
  order_id?: string;
  expires_at?: string;
  message?: string;
}

/** Normalized CashPlus response returned by the SDK */
export interface CashPlusPaymentResponse {
  success?: boolean;
  transaction_id: string;
  /** The CashPlus payment code - customer presents this at any CashPlus location */
  token: string;
  /** Amount in centimes */
  amount?: number;
  /** Currency code */
  currency?: string;
  /** Order ID for reference */
  order_id?: string;
  /** Expiration time for the CashPlus token (ISO date string) */
  expires_at?: string;
  /** Message from YouCanPay */
  message?: string;
}
