# Prompt: Build a Production-Ready YouCanPay SDK for Node.js & NestJS

## Context

You are building a production-ready, open-source npm package called **`nestjs-youcanpay`** (or `youcanpay-sdk`).

This package must work in:
- **Pure Node.js** projects (Express, Fastify, vanilla Node)
- **NestJS** projects as a proper injectable module (like `nestjs-stripe`)

The package must be written in **TypeScript**, published to **npm**, fully typed, and cover 100% of the YouCanPay API.

---

## Reference Documentation

### API Endpoints (from official PHP SDK & Node SDK)

**Base URLs:**
- Production: `https://youcanpay.com/api`
- Sandbox: `https://youcanpay.com/sandbox/api`
- JS Script: `https://youcanpay.com/js/ycpay.js`

**Endpoints:**
```
POST /tokenize           → Create a payment token
POST /pay                → Pay with credit card (direct)
POST /cashplus/init      → Initiate CashPlus payment
GET  /transactions/:id   → Get transaction details (OAuth Bearer)
```

**Tokenize payload:**
```
pri_key        (required) private key
order_id       (required) string
amount         (required) integer in smallest unit (e.g. 5000 = 50 MAD)
currency       (required) uppercase e.g. "MAD"
customer_ip    (required) string IP
success_url    (required) string URL
error_url      (required) string URL
metadata[key]  (optional) any key-value pairs
customer.name, customer.address, customer.zip_code, customer.city,
customer.state, customer.country_code, customer.phone, customer.email (all optional)
```

**Tokenize response:**
```json
{ "token": { "id": "71d8c27-2416-41ee-b750-d6382f72a565" } }
```

**Pay with credit card payload:**
```
pub_key           (required)
token_id          (required)
credit_card       (required)
expire_date       (required) MM/YY
cvv               (required)
card_holder_name  (required)
payment_method[type] = "credit_card"
```

**CashPlus payload:**
```
pub_key              (required)
token_id             (required)
payment_method[type] = "cashplus"
```

**Pay success response:**
```json
{
  "success": true,
  "code": "000",
  "message": "The payment was processed successfully",
  "transaction_id": "f78d4a85-80bf-4405-8aef-9b256ce3f8ac",
  "order_id": "12"
}
```

**Payment URL (Standalone integration):**
```
https://youcanpay.com/payment-form/{token_id}?lang=ar|en|fr
https://youcanpay.com/sandbox/payment-form/{token_id}?lang=ar|en|fr
```

---

## Package Structure to Build

```
nestjs-youcanpay/
├── src/
│   ├── index.ts                          ← main exports
│   ├── youcanpay.client.ts               ← core HTTP client (axios-based)
│   ├── youcanpay.service.ts              ← NestJS injectable service
│   ├── youcanpay.module.ts               ← NestJS dynamic module
│   ├── interfaces/
│   │   ├── youcanpay-options.interface.ts
│   │   ├── token.interface.ts
│   │   ├── payment.interface.ts
│   │   ├── transaction.interface.ts
│   │   └── webhook.interface.ts
│   ├── dto/
│   │   ├── create-token.dto.ts
│   │   ├── pay-credit-card.dto.ts
│   │   └── pay-cashplus.dto.ts
│   ├── enums/
│   │   ├── currency.enum.ts
│   │   └── lang.enum.ts
│   ├── decorators/
│   │   └── inject-youcanpay.decorator.ts
│   └── constants.ts
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── .eslintrc.js
├── .prettierrc
├── jest.config.js
├── README.md
└── CHANGELOG.md
```

---

## Detailed Implementation Instructions

### 1. `src/constants.ts`
```ts
export const YOUCANPAY_OPTIONS = 'YOUCANPAY_OPTIONS';
export const YOUCANPAY_BASE_URL = 'https://youcanpay.com/api';
export const YOUCANPAY_SANDBOX_BASE_URL = 'https://youcanpay.com/sandbox/api';
export const YOUCANPAY_JS_SCRIPT = 'https://youcanpay.com/js/ycpay.js';
```

---

### 2. `src/enums/currency.enum.ts`
```ts
export enum CurrencyCode {
  MAD = 'MAD',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  SAR = 'SAR',
  AED = 'AED',
}
```

### 3. `src/enums/lang.enum.ts`
```ts
export enum Lang {
  AR = 'ar',
  EN = 'en',
  FR = 'fr',
}
```

---

### 4. `src/interfaces/youcanpay-options.interface.ts`
```ts
export interface YouCanPayOptions {
  privateKey: string;
  publicKey: string;
  sandbox?: boolean; // default: false
}

export interface YouCanPayAsyncOptions {
  useFactory: (...args: any[]) => Promise<YouCanPayOptions> | YouCanPayOptions;
  inject?: any[];
  imports?: any[];
}
```

---

