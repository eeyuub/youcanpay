import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import {
  YOUCANPAY_BASE_URL,
  YOUCANPAY_SANDBOX_BASE_URL,
  YOUCANPAY_PAYMENT_URL,
  YOUCANPAY_SANDBOX_PAYMENT_URL,
  YOUCANPAY_TRANSACTION_API_URL,
  YOUCANPAY_SANDBOX_TRANSACTION_API_URL,
} from './constants';
import { YouCanPayError, ErrorCodes } from './errors';
import { Lang } from './enums';
import { YouCanPayLogger } from './logging/logger';
import { parseWebhookPayload } from './security/webhook';
import {
  validateClientOptions,
  validatePaymentInput,
  validateTokenId,
  validateCardNumber,
  validateExpiryDate,
  validateCVV,
  validateCardHolderName,
} from './security/validators';
import {
  YouCanPayOptions,
  CreateTokenParams,
  TokenResponse,
  PayCreditCardParams,
  PaymentResponse,
  PayCashPlusParams,
  CashPlusPaymentResponse,
  CashPlusApiResponse,
  Transaction,
} from './interfaces';

export class YouCanPayClient {
  private readonly http: AxiosInstance;
  private readonly transactionHttp: AxiosInstance;
  private readonly sandbox: boolean;
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly logger: YouCanPayLogger;

  constructor(options: YouCanPayOptions) {
    this.assertValid(
      validateClientOptions({
        privateKey: options.privateKey,
        publicKey: options.publicKey,
        timeout: options.timeout,
      }),
    );

    this.sandbox = options.sandbox ?? false;
    this.privateKey = options.privateKey;
    this.publicKey = options.publicKey;
    this.logger = new YouCanPayLogger(options.logging);

    this.http = axios.create({
      baseURL: this.sandbox ? YOUCANPAY_SANDBOX_BASE_URL : YOUCANPAY_BASE_URL,
      timeout: options.timeout ?? 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.transactionHttp = axios.create({
      baseURL: this.sandbox ? YOUCANPAY_SANDBOX_TRANSACTION_API_URL : YOUCANPAY_TRANSACTION_API_URL,
      timeout: options.timeout ?? 30000,
    });
  }

  async createToken(params: CreateTokenParams): Promise<TokenResponse> {
    const startTime = Date.now();
    const orderId = params.orderId ?? randomUUID();
    this.assertValid(
      validatePaymentInput({
        amount: params.amount,
        currency: params.currency,
        orderId,
        customerIp: params.customerIp,
        successUrl: params.successUrl,
        errorUrl: params.errorUrl,
        customerEmail: params.customer?.email,
      }),
    );
    const body = new URLSearchParams();
    body.append('pri_key', this.privateKey);
    body.append('pub_key', this.publicKey);
    body.append('order_id', orderId);
    body.append('amount', String(params.amount));
    body.append('currency', params.currency);
    body.append('customer_ip', params.customerIp);
    body.append('success_url', params.successUrl);
    if (params.errorUrl) body.append('error_url', params.errorUrl);

    if (params.customer) {
      const customer = params.customer;
      if (customer.name) body.append('customer_name', customer.name);
      if (customer.email) body.append('customer_email', customer.email);
      if (customer.phone) body.append('customer_phone', customer.phone);
      if (customer.address) body.append('customer_address', customer.address);
      if (customer.zip_code) body.append('customer_zip_code', customer.zip_code);
      if (customer.city) body.append('customer_city', customer.city);
      if (customer.state) body.append('customer_state', customer.state);
      if (customer.country_code) body.append('customer_country_code', customer.country_code);
    }

    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        body.append(`metadata[${key}]`, value);
      }
    }

    try {
      const response = await this.http.post('/tokenize', body);
      const data = response.data as TokenResponse;
      await this.logger.log(
        'createToken',
        { orderId, amount: params.amount, currency: params.currency },
        data as unknown as Record<string, unknown>,
        'success',
        Date.now() - startTime,
        params.metadata,
      );
      return data;
    } catch (error) {
      await this.logger.log(
        'createToken',
        { orderId, amount: params.amount, currency: params.currency },
        undefined,
        'error',
        Date.now() - startTime,
      );
      throw this.handleError(error);
    }
  }

  getPaymentUrl(tokenId: string, lang: Lang = Lang.FR): string {
    const baseUrl = this.sandbox ? YOUCANPAY_SANDBOX_PAYMENT_URL : YOUCANPAY_PAYMENT_URL;
    return `${baseUrl}/${tokenId}?lang=${lang}`;
  }

