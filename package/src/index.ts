// Core client (framework-agnostic)
export { YouCanPayClient } from './client';

// NestJS integration
export { YouCanPayModule } from './nestjs/youcanpay.module';
export { YouCanPayService } from './nestjs/youcanpay.service';
export { InjectYouCanPay } from './nestjs/decorators';
export { WebhookGuard, WebhookOptions, WEBHOOK_SECRET_KEY } from './nestjs/guards';
export { ParseWebhookPipe } from './nestjs/pipes';

// Security utilities
export {
  // Webhook parsing & verification
  parseWebhookPayload,
  verifyWebhookSecret,
  verifyWebhookHMAC,
  createWebhookSignature,
  WebhookParseError,
  WebhookVerifyError,
  // Validators
  validateAmount,
  validateCurrency,
  validateRedirectURL,
  validateOrderId,
  validateIP,
  validateEmail,
  validatePaymentInput,
  sanitizeString,
  toCentimes,
  fromCentimes,
  formatAmount,
  SUPPORTED_CURRENCIES,
  // Types
  type YouCanPayRawWebhook,
  type ParsedWebhookPayload,
  type WebhookVerifyOptions,
  type SupportedCurrency,
  type ValidationResult,
} from './security';

// Interfaces
export * from './interfaces';

// Enums
export * from './enums';

// Errors
export * from './errors';

// Logging
export { YouCanPayLogger, YouCanPayLogEntry, YouCanPayLoggingOptions } from './logging';

// Constants
export * from './constants';