### 5. `src/interfaces/token.interface.ts`
```ts
export interface CustomerInfo {
  name?: string;
  address?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  country_code?: string;
  phone?: string;
  email?: string;
}

export interface CreateTokenParams {
  orderId: string;
  amount: number;           // smallest unit: 5000 = 50 MAD
  currency: CurrencyCode | string;
  customerIp: string;
  successUrl: string;
  errorUrl?: string;
  customer?: CustomerInfo;
  metadata?: Record<string, string>;
}

export interface TokenResponse {
  token: {
    id: string;
  };
}
```

---

### 6. `src/interfaces/payment.interface.ts`
```ts
export interface PayCreditCardParams {
  tokenId: string;
  creditCard: string;
  expireDate: string;  // MM/YY
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
```

---

### 7. `src/interfaces/webhook.interface.ts`
```ts
export enum WebhookEventType {
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
  REFUND_SUCCESS = 'refund.success',
}

export interface WebhookPayload {
  id: string;
  event: WebhookEventType | string;
  transaction_id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'refunded';
  metadata?: Record<string, string>;
  created_at: string;
}
```

---

### 8. `src/youcanpay.client.ts`

This is the **framework-agnostic core** that works in pure Node.js too.

```ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  YouCanPayOptions,
  CreateTokenParams,
  TokenResponse,
  PayCreditCardParams,
  PayCashPlusParams,
  PaymentResponse,
  CashPlusPaymentResponse,
  Lang,
} from './interfaces';
import { YOUCANPAY_BASE_URL, YOUCANPAY_SANDBOX_BASE_URL } from './constants';

export class YouCanPayClient {
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;

  constructor(private readonly options: YouCanPayOptions) {
    this.baseUrl = options.sandbox ? YOUCANPAY_SANDBOX_BASE_URL : YOUCANPAY_BASE_URL;
    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: { Accept: 'application/json' },
    });
  }

  /**
   * Create a payment token (tokenization step — backend only).
   * Amount must be in smallest currency unit (e.g. 5000 = 50 MAD).
   */
  async createToken(params: CreateTokenParams): Promise<TokenResponse> {
    const form = new URLSearchParams();
    form.append('pri_key', this.options.privateKey);
    form.append('order_id', params.orderId);
    form.append('amount', String(params.amount));
    form.append('currency', params.currency);
    form.append('customer_ip', params.customerIp);
    form.append('success_url', params.successUrl);
    if (params.errorUrl) form.append('error_url', params.errorUrl);

    if (params.customer) {
      for (const [key, value] of Object.entries(params.customer)) {
        if (value) form.append(`customer[${key}]`, value);
      }
    }

    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        form.append(`metadata[${key}]`, value);
      }
    }

    try {
      const { data } = await this.http.post<TokenResponse>('/tokenize', form);
      return data;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Get a standalone payment URL to redirect the customer.
   * Useful for mobile apps or simple redirect flows.
   */
  getPaymentUrl(tokenId: string, lang: Lang = Lang.FR): string {
    const base = this.options.sandbox
      ? 'https://youcanpay.com/sandbox/payment-form'
      : 'https://youcanpay.com/payment-form';
    return `${base}/${tokenId}?lang=${lang}`;
  }

  /**
   * Pay with credit card (direct card integration).
   */
  async payWithCreditCard(params: PayCreditCardParams): Promise<PaymentResponse> {
    const form = new URLSearchParams({
      pub_key: this.options.publicKey,
      token_id: params.tokenId,
      credit_card: params.creditCard,
      expire_date: params.expireDate,
      cvv: params.cvv,
      card_holder_name: params.cardHolderName,
      'payment_method[type]': 'credit_card',
    });

    try {
      const { data } = await this.http.post<PaymentResponse>('/pay', form);
      return data;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Initiate a CashPlus payment.
   */
  async payWithCashPlus(params: PayCashPlusParams): Promise<CashPlusPaymentResponse> {
    const form = new URLSearchParams({
      pub_key: this.options.publicKey,
      token_id: params.tokenId,
      'payment_method[type]': 'cashplus',
    });

    try {
      const { data } = await this.http.post<CashPlusPaymentResponse>('/cashplus/init', form);
      return data;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Get transaction details by ID.
   * Requires OAuth Bearer token.
   */
  async getTransaction(transactionId: string, bearerToken: string) {
    try {
      const { data } = await axios.get(
        `https://api.youcanpay.com/transactions/${transactionId}`,
        { headers: { Authorization: `Bearer ${bearerToken}`, Accept: 'application/json' } }
      );
      return data;
    } catch (err) {
      throw this.handleError(err);
    }
  }

  /**
   * Verify a webhook payload.
   * YouCanPay sends the raw body — implement HMAC if they provide a secret,
   * otherwise validate the transaction_id by fetching the transaction.
   */
  verifyWebhook(payload: unknown, signature?: string): boolean {
    // TODO: Implement HMAC verification when YouCanPay provides a signing secret.
    // For now, validate by checking required fields.
    if (!payload || typeof payload !== 'object') return false;
    const p = payload as Record<string, unknown>;
    return !!(p['transaction_id'] && p['order_id']);
  }

  private handleError(err: unknown): Error {
    if (axios.isAxiosError(err)) {
      const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const message = axiosErr.response?.data?.message ?? axiosErr.message;
      const errors = axiosErr.response?.data?.errors;
      const errorMsg = errors
        ? `${message}: ${JSON.stringify(errors)}`
        : message;
      return new Error(`YouCanPay API Error: ${errorMsg}`);
    }
    return err instanceof Error ? err : new Error(String(err));
  }
}
```

---

### 9. `src/youcanpay.service.ts` (NestJS Injectable)

```ts
import { Injectable, Inject } from '@nestjs/common';
import { YouCanPayClient } from './youcanpay.client';
import { YouCanPayOptions } from './interfaces/youcanpay-options.interface';
import { YOUCANPAY_OPTIONS } from './constants';
import { CreateTokenParams, PayCreditCardParams, PayCashPlusParams, Lang } from './interfaces';

