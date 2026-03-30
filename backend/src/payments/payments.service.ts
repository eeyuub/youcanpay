import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  YouCanPayService,
  CurrencyCode,
  ParsedWebhookPayload,
  parseWebhookPayload,
} from 'youcanpay-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly youcanpay: YouCanPayService,
    private readonly config: ConfigService,
  ) {}

  async createPayment(userId: string, dto: CreatePaymentDto, customerIp: string) {
    const orderId = uuidv4();

    const baseUrl = this.config.get<string>('APP_URL') || 'http://localhost:3000';
    const successUrl = dto.successUrl || `${baseUrl}/payments/success`;
    const errorUrl = dto.errorUrl || `${baseUrl}/payments/error`;

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount: dto.amount,
        currency: dto.currency,
        userId,
        status: 'PENDING',
      },
    });

    // Create token with YouCanPay
    const { token } = await this.youcanpay.createToken({
      orderId,
      amount: dto.amount,
      currency: dto.currency as CurrencyCode,
      customerIp,
      successUrl,
      errorUrl,
    });

    // Update payment with tokenId
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { tokenId: token.id },
    });

    return {
      paymentId: payment.id,
      tokenId: token.id,
      paymentUrl: this.youcanpay.getPaymentUrl(token.id),
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
  async verifyPayment(orderId: string, transactionId: string) {
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
