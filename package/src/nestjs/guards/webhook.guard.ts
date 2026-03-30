import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyWebhookSecret } from '../../security/webhook';

export const WEBHOOK_SECRET_KEY = 'YOUCANPAY_WEBHOOK_SECRET';
export const WEBHOOK_OPTIONS_KEY = 'youcanpay:webhook:options';

export interface WebhookGuardOptions {
  /** Query parameter name for secret (default: 'secret') */
  secretParam?: string;
  /** Header name for secret (default: 'x-ycp-signature') */
  signatureHeader?: string;
  /** Custom secret (overrides injected secret) */
  secret?: string;
}

/**
 * Guard to verify YouCanPay webhook requests
 *
 * Usage:
 * ```typescript
 * @Post('webhook')
 * @UseGuards(WebhookGuard)
 * handleWebhook(@Body() payload: unknown) {
 *   // Only reached if webhook is verified
 * }
 * ```
 *
 * Configure in module:
 * ```typescript
 * providers: [
 *   {
 *     provide: 'YOUCANPAY_WEBHOOK_SECRET',
 *     useValue: process.env.YCP_WEBHOOK_SECRET,
 *   },
 * ],
 * ```
 */
@Injectable()
export class WebhookGuard implements CanActivate {
  constructor(
    @Inject(WEBHOOK_SECRET_KEY) private readonly webhookSecret: string,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Get options from decorator or use defaults
    const options = this.reflector.get<WebhookGuardOptions>(
      WEBHOOK_OPTIONS_KEY,
      context.getHandler(),
    ) || {};

    const secret = options.secret || this.webhookSecret;

    if (!secret) {
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const isValid = verifyWebhookSecret({
      secret,
      query: request.query,
      headers: request.headers,
      secretParam: options.secretParam,
      signatureHeader: options.signatureHeader,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}

/**
 * Decorator to configure webhook guard options
 *
 * Usage:
 * ```typescript
 * @Post('webhook')
 * @UseGuards(WebhookGuard)
 * @WebhookOptions({ secretParam: 'token' })
 * handleWebhook(@Body() payload: unknown) {}
 * ```
 */
export function WebhookOptions(options: WebhookGuardOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(WEBHOOK_OPTIONS_KEY, options, descriptor.value as object);
    return descriptor;
  };
}