@Injectable()
export class YouCanPayService extends YouCanPayClient {
  constructor(@Inject(YOUCANPAY_OPTIONS) options: YouCanPayOptions) {
    super(options);
  }
}
```

---

### 10. `src/youcanpay.module.ts` (NestJS Dynamic Module)

Implement `forRoot()` and `forRootAsync()` — same pattern as `nestjs-stripe`.

```ts
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { YouCanPayService } from './youcanpay.service';
import { YouCanPayOptions, YouCanPayAsyncOptions } from './interfaces/youcanpay-options.interface';
import { YOUCANPAY_OPTIONS } from './constants';

@Module({})
export class YouCanPayModule {
  static forRoot(options: YouCanPayOptions): DynamicModule {
    return {
      module: YouCanPayModule,
      providers: [
        { provide: YOUCANPAY_OPTIONS, useValue: options },
        YouCanPayService,
      ],
      exports: [YouCanPayService],
      global: false,
    };
  }

  static forRootAsync(asyncOptions: YouCanPayAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: YOUCANPAY_OPTIONS,
      useFactory: asyncOptions.useFactory,
      inject: asyncOptions.inject ?? [],
    };

    return {
      module: YouCanPayModule,
      imports: asyncOptions.imports ?? [],
      providers: [optionsProvider, YouCanPayService],
      exports: [YouCanPayService],
      global: false,
    };
  }
}
```

---

### 11. `src/decorators/inject-youcanpay.decorator.ts`

```ts
import { Inject } from '@nestjs/common';
import { YouCanPayService } from '../youcanpay.service';

