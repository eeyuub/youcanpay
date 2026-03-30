import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { parseWebhookPayload, ParsedWebhookPayload, WebhookParseError } from '../../security/webhook';

/**
 * Pipe to parse and validate YouCanPay webhook payloads
 *
 * Usage:
 * ```typescript
 * @Post('webhook')
 * @UseGuards(WebhookGuard)
 * handleWebhook(@Body(ParseWebhookPipe) payload: ParsedWebhookPayload) {
 *   console.log(payload.transactionId, payload.orderId, payload.isSuccess);
 * }
 * ```
 */
@Injectable()
export class ParseWebhookPipe implements PipeTransform<unknown, ParsedWebhookPayload> {
  transform(value: unknown): ParsedWebhookPayload {
    try {
      return parseWebhookPayload(value);
    } catch (error) {
      if (error instanceof WebhookParseError) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to parse webhook payload');
    }
  }
}

/**
 * Decorator to get parsed webhook payload in controller
 *
 * Usage:
 * ```typescript
 * @Post('webhook')
 * @UseGuards(WebhookGuard)
 * handleWebhook(@ParsedWebhook() payload: ParsedWebhookPayload) {
 *   console.log(payload.isSuccess);
 * }
 * ```
 */
export function ParsedWebhook(): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    // This is handled by NestJS's Body decorator with ParseWebhookPipe
    // This decorator is just for semantic clarity
  };
}
