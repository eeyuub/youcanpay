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

export interface CashPlusPaymentResponse {
  success: boolean;
  transaction_id: string;
  cashplus_token: string;
}
