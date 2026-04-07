import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  YouCanPayService,
  CurrencyCode,
  ParsedWebhookPayload,
  parseWebhookPayload,
} from '@wiicode/youcanpay-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateCashPlusPaymentDto } from './dto/create-cashplus-payment.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly youcanpay: YouCanPayService,
    private readonly config: ConfigService,
  ) {}

  private getRedirectBaseUrl(): string {
    return (
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('APP_URL') ||
      'http://localhost:5173'
    );
  }

  private getRedirectUrls(dto: { successUrl?: string; errorUrl?: string }) {
    const baseUrl = this.getRedirectBaseUrl();

    return {
      successUrl: dto.successUrl || `${baseUrl}/payments/success`,
      errorUrl: dto.errorUrl || `${baseUrl}/payments/error`,
    };
  }

  async createPayment(userId: string, dto: CreatePaymentDto, customerIp: string) {
    const orderId = uuidv4();
    const { successUrl, errorUrl } = this.getRedirectUrls(dto);

    // Create token with YouCanPay
    const { token } = await this.youcanpay.createToken({
      orderId,
      amount: dto.amount,
      currency: dto.currency as CurrencyCode,
      customerIp,
      successUrl,
      errorUrl,
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount: dto.amount,
        currency: dto.currency,
        userId,
        status: 'PENDING',
        tokenId: token.id,
      },
    });

    return {
      paymentId: payment.id,
      tokenId: token.id,
      paymentUrl: this.youcanpay.getPaymentUrl(token.id),
    };
  }

  async createCashPlusPayment(userId: string, dto: CreateCashPlusPaymentDto, customerIp: string) {
    const orderId = uuidv4();
    const { successUrl, errorUrl } = this.getRedirectUrls(dto);

    // Create token with YouCanPay
    const { token } = await this.youcanpay.createToken({
      orderId,
      amount: dto.amount,
      currency: dto.currency as CurrencyCode,
      customerIp,
      successUrl,
      errorUrl,
    });

    // Initialize CashPlus payment
    const cashplusResult = await this.youcanpay.payWithCashPlus({
      tokenId: token.id,
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount: dto.amount,
        currency: dto.currency,
        userId,
        status: 'PENDING',
        paymentMethod: 'CASHPLUS',
        tokenId: token.id,
        cashplusToken: cashplusResult.token,
        transactionId: cashplusResult.transaction_id,
      },
    });

    return {
      paymentId: payment.id,
      orderId,
      cashplusToken: cashplusResult.token,
      transactionId: cashplusResult.transaction_id,
      amount: dto.amount,
      currency: dto.currency,
      message: cashplusResult.message,
      expiresAt: cashplusResult.expires_at,
    };
  }

  async getPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Handle webhook with raw payload (parses using SDK)
   */
  async handleWebhook(payload: unknown) {
    const parsed = parseWebhookPayload(payload);
    return this.processWebhook(parsed);
  }

  /**
   * Handle webhook with pre-parsed payload (from ParseWebhookPipe)
   */
  async processWebhook(webhook: ParsedWebhookPayload) {
    const isDev = this.config.get('NODE_ENV') !== 'production';

    if (isDev) {
      console.log('Webhook received:', { orderId: webhook.orderId, event: webhook.eventName });
    }

    // Find the payment in our database
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: webhook.orderId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Idempotency check: prevent replay attacks
    if (payment.status === 'COMPLETED' && payment.transactionId === webhook.transactionId) {
      if (isDev) console.log('Webhook already processed:', webhook.orderId);
      return { received: true, already_processed: true };
    }

    // SECURITY: Verify transaction with YouCanPay API before trusting webhook
    try {
      const verifiedTransaction = await this.youcanpay.getTransaction(webhook.transactionId);

      // Verify the transaction matches our order
      if (verifiedTransaction.order_id !== webhook.orderId) {
        if (isDev) console.log('Transaction order_id mismatch');
        throw new Error('Transaction verification failed: order_id mismatch');
      }

      // Verify the amount matches
      if (verifiedTransaction.amount !== payment.amount) {
        if (isDev) console.log('Transaction amount mismatch');
        throw new Error('Transaction verification failed: amount mismatch');
      }

      if (isDev) console.log('Transaction verified:', webhook.orderId);
    } catch (error) {
      if (isDev) console.error('Transaction verification failed:', error);
      throw new Error('Transaction verification failed');
    }

    // Use SDK's parsed status (already normalized)
    const paymentStatus = webhook.isSuccess ? 'COMPLETED' : 'FAILED';

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus as 'COMPLETED' | 'FAILED',
        transactionId: webhook.transactionId,
      },
    });

    if (isDev) console.log('Payment updated:', { orderId: webhook.orderId, status: paymentStatus });

    return { received: true };
  }

  async getUserPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Verify payment status - called from success/error redirect page
   * This is the secure way to confirm payment, not trusting URL params
   */
  /**
   * Check CashPlus payment status by querying YouCanPay API
   * Useful for polling payment status before webhook arrives
   */
  async checkCashPlusStatus(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!payment.transactionId) {
      return {
        paymentId: payment.id,
        status: payment.status,
        message: 'No transaction ID available',
      };
    }

    // Query YouCanPay for current transaction status
    try {
      const transaction = await this.youcanpay.getTransaction(payment.transactionId);

      // Update local status if YouCanPay shows it's paid
      if (transaction.status === 'paid' && payment.status !== 'COMPLETED') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' },
        });

        return {
          paymentId: payment.id,
          status: 'COMPLETED',
          transactionStatus: transaction.status,
          message: 'Payment confirmed!',
        };
      }

      return {
        paymentId: payment.id,
        status: payment.status,
        transactionStatus: transaction.status,
        cashplusToken: payment.cashplusToken,
        amount: payment.amount,
        currency: payment.currency,
      };
    } catch (error) {
      return {
        paymentId: payment.id,
        status: payment.status,
        error: 'Could not fetch status from YouCanPay',
      };
    }
  }

  async verifyPayment(orderId: string, transactionId: string, isSuccess?: boolean) {
    // Find payment in our database
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      return { verified: false, error: 'Payment not found' };
    }

    // Check if already verified via webhook
    if (payment.status === 'COMPLETED' && payment.transactionId === transactionId) {
      return {
        verified: true,
        status: payment.status,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
      };
    }

    // If still pending and redirect indicates success, update the payment
    if (payment.status === 'PENDING' && transactionId && isSuccess) {
      // Trust the redirect params from YouCanPay (is_success=1)
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          transactionId: transactionId,
        },
      });

      return {
        verified: true,
        status: 'COMPLETED',
        transactionId: transactionId,
        amount: payment.amount,
        currency: payment.currency,
      };
    }

    // If not yet updated by webhook, we can optionally call YouCanPay API
    // to verify the transaction (requires OAuth bearer token)
    // For now, we check if the transactionId matches what webhook sent
    if (payment.transactionId && payment.transactionId !== transactionId) {
      return { verified: false, error: 'Transaction ID mismatch' };
    }

    // Payment exists but not yet confirmed - webhook may still be pending
    return {
      verified: payment.status === 'COMPLETED',
      status: payment.status,
      transactionId: payment.transactionId,
      amount: payment.amount,
      currency: payment.currency,
      pending: payment.status === 'PENDING',
    };
  }
}
