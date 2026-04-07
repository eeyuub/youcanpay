import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ParseWebhookPipe, ParsedWebhookPayload, verifyWebhookSecret } from '@wiicode/youcanpay-sdk';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateCashPlusPaymentDto } from './dto/create-cashplus-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Verify payment status - PUBLIC endpoint for redirect verification
   * This securely verifies payment by checking our database (updated via webhook)
   * NOTE: Must be BEFORE :id route to avoid being caught by it
   */
  @Get('verify')
  verifyPayment(
    @Query('order_id') orderId: string,
    @Query('transaction_id') transactionId: string,
    @Query('is_success') isSuccess: string,
  ) {
    if (!orderId || !transactionId) {
      return { verified: false, error: 'Missing order_id or transaction_id' };
    }
    return this.paymentsService.verifyPayment(orderId, transactionId, isSuccess === '1');
  }

  @Post('create-token')
  @UseGuards(JwtAuthGuard)
  createPayment(
    @Request() req: RequestWithUser,
    @Body() dto: CreatePaymentDto,
    @Ip() ip: string,
  ) {
    return this.paymentsService.createPayment(req.user.id, dto, ip || '127.0.0.1');
  }

  /**
   * Initialize CashPlus payment - returns a payment code for the customer
   * to present at any CashPlus location in Morocco
   */
  @Post('cashplus')
  @UseGuards(JwtAuthGuard)
  createCashPlusPayment(
    @Request() req: RequestWithUser,
    @Body() dto: CreateCashPlusPaymentDto,
    @Ip() ip: string,
  ) {
    return this.paymentsService.createCashPlusPayment(req.user.id, dto, ip || '127.0.0.1');
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getUserPayments(@Request() req: RequestWithUser) {
    return this.paymentsService.getUserPayments(req.user.id);
  }

  /**
   * Check CashPlus payment status by querying YouCanPay API directly
   * Useful for polling before webhook arrives
   */
  @Get(':id/status')
  @UseGuards(JwtAuthGuard)
  checkPaymentStatus(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.paymentsService.checkCashPlusStatus(id, req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getPayment(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.paymentsService.getPayment(req.user.id, id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Body(ParseWebhookPipe) webhook: ParsedWebhookPayload,
    @Query() query: Record<string, string>,
  ) {
    // Verify webhook secret using SDK utility
    const expectedSecret = this.config.get<string>('YCP_WEBHOOK_SECRET');
    const isValid = verifyWebhookSecret({
      secret: expectedSecret || '',
      query,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    // Process the pre-parsed webhook
    return this.paymentsService.processWebhook(webhook);
  }
}
