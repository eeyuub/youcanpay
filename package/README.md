# YouCanPay SDK

[![npm version](https://img.shields.io/npm/v/@wiicode/youcanpay-sdk.svg)](https://www.npmjs.com/package/@wiicode/youcanpay-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@wiicode/youcanpay-sdk.svg)](https://www.npmjs.com/package/@wiicode/youcanpay-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue.svg)](https://github.com/eeyuub/youcanpay)

Production-ready Node.js SDK for [YouCanPay](https://youcanpay.com) - Morocco's payment gateway.

Works with **any Node.js framework** (Express, Fastify, Hapi) and has first-class **NestJS integration**.

## Table of Contents

- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Quick Start](#quick-start)
- [Complete Payment Flow](#complete-payment-flow)
- [API Reference](#api-reference)
- [Webhook Handling](#webhook-handling)
- [Database Integration](#database-integration)
- [Validation & Security](#validation--security)
- [Error Handling](#error-handling)
- [Testing](#testing)

---

## Installation

```bash
npm install @wiicode/youcanpay-sdk
```

```bash
yarn add @wiicode/youcanpay-sdk
```

### Peer Dependencies

For **NestJS** integration, ensure you have:
```bash
npm install @nestjs/common @nestjs/core
```

---

## Environment Setup

### Required Variables

```env
# YouCanPay API Credentials
YCP_PRIVATE_KEY=pri_sandbox_xxxxx    # Your private key
YCP_PUBLIC_KEY=pub_sandbox_xxxxx     # Your public key
YCP_SANDBOX=true                      # true = sandbox, false = production
```

### Optional Variables

```env
# Webhook security (generate a random string)
YCP_WEBHOOK_SECRET=your_random_secret_here
```

### Where to Get API Keys

1. Go to [YouCanPay Dashboard](https://youcanpay.com)
2. Create an account or login
3. Navigate to **Settings > API Keys**
4. Copy your **Sandbox** keys for testing or **Live** keys for production

---

## Quick Start

### Plain Node.js / Express

```typescript
import { YouCanPayClient, CurrencyCode } from '@wiicode/youcanpay-sdk';

// Initialize client
const client = new YouCanPayClient({
  privateKey: process.env.YCP_PRIVATE_KEY!,
  publicKey: process.env.YCP_PUBLIC_KEY!,
  sandbox: process.env.YCP_SANDBOX === 'true',
});

// Create a payment
async function createPayment() {
  const { token } = await client.createToken({
    amount: 50000,           // 500.00 MAD (in centimes)
    currency: CurrencyCode.MAD,
    customerIp: '192.168.1.1',
    successUrl: 'https://myapp.com/payment/success',
    errorUrl: 'https://myapp.com/payment/error',
    // orderId: 'order-123', // Optional - auto-generated UUID if not provided
  });

  // Redirect user to YouCanPay checkout
  const paymentUrl = client.getPaymentUrl(token.id);
  return paymentUrl;
}
```

### NestJS Integration

#### Option 1: Static Configuration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { YouCanPayModule } from '@wiicode/youcanpay-sdk';

@Module({
  imports: [
    YouCanPayModule.forRoot({
      privateKey: 'pri_sandbox_xxxxx',
      publicKey: 'pub_sandbox_xxxxx',
      sandbox: true,
    }),
  ],
})
export class AppModule {}
```

#### Option 2: Async Configuration (Recommended)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { YouCanPayModule } from '@wiicode/youcanpay-sdk';

@Module({
  imports: [
    ConfigModule.forRoot(),
    YouCanPayModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        privateKey: config.get('YCP_PRIVATE_KEY')!,
        publicKey: config.get('YCP_PUBLIC_KEY')!,
        sandbox: config.get('YCP_SANDBOX') === 'true',
      }),
    }),
  ],
})
export class AppModule {}
```

#### Using the Service

```typescript
// payments.service.ts
import { Injectable } from '@nestjs/common';
import { YouCanPayService, CurrencyCode } from '@wiicode/youcanpay-sdk';

@Injectable()
export class PaymentsService {
  constructor(private readonly youcanpay: YouCanPayService) {}

  async createPayment(orderId: string, amount: number, customerIp: string) {
    const { token } = await this.youcanpay.createToken({
      orderId,
      amount,
      currency: CurrencyCode.MAD,
      customerIp,
      successUrl: 'https://myapp.com/success',
      errorUrl: 'https://myapp.com/error',
    });

    return {
      tokenId: token.id,
      paymentUrl: this.youcanpay.getPaymentUrl(token.id),
    };
  }
}
```

---

## Complete Payment Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │     │ Your App │     │   SDK    │     │ YouCanPay│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │ 1. Click Pay   │                │                │
     │───────────────>│                │                │
     │                │ 2. createToken │                │
     │                │───────────────>│                │
     │                │                │ 3. POST /tokenize
     │                │                │───────────────>│
     │                │                │<───────────────│
     │                │<───────────────│   { token }    │
     │                │                │                │
     │                │ 4. Save to DB (PENDING)         │
     │                │                │                │
     │ 5. Redirect to paymentUrl       │                │
     │<───────────────│                │                │
     │                │                │                │
     │ 6. User pays on YouCanPay       │                │
     │────────────────────────────────────────────────>│
     │                │                │                │
     │                │ 7. Webhook: transaction.paid    │
     │                │<───────────────────────────────│
     │                │ 8. Update DB (COMPLETED)       │
     │                │                │                │
     │ 9. Redirect back               │                │
     │<────────────────────────────────────────────────│
     │                │                │                │
     │ 10. Verify     │                │                │
     │───────────────>│ 11. Check DB   │                │
     │<───────────────│                │                │
     │   Success!     │                │                │
```

### Step-by-Step Implementation

#### Step 1-4: Create Payment

```typescript
// Create payment and store in database
async function initiatePayment(userId: string, amount: number) {
  const orderId = generateOrderId(); // e.g., UUID

  // Save to database first
  await db.payment.create({
    orderId,
    amount,
    currency: 'MAD',
    userId,
    status: 'PENDING',
  });

  // Create token with YouCanPay
  const { token } = await client.createToken({
    orderId,
    amount,
    currency: CurrencyCode.MAD,
    customerIp: getClientIp(),
    successUrl: `https://myapp.com/payment/success`,
    errorUrl: `https://myapp.com/payment/error`,
  });

  // Update with token ID
  await db.payment.update({
    where: { orderId },
    data: { tokenId: token.id },
  });

  return client.getPaymentUrl(token.id);
}
```

#### Step 7-8: Handle Webhook

```typescript
import { parseWebhookPayload, verifyWebhookSecret } from '@wiicode/youcanpay-sdk';

app.post('/webhook', async (req, res) => {
  // Verify webhook secret
  const isValid = verifyWebhookSecret({
    secret: process.env.YCP_WEBHOOK_SECRET!,
    query: req.query,
  });

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  // Parse webhook payload
  const webhook = parseWebhookPayload(req.body);

  // Update database
  await db.payment.update({
    where: { orderId: webhook.orderId },
    data: {
      status: webhook.isSuccess ? 'COMPLETED' : 'FAILED',
      transactionId: webhook.transactionId,
    },
  });

  res.json({ received: true });
});
```

#### Step 10-11: Verify Payment

```typescript
app.get('/payment/success', async (req, res) => {
  const { order_id, transaction_id } = req.query;

  // NEVER trust URL params - verify from database
  const payment = await db.payment.findUnique({
    where: { orderId: order_id },
  });

  if (payment?.status === 'COMPLETED') {
    // Payment verified!
    res.render('success', { payment });
  } else {
    // Still pending or failed
    res.render('pending');
  }
});
```

---

## API Reference

### YouCanPayClient / YouCanPayService Methods

#### `createToken(params): Promise<TokenResponse>`

Create a payment token.

```typescript
const { token } = await client.createToken({
  amount: number,            // Amount in centimes (5000 = 50.00 MAD)
  currency: CurrencyCode,    // 'MAD' | 'USD' | 'EUR'
  customerIp: string,        // Customer's IP address
  successUrl: string,        // Redirect URL on success
  orderId?: string,          // Optional - auto-generated UUID if not provided
  errorUrl?: string,         // Redirect URL on error
  customer?: {               // Optional customer info
    name?: string,
    email?: string,
    phone?: string,
    address?: string,
    city?: string,
    state?: string,
    zip_code?: string,
    country_code?: string,
  },
  metadata?: Record<string, string>,  // Custom data
});
```

#### `getPaymentUrl(tokenId, lang?): string`

Get the YouCanPay checkout page URL.

```typescript
const url = client.getPaymentUrl(token.id, 'fr'); // 'en' | 'fr' | 'ar'
// Returns: https://youcanpay.com/sandbox/payment-form/{tokenId}?lang=fr
```

#### `getTransaction(transactionId): Promise<Transaction>`

Fetch transaction details from YouCanPay.

```typescript
const transaction = await client.getTransaction('txn-123');
// { id, order_id, amount, currency, status, created_at, ... }
```

#### `payWithCreditCard(params): Promise<PaymentResponse>`

Process card payment server-side (for PCI-compliant setups).

```typescript
const result = await client.payWithCreditCard({
  tokenId: string,
  creditCard: string,      // Card number
  expireDate: string,      // MM/YY
  cvv: string,
  cardHolderName: string,
});
```

#### `payWithCashPlus(params): Promise<CashPlusPaymentResponse>`

Initialize CashPlus payment.

```typescript
const result = await client.payWithCashPlus({
  tokenId: string,
});
```

### Standalone Functions

#### Webhook Functions

```typescript
import {
  parseWebhookPayload,
  verifyWebhookSecret,
  verifyWebhookHMAC,
  createWebhookSignature,
} from '@wiicode/youcanpay-sdk';

// Parse YouCanPay webhook payload
const webhook = parseWebhookPayload(requestBody);
// Returns: ParsedWebhookPayload

// Verify webhook secret from query parameter
const isValid = verifyWebhookSecret({
  secret: 'your-secret',
  query: { secret: '...' },      // From URL query
  headers: { ... },               // Or from headers
});

// HMAC verification (if YouCanPay adds this)
const isValid = verifyWebhookHMAC(payload, signature, secret, 'sha256');

// Create HMAC signature
const signature = createWebhookSignature(payload, secret);
```

#### Validation Functions

```typescript
import {
  validateAmount,
  validateCurrency,
  validateRedirectURL,
  validateOrderId,
  validateIP,
  validateEmail,
  validatePaymentInput,
} from '@wiicode/youcanpay-sdk';

// All return: { valid: boolean, error?: string }

validateAmount(5000);                    // { valid: true }
validateAmount(50);                      // { valid: false, error: 'Amount must be at least 100' }

validateCurrency('MAD');                 // { valid: true }
validateCurrency('GBP');                 // { valid: false, error: 'Currency must be...' }

validateRedirectURL('https://app.com'); // { valid: true }
validateRedirectURL('javascript:...');  // { valid: false }

// Validate all at once
const result = validatePaymentInput({
  amount: 5000,
  currency: 'MAD',
  orderId: 'order-123',
  successUrl: 'https://myapp.com/success',
});
```

#### Utility Functions

```typescript
import {
  toCentimes,
  fromCentimes,
  formatAmount,
  sanitizeString,
  SUPPORTED_CURRENCIES,
} from '@wiicode/youcanpay-sdk';

toCentimes(50.00);              // 5000
fromCentimes(5000);             // 50.00
formatAmount(5000, 'MAD');      // "50.00 MAD"
sanitizeString('<script>');     // "script"
SUPPORTED_CURRENCIES;           // ['MAD', 'USD', 'EUR']
```

### TypeScript Interfaces

```typescript
import type {
  YouCanPayOptions,
  CreateTokenParams,
  TokenResponse,
  Transaction,
  ParsedWebhookPayload,
  ValidationResult,
  CurrencyCode,
} from '@wiicode/youcanpay-sdk';
```

---

## Webhook Handling

### Webhook Payload Structure

YouCanPay sends webhooks with this structure:

```json
{
  "id": "webhook-uuid",
  "event_name": "transaction.paid",
  "sandbox": true,
  "payload": {
    "transaction": {
      "id": "txn-uuid",
      "status": 1,
      "order_id": "your-order-id",
      "amount": "50000",
      "currency": "MAD",
      "created_at": "2024-01-01T12:00:00.000000Z"
    },
    "payment_method": { ... },
    "customer": { ... }
  }
}
```

### Parsing with SDK

```typescript
import { parseWebhookPayload, ParsedWebhookPayload } from '@wiicode/youcanpay-sdk';

const webhook: ParsedWebhookPayload = parseWebhookPayload(requestBody);

console.log(webhook.transactionId);  // 'txn-uuid'
console.log(webhook.orderId);        // 'your-order-id'
console.log(webhook.amount);         // 50000
console.log(webhook.isSuccess);      // true
console.log(webhook.status);         // 'paid' | 'failed' | 'refunded'
console.log(webhook.eventName);      // 'transaction.paid'
```

### NestJS Webhook Handler

```typescript
import {
  Controller,
  Post,
  Body,
  Query,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import {
  ParseWebhookPipe,
  ParsedWebhookPayload,
  verifyWebhookSecret,
} from '@wiicode/youcanpay-sdk';

@Controller('payments')
export class PaymentsController {
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body(ParseWebhookPipe) webhook: ParsedWebhookPayload,
    @Query() query: Record<string, string>,
  ) {
    // Verify secret
    if (!verifyWebhookSecret({ secret: process.env.YCP_WEBHOOK_SECRET!, query })) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    // Process payment
    if (webhook.isSuccess) {
      await this.paymentService.markCompleted(webhook.orderId, webhook.transactionId);
    } else {
      await this.paymentService.markFailed(webhook.orderId);
    }

    return { received: true };
  }
}
```

### Webhook Security Checklist

- [ ] Add secret to webhook URL: `https://myapp.com/webhook?secret=xxx`
- [ ] Verify secret before processing
- [ ] Verify transaction with `getTransaction()` API
- [ ] Check idempotency (don't process same webhook twice)
- [ ] Verify amount matches your database
- [ ] Return 200 OK quickly (process async if needed)
- [ ] Log webhooks for debugging (sanitize sensitive data)

---

## Database Integration

### Recommended Schema

```sql
CREATE TABLE payments (
  id            UUID PRIMARY KEY,
  order_id      VARCHAR(255) UNIQUE NOT NULL,
  token_id      VARCHAR(255),
  transaction_id VARCHAR(255),
  amount        INTEGER NOT NULL,           -- In centimes
  currency      VARCHAR(3) NOT NULL,
  status        VARCHAR(20) NOT NULL,       -- PENDING, COMPLETED, FAILED
  user_id       UUID NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

### Prisma Example

```prisma
// schema.prisma
model Payment {
  id            String   @id @default(uuid())
  orderId       String   @unique @map("order_id")
  tokenId       String?  @map("token_id")
  transactionId String?  @map("transaction_id")
  amount        Int
  currency      String
  status        String   @default("PENDING")
  userId        String   @map("user_id")
  metadata      Json?
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("payments")
}
```

```typescript
// Usage
const payment = await prisma.payment.create({
  data: {
    orderId: 'order-123',
    amount: 50000,
    currency: 'MAD',
    userId: user.id,
    status: 'PENDING',
  },
});
```

### TypeORM Example (Complete NestJS Entity)

```typescript
// payment-status.enum.ts
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// payment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentStatus } from './payment-status.enum';
import { User } from '../users/user.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, name: 'order_id' })
  orderId: string;

  @Column({ nullable: true, name: 'token_id' })
  tokenId: string;

  @Column({ nullable: true, name: 'transaction_id' })
  transactionId: string;

  @Column({ type: 'integer' })
  amount: number;  // In centimes

  @Column({ length: 3 })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Complete Payment Service Example

```typescript
// payments.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YouCanPayService, CurrencyCode, parseWebhookPayload, ParsedWebhookPayload } from '@wiicode/youcanpay-sdk';
import { Payment } from './payment.entity';
import { PaymentStatus } from './payment-status.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly youcanpay: YouCanPayService,
  ) {}

  async createPayment(userId: string, amount: number, currency: string, customerIp: string) {
    const orderId = uuidv4();

    // 1. Save payment to database
    const payment = this.paymentRepo.create({
      orderId,
      amount,
      currency,
      userId,
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepo.save(payment);

    // 2. Create token with YouCanPay
    const { token } = await this.youcanpay.createToken({
      orderId,
      amount,
      currency: currency as CurrencyCode,
      customerIp,
      successUrl: `${process.env.APP_URL}/payments/success`,
      errorUrl: `${process.env.APP_URL}/payments/error`,
    });

    // 3. Update payment with token ID
    payment.tokenId = token.id;
    await this.paymentRepo.save(payment);

    return {
      paymentId: payment.id,
      paymentUrl: this.youcanpay.getPaymentUrl(token.id),
    };
  }

  async handleWebhook(payload: unknown) {
    const webhook = parseWebhookPayload(payload);

    const payment = await this.paymentRepo.findOne({
      where: { orderId: webhook.orderId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Idempotency check
    if (payment.status === PaymentStatus.COMPLETED) {
      return { received: true, already_processed: true };
    }

    // Update payment status
    payment.transactionId = webhook.transactionId;
    payment.status = webhook.isSuccess ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;
    await this.paymentRepo.save(payment);

    return { received: true };
  }

  async getPaymentByOrderId(orderId: string) {
    return this.paymentRepo.findOne({ where: { orderId } });
  }

  async getUserPayments(userId: string) {
    return this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
```

### Mongoose Example (MongoDB)

```typescript
// payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ required: true, unique: true })
  orderId: string;

  @Prop()
  tokenId: string;

  @Prop()
  transactionId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ required: true })
  userId: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
```

### Status Flow

```
PENDING ──────┬──────> COMPLETED (webhook: transaction.paid)
              │
              └──────> FAILED (webhook: transaction.failed)
```

---

## Validation & Security

### Amount Handling

YouCanPay uses **centimes** (smallest currency unit):

```typescript
import { toCentimes, fromCentimes, formatAmount } from '@wiicode/youcanpay-sdk';

// User enters: 50.00 MAD
const centimes = toCentimes(50.00);  // 5000

// Display from API response
const display = formatAmount(5000, 'MAD');  // "50.00 MAD"
```

### Input Validation

```typescript
import { validatePaymentInput } from '@wiicode/youcanpay-sdk';

const validation = validatePaymentInput({
  amount: userInput.amount,
  currency: userInput.currency,
  successUrl: userInput.successUrl,
  errorUrl: userInput.errorUrl,
});

if (!validation.valid) {
  throw new BadRequestException(validation.error);
}
```

### Security Best Practices

1. **Never trust redirect URL params** - Always verify payment status from your database
2. **Validate webhook secrets** - Reject webhooks without valid secret
3. **Verify with API** - Call `getTransaction()` to confirm transaction exists
4. **Check amounts** - Ensure webhook amount matches your database
5. **Idempotency** - Don't process the same webhook twice
6. **HTTPS only** - Never use HTTP in production
7. **Sanitize inputs** - Use `sanitizeString()` for user inputs
8. **URL whitelist** - Validate redirect URLs against allowed domains

---

## Error Handling

### YouCanPayError

```typescript
import { YouCanPayError, ErrorCodes } from '@wiicode/youcanpay-sdk';

try {
  await client.createToken({ ... });
} catch (error) {
  if (error instanceof YouCanPayError) {
    console.log(error.code);     // ErrorCodes.VALIDATION_ERROR
    console.log(error.status);   // 422
    console.log(error.message);  // "The amount field is required"
    console.log(error.details);  // { amount: ['required'] }
  }
}
```

### Error Codes

```typescript
enum ErrorCodes {
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

### NestJS Exception Filter

```typescript
@Catch(YouCanPayError)
export class YouCanPayExceptionFilter implements ExceptionFilter {
  catch(exception: YouCanPayError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    response.status(exception.status || 500).json({
      error: exception.code,
      message: exception.message,
    });
  }
}
```

---

## Testing

### Sandbox Mode

Always use sandbox for testing:

```typescript
const client = new YouCanPayClient({
  privateKey: 'pri_sandbox_xxxxx',
  publicKey: 'pub_sandbox_xxxxx',
  sandbox: true,  // <-- Important!
});
```

### Test Card Numbers

| Card Number | Result |
|-------------|--------|
| `4000 0000 0000 0002` | Success |
| `4000 0000 0000 0010` | 3D Secure |
| `4000 0000 0000 0036` | Declined |

Use any future expiry date and any 3-digit CVV.

### Mocking the SDK

```typescript
// Jest mock
jest.mock('@wiicode/youcanpay-sdk', () => ({
  YouCanPayClient: jest.fn().mockImplementation(() => ({
    createToken: jest.fn().mockResolvedValue({
      token: { id: 'test-token-123' },
    }),
    getPaymentUrl: jest.fn().mockReturnValue('https://youcanpay.com/test'),
    getTransaction: jest.fn().mockResolvedValue({
      id: 'txn-123',
      order_id: 'order-123',
      amount: 5000,
      status: 'paid',
    }),
  })),
}));
```

### Testing Webhooks Locally

Use [ngrok](https://ngrok.com) to expose your local server:

```bash
ngrok http 3000
# Returns: https://abc123.ngrok.io

# Set webhook URL in YouCanPay dashboard:
# https://abc123.ngrok.io/webhook?secret=your-secret
```

---

## Configuration Options

```typescript
interface YouCanPayOptions {
  privateKey: string;        // Required: Your private API key
  publicKey: string;         // Required: Your public API key
  sandbox?: boolean;         // Use sandbox environment (default: false)
  timeout?: number;          // Request timeout in ms (default: 30000)
  logging?: {                // Optional audit logging
    enabled: boolean;
    storage: 'database' | 'custom' | 'none';
    handler?: (log: YouCanPayLogEntry) => Promise<void>;
  };
}
```

---

## Support

- [GitHub Repository](https://github.com/eeyuub/youcanpay)
- [Report Issues](https://github.com/eeyuub/youcanpay/issues)
- [npm Package](https://www.npmjs.com/package/@wiicode/youcanpay-sdk)
- [YouCanPay Documentation](https://youcanpay.com/docs)

## Author

**WiiCode** - [@eeyuub](https://github.com/eeyuub)

## License

MIT - see [LICENSE](https://github.com/eeyuub/youcanpay/blob/master/LICENSE) for details.