  async payWithCreditCard(params: PayCreditCardParams): Promise<PaymentResponse> {
    const startTime = Date.now();
    this.assertValid(validateTokenId(params.tokenId));
    this.assertValid(validateCardNumber(params.creditCard));
    this.assertValid(validateExpiryDate(params.expireDate));
    this.assertValid(validateCVV(params.cvv));
    this.assertValid(validateCardHolderName(params.cardHolderName));
    const body = new URLSearchParams();
    body.append('pri_key', this.privateKey);
    body.append('pub_key', this.publicKey);
    body.append('token_id', params.tokenId);
    body.append('credit_card', params.creditCard);
    body.append('expire_date', params.expireDate);
    body.append('cvv', params.cvv);
    body.append('card_holder_name', params.cardHolderName);

    try {
      const response = await this.http.post('/pay', body);
      const data = response.data as PaymentResponse;
      await this.logger.log(
        'payWithCreditCard',
        { tokenId: params.tokenId, cardHolderName: params.cardHolderName },
        data as unknown as Record<string, unknown>,
        'success',
        Date.now() - startTime,
      );
      return data;
    } catch (error) {
      await this.logger.log(
        'payWithCreditCard',
        { tokenId: params.tokenId },
        undefined,
        'error',
        Date.now() - startTime,
      );
      throw this.handleError(error);
    }
  }

  async payWithCashPlus(params: PayCashPlusParams): Promise<CashPlusPaymentResponse> {
    const startTime = Date.now();
    this.assertValid(validateTokenId(params.tokenId));
    const body = new URLSearchParams();
    body.append('pri_key', this.privateKey);
    body.append('pub_key', this.publicKey);
    body.append('token_id', params.tokenId);
    body.append('payment_method[type]', 'cashplus');

    try {
      const response = await this.http.post('/cashplus/init', body);
      const rawData = response.data as CashPlusApiResponse;

      // Normalize token: handle both string and object formats
      // API docs show { token: { id: "..." } } but sandbox returns { token: "..." }
      const cashplusToken =
        typeof rawData.token === 'string' ? rawData.token : rawData.token?.id;

      const data: CashPlusPaymentResponse = {
        ...rawData,
        token: cashplusToken,
        transaction_id: rawData.transaction_id || '',
      };

      await this.logger.log(
        'payWithCashPlus',
        { tokenId: params.tokenId },
        data as unknown as Record<string, unknown>,
        'success',
        Date.now() - startTime,
      );
      return data;
    } catch (error) {
      await this.logger.log(
        'payWithCashPlus',
        { tokenId: params.tokenId },
        undefined,
        'error',
        Date.now() - startTime,
      );
      throw this.handleError(error);
    }
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    const startTime = Date.now();
    this.assertValid(validateTokenId(transactionId));
    try {
      const response = await this.transactionHttp.get(`/transactions/${transactionId}`, {
        params: { pri_key: this.privateKey },
      });
      const data = response.data as Transaction;
      await this.logger.log(
        'getTransaction',
        { transactionId },
        data as unknown as Record<string, unknown>,
        'success',
        Date.now() - startTime,
      );
      return data;
    } catch (error) {
      await this.logger.log(
        'getTransaction',
        { transactionId },
        undefined,
        'error',
        Date.now() - startTime,
      );
      throw this.handleError(error);
    }
  }

  verifyWebhook(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    try {
      parseWebhookPayload(payload);
      return true;
    } catch {
      // Fall back to the legacy flat webhook shape for backward compatibility.
    }

    const p = payload as Record<string, unknown>;
    return (
      typeof p['transaction_id'] === 'string' &&
      typeof p['order_id'] === 'string' &&
      (typeof p['amount'] === 'number' || typeof p['amount'] === 'string') &&
      typeof p['status'] === 'string'
    );
  }

  private handleError(error: unknown): YouCanPayError {
    if (
      error !== null &&
      typeof error === 'object' &&
      'isAxiosError' in error &&
      (error as { isAxiosError: boolean }).isAxiosError
    ) {
      const axiosError = error as {
        response?: {
          status: number;
          data?: { message?: string; errors?: Record<string, string[]> };
        };
      };

      if (axiosError.response) {
        const { status, data } = axiosError.response;
        const message = data?.message ?? 'An API error occurred';
        const details = data?.errors;

        if (status === 401 || status === 403) {
          return new YouCanPayError(message, ErrorCodes.UNAUTHORIZED, status, details);
        }
        if (status === 422) {
          return new YouCanPayError(message, ErrorCodes.VALIDATION_ERROR, status, details);
        }
        if (status >= 400 && status < 500) {
          return new YouCanPayError(message, ErrorCodes.PAYMENT_FAILED, status, details);
        }
        return new YouCanPayError(message, ErrorCodes.UNKNOWN_ERROR, status, details);
      }

      return new YouCanPayError('Network error occurred', ErrorCodes.NETWORK_ERROR);
    }

    if (error instanceof YouCanPayError) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new YouCanPayError(message, ErrorCodes.UNKNOWN_ERROR);
  }

  private assertValid(result: { valid: boolean; error?: string }): void {
    if (!result.valid) {
      throw new YouCanPayError(result.error ?? 'Invalid input', ErrorCodes.VALIDATION_ERROR);
    }
  }
}