export const InjectYouCanPay = () => Inject(YouCanPayService);
```

---

### 12. `src/index.ts` — Public API

```ts
export { YouCanPayModule } from './youcanpay.module';
export { YouCanPayService } from './youcanpay.service';
export { YouCanPayClient } from './youcanpay.client';
export { InjectYouCanPay } from './decorators/inject-youcanpay.decorator';
export * from './interfaces';
export * from './enums/currency.enum';
export * from './enums/lang.enum';
export * from './constants';
```

---

### 13. `package.json`

```json
{
  "name": "nestjs-youcanpay",
  "version": "1.0.0",
  "description": "Production-ready YouCanPay SDK for Node.js and NestJS",
  "author": "Your Name",
  "license": "MIT",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "jest",
    "lint": "eslint 'src/**/*.ts'",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["youcanpay", "nestjs", "payment", "morocco", "mad", "cashplus"],
  "peerDependencies": {
    "@nestjs/common": "^8.0.0 || ^9.0.0 || ^10.0.0",
    "@nestjs/core": "^8.0.0 || ^9.0.0 || ^10.0.0",
    "reflect-metadata": "^0.1.13"
  },
  "peerDependenciesMeta": {
    "@nestjs/common": { "optional": true },
    "@nestjs/core": { "optional": true },
    "reflect-metadata": { "optional": true }
  },
  "dependencies": {
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

### 14. `tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

### 15. `tsconfig.json`

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2020",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "strictNullChecks": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### 16. Tests to Write (Jest)

Write unit tests for:

- `YouCanPayClient.createToken()` → mock axios, assert form params
- `YouCanPayClient.getPaymentUrl()` → assert correct URL with sandbox flag
- `YouCanPayClient.payWithCreditCard()` → mock axios, assert response mapping
- `YouCanPayClient.payWithCashPlus()` → mock axios
- `YouCanPayClient.verifyWebhook()` → valid/invalid payload cases
- `YouCanPayModule.forRoot()` → assert module providers
- `YouCanPayModule.forRootAsync()` → assert async factory

---

## README.md to Generate

The README must include:

### Badges
- npm version, license, TypeScript

### Installation
```bash
npm install nestjs-youcanpay
# or
yarn add nestjs-youcanpay
```

### NestJS Usage

**`app.module.ts` — Static config:**
```ts
import { YouCanPayModule } from 'nestjs-youcanpay';

@Module({
  imports: [
    YouCanPayModule.forRoot({
      privateKey: process.env.YCP_PRIVATE_KEY,
      publicKey: process.env.YCP_PUBLIC_KEY,
      sandbox: process.env.NODE_ENV !== 'production',
    }),
  ],
})
export class AppModule {}
```

**`app.module.ts` — Async config (with ConfigService):**
```ts
YouCanPayModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    privateKey: config.get('YCP_PRIVATE_KEY'),
    publicKey: config.get('YCP_PUBLIC_KEY'),
    sandbox: config.get('NODE_ENV') !== 'production',
  }),
}),
```

**`payment.service.ts`:**
```ts
import { Injectable } from '@nestjs/common';
import { YouCanPayService, CurrencyCode, Lang } from 'nestjs-youcanpay';

@Injectable()
export class PaymentService {
  constructor(private readonly youcanpay: YouCanPayService) {}

  async initiatePayment(orderId: string, amount: number, customerIp: string) {
    // Step 1: Create token (backend)
    const { token } = await this.youcanpay.createToken({
      orderId,
      amount,          // 5000 = 50 MAD
      currency: CurrencyCode.MAD,
      customerIp,
      successUrl: 'https://myapp.com/payment/success',
      errorUrl: 'https://myapp.com/payment/error',
      metadata: { source: 'mobile-app' },
    });

    // Step 2a: Return tokenId to frontend (for JS form integration)
    return { tokenId: token.id };

    // OR Step 2b: Return redirect URL (standalone integration)
    // return { paymentUrl: this.youcanpay.getPaymentUrl(token.id, Lang.FR) };
  }

  async handleWebhook(payload: unknown) {
    if (!this.youcanpay.verifyWebhook(payload)) {
      throw new Error('Invalid webhook payload');
    }
    // Process payment confirmation...
  }
}
```

### Plain Node.js / Express Usage
```ts
import { YouCanPayClient, CurrencyCode } from 'nestjs-youcanpay';

const client = new YouCanPayClient({
  privateKey: 'pri_xxx',
  publicKey: 'pub_xxx',
  sandbox: true,
});

const { token } = await client.createToken({
  orderId: 'order-123',
  amount: 10000,
  currency: CurrencyCode.MAD,
  customerIp: '127.0.0.1',
  successUrl: 'https://myapp.com/success',
});
console.log(token.id);
```

### Frontend Integration
```html
<script src="https://youcanpay.com/js/ycpay.js"></script>
<div id="payment-container"></div>
<button id="pay">Payer</button>

<script>
  const ycPay = new YCPay('pub_xxx', {
    formContainer: '#payment-container',
    locale: 'fr',
    isSandbox: true,
  });

  ycPay.renderAvailableGateways();

  document.getElementById('pay').addEventListener('click', () => {
    ycPay.pay('TOKEN_ID_FROM_BACKEND')
      .then(transactionId => console.log('Success:', transactionId))
      .catch(err => console.error('Error:', err));
  });
</script>
```

### Webhook Endpoint (NestJS)
```ts
@Post('webhook')
@HttpCode(200)
async handleWebhook(@Body() payload: WebhookPayload) {
  if (!this.youcanpay.verifyWebhook(payload)) {
    throw new UnauthorizedException('Invalid webhook');
  }
  if (payload.status === 'success') {
    await this.ordersService.markAsPaid(payload.order_id, payload.transaction_id);
  }
  return { received: true };
}
```

---

## Publishing Checklist

Before `npm publish`:

- [ ] `npm run build` → no errors
- [ ] `npm run test` → all tests pass
- [ ] Check `dist/` contains `.js`, `.d.ts`, `.js.map` files
- [ ] Verify `package.json` `main`, `types`, `files` fields
- [ ] Tag release: `git tag v1.0.0 && git push --tags`
- [ ] `npm publish --access public`

---

## Quality Requirements

- Full **TypeScript** strict mode
- Zero `any` types — use proper interfaces
- All public methods must have **JSDoc** comments
- Error handling: catch Axios errors and throw descriptive `YouCanPayError` instances
- **Sandbox mode** toggles the base URL automatically
- The `YouCanPayClient` must be usable **without NestJS** (no NestJS imports in client.ts)
- NestJS decorators only in `youcanpay.service.ts` and `youcanpay.module.ts`
- Peer dependencies for NestJS must be **optional** so plain Node.js users don't need them
