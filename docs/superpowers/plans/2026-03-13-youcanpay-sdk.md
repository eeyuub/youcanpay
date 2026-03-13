# YouCanPay SDK Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready YouCanPay SDK for Node.js/NestJS with sandbox support, plus a test backend and frontend.

**Architecture:** Three separate folders - SDK package (framework-agnostic core + NestJS wrapper), NestJS backend with Prisma/PostgreSQL, React/Vite frontend. Backend references SDK via local path. TDD approach throughout.

**Tech Stack:** TypeScript, Axios, NestJS, Prisma, PostgreSQL, React, Vite, Jest, Vitest

---

## File Structure Overview

### SDK Package (`package/`)
```
package/
├── src/
│   ├── index.ts                    # Public exports
│   ├── constants.ts                # Base URLs, injection tokens
│   ├── client.ts                   # Core YouCanPayClient class
│   ├── interfaces/
│   │   ├── index.ts
│   │   ├── options.interface.ts    # YouCanPayOptions, YouCanPayAsyncOptions
│   │   ├── token.interface.ts      # CreateTokenParams, TokenResponse, CustomerInfo
│   │   ├── payment.interface.ts    # PayCreditCardParams, PaymentResponse, etc.
│   │   ├── transaction.interface.ts
│   │   └── webhook.interface.ts
│   ├── enums/
│   │   ├── index.ts
│   │   ├── currency.enum.ts
│   │   └── lang.enum.ts
│   ├── errors/
│   │   ├── index.ts
│   │   └── youcanpay.error.ts
│   ├── logging/
│   │   ├── index.ts
│   │   ├── interfaces.ts           # YouCanPayLogEntry, YouCanPayLoggingOptions
│   │   ├── sanitizer.ts            # Data sanitization utilities
│   │   └── logger.ts               # YouCanPayLogger class
│   └── nestjs/
│       ├── index.ts
│       ├── youcanpay.module.ts
│       ├── youcanpay.service.ts
│       └── decorators.ts
├── migrations/
│   ├── prisma/
│   │   └── youcanpay-log.prisma
│   └── typeorm/
│       └── YouCanPayLog.entity.ts
├── test/
│   ├── client.spec.ts
│   ├── sanitizer.spec.ts
│   ├── logger.spec.ts
│   └── nestjs/
│       └── youcanpay.module.spec.ts
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── jest.config.js
└── README.md
```

### Backend (`backend/`)
```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   ├── register.dto.ts
│   │   │   └── login.dto.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── guards/
│   │       └── jwt-auth.guard.ts
│   └── payments/
│       ├── payments.module.ts
│       ├── payments.controller.ts
│       ├── payments.service.ts
│       └── dto/
│           └── create-payment.dto.ts
├── prisma/
│   └── schema.prisma
├── test/
│   ├── auth.e2e-spec.ts
│   └── payments.e2e-spec.ts
├── .env.example
├── package.json
├── tsconfig.json
├── nest-cli.json
└── jest.config.js
```

### Frontend (`frontend/`)
```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── api/
│   │   └── payments.ts
│   ├── components/
│   │   ├── PaymentForm.tsx
│   │   └── PaymentResult.tsx
│   ├── hooks/
│   │   └── useYouCanPay.ts
│   └── types/
│       └── ycpay.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## Chunk 1: SDK Package Core

### Task 1: Initialize SDK Package

**Files:**
- Create: `package/package.json`
- Create: `package/tsconfig.json`
- Create: `package/tsconfig.build.json`
- Create: `package/jest.config.js`

- [ ] **Step 1: Create package directory**

```bash
mkdir -p package
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "youcanpay-sdk",
  "version": "1.0.0",
  "description": "Production-ready YouCanPay SDK for Node.js and NestJS",
  "author": "",
  "license": "MIT",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "migrations"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "lint": "eslint 'src/**/*.ts'",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["youcanpay", "nestjs", "payment", "morocco", "mad", "cashplus"],
  "peerDependencies": {
    "@nestjs/common": "^9.0.0 || ^10.0.0 || ^11.0.0",
    "@nestjs/core": "^9.0.0 || ^10.0.0 || ^11.0.0",
    "reflect-metadata": "^0.1.13 || ^0.2.0"
  },
  "peerDependenciesMeta": {
    "@nestjs/common": { "optional": true },
    "@nestjs/core": { "optional": true },
    "reflect-metadata": { "optional": true }
  },
  "dependencies": {
    "axios": "^1.6.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "jest": "^29.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

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
    "strictNullChecks": true,
    "noImplicitAny": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 4: Create tsconfig.build.json**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*.spec.ts"]
}
```

- [ ] **Step 5: Create jest.config.js**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts', '!src/**/index.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
```

- [ ] **Step 6: Install dependencies**

Run: `cd package && npm install`

- [ ] **Step 7: Commit**

```bash
git add package/
git commit -m "chore(package): initialize SDK package structure"
```

---

### Task 2: Create Constants and Enums

**Files:**
- Create: `package/src/constants.ts`
- Create: `package/src/enums/currency.enum.ts`
- Create: `package/src/enums/lang.enum.ts`
- Create: `package/src/enums/index.ts`

- [ ] **Step 1: Create constants.ts**

```typescript
export const YOUCANPAY_OPTIONS = 'YOUCANPAY_OPTIONS';
export const YOUCANPAY_BASE_URL = 'https://youcanpay.com/api';
export const YOUCANPAY_SANDBOX_BASE_URL = 'https://youcanpay.com/sandbox/api';
export const YOUCANPAY_PAYMENT_URL = 'https://youcanpay.com/payment-form';
export const YOUCANPAY_SANDBOX_PAYMENT_URL = 'https://youcanpay.com/sandbox/payment-form';
export const YOUCANPAY_TRANSACTION_API_URL = 'https://api.youcanpay.com';
export const YOUCANPAY_SANDBOX_TRANSACTION_API_URL = 'https://api.youcanpay.com'; // Same for sandbox
export const YOUCANPAY_JS_SCRIPT = 'https://youcanpay.com/js/ycpay.js';
```

- [ ] **Step 2: Create enums directory**

```bash
mkdir -p package/src/enums
```

- [ ] **Step 3: Create currency.enum.ts**

```typescript
export enum CurrencyCode {
  MAD = 'MAD',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  SAR = 'SAR',
  AED = 'AED',
}
```

- [ ] **Step 4: Create lang.enum.ts**

```typescript
export enum Lang {
  AR = 'ar',
  EN = 'en',
  FR = 'fr',
}
```

- [ ] **Step 5: Create enums/index.ts**

```typescript
export * from './currency.enum';
export * from './lang.enum';
```

- [ ] **Step 6: Commit**

```bash
git add package/src/
git commit -m "feat(package): add constants and enums"
```

---

### Task 3: Create Error Classes

**Files:**
- Create: `package/src/errors/youcanpay.error.ts`
- Create: `package/src/errors/index.ts`

- [ ] **Step 1: Create errors directory**

```bash
mkdir -p package/src/errors
```

- [ ] **Step 2: Create youcanpay.error.ts**

```typescript
export class YouCanPayError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'YouCanPayError';
    Object.setPrototypeOf(this, YouCanPayError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
```

- [ ] **Step 3: Create errors/index.ts**

```typescript
export * from './youcanpay.error';
```

- [ ] **Step 4: Commit**

```bash
git add package/src/errors/
git commit -m "feat(package): add YouCanPayError class"
```

---

### Task 4: Create Logging Interfaces First (Dependency for Options)

**Files:**
- Create: `package/src/logging/interfaces.ts`

- [ ] **Step 1: Create logging directory**

```bash
mkdir -p package/src/logging
```

- [ ] **Step 2: Create logging/interfaces.ts**

```typescript
export type LogAction = 'createToken' | 'payWithCreditCard' | 'payWithCashPlus' | 'webhook' | 'getTransaction';
export type LogStatus = 'success' | 'error';
export type LogStorage = 'database' | 'custom' | 'none';

export interface YouCanPayLogEntry {
  id: string;
  action: LogAction;
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
  status: LogStatus;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface YouCanPayLogRepository {
  create(data: Omit<YouCanPayLogEntry, 'id'>): Promise<YouCanPayLogEntry>;
}

export interface YouCanPayLoggingOptions {
  enabled: boolean;
  storage?: LogStorage;
  handler?: (log: YouCanPayLogEntry) => Promise<void>;
  repository?: YouCanPayLogRepository;
}
```

- [ ] **Step 3: Commit**

```bash
git add package/src/logging/
git commit -m "feat(package): add logging interfaces (dependency for options)"
```

---

### Task 5: Create Interfaces

**Files:**
- Create: `package/src/interfaces/options.interface.ts`
- Create: `package/src/interfaces/token.interface.ts`
- Create: `package/src/interfaces/payment.interface.ts`
- Create: `package/src/interfaces/transaction.interface.ts`
- Create: `package/src/interfaces/webhook.interface.ts`
- Create: `package/src/interfaces/index.ts`

- [ ] **Step 1: Create interfaces directory**

```bash
mkdir -p package/src/interfaces
```

- [ ] **Step 2: Create options.interface.ts**

```typescript
import { YouCanPayLoggingOptions } from '../logging/interfaces';

export interface YouCanPayOptions {
  privateKey: string;
  publicKey: string;
  sandbox?: boolean;
  timeout?: number;
  logging?: YouCanPayLoggingOptions;
}

export interface YouCanPayAsyncOptions {
  useFactory: (...args: unknown[]) => Promise<YouCanPayOptions> | YouCanPayOptions;
  inject?: unknown[];
  imports?: unknown[];
}
```

- [ ] **Step 3: Create token.interface.ts**

```typescript
import { CurrencyCode } from '../enums';

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
  amount: number;
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

- [ ] **Step 4: Create payment.interface.ts**

```typescript
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
```

- [ ] **Step 5: Create transaction.interface.ts**

```typescript
export interface Transaction {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, string>;
}
```

- [ ] **Step 6: Create webhook.interface.ts**

```typescript
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

- [ ] **Step 7: Create interfaces/index.ts**

```typescript
export * from './options.interface';
export * from './token.interface';
export * from './payment.interface';
export * from './transaction.interface';
export * from './webhook.interface';
```

- [ ] **Step 8: Commit**

```bash
git add package/src/interfaces/
git commit -m "feat(package): add TypeScript interfaces"
```

---

### Task 6: Create Sanitizer

**Files:**
- Create: `package/src/logging/sanitizer.ts`
- Create: `package/test/sanitizer.spec.ts`

- [ ] **Step 1: Create test directory**

```bash
mkdir -p package/test
```

- [ ] **Step 2: Write failing test for sanitizer**

```typescript
// package/test/sanitizer.spec.ts
import { sanitizeData } from '../src/logging/sanitizer';

describe('sanitizeData', () => {
  it('should mask credit card number keeping last 4 digits', () => {
    const data = { creditCard: '4111111111111234' };
    const result = sanitizeData(data);
    expect(result.creditCard).toBe('************1234');
  });

  it('should completely mask CVV', () => {
    const data = { cvv: '123' };
    const result = sanitizeData(data);
    expect(result.cvv).toBe('***');
  });

  it('should redact privateKey', () => {
    const data = { privateKey: 'pri_secret_key_123' };
    const result = sanitizeData(data);
    expect(result.privateKey).toBe('[REDACTED]');
  });

  it('should redact password', () => {
    const data = { password: 'mysecretpassword' };
    const result = sanitizeData(data);
    expect(result.password).toBe('[REDACTED]');
  });

  it('should handle nested objects', () => {
    const data = {
      payment: {
        creditCard: '4111111111111234',
        cvv: '123',
      },
    };
    const result = sanitizeData(data);
    expect(result.payment.creditCard).toBe('************1234');
    expect(result.payment.cvv).toBe('***');
  });

  it('should not modify non-sensitive fields', () => {
    const data = { orderId: '123', amount: 5000 };
    const result = sanitizeData(data);
    expect(result).toEqual({ orderId: '123', amount: 5000 });
  });

  it('should handle null and undefined values', () => {
    const data = { creditCard: null, cvv: undefined, name: 'test' };
    const result = sanitizeData(data);
    expect(result.creditCard).toBeNull();
    expect(result.cvv).toBeUndefined();
    expect(result.name).toBe('test');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd package && npm test -- --testPathPattern=sanitizer`
Expected: FAIL with "Cannot find module '../src/logging/sanitizer'"

- [ ] **Step 5: Implement sanitizer.ts**

```typescript
const SENSITIVE_FIELDS = ['privateKey', 'password', 'pri_key'] as const;
const CARD_FIELDS = ['creditCard', 'credit_card', 'cardNumber', 'card_number'] as const;
const CVV_FIELDS = ['cvv', 'cvc', 'securityCode', 'security_code'] as const;

type SensitiveField = (typeof SENSITIVE_FIELDS)[number];
type CardField = (typeof CARD_FIELDS)[number];
type CvvField = (typeof CVV_FIELDS)[number];

function isSensitiveField(key: string): key is SensitiveField {
  return SENSITIVE_FIELDS.includes(key as SensitiveField);
}

function isCardField(key: string): key is CardField {
  return CARD_FIELDS.includes(key as CardField);
}

function isCvvField(key: string): key is CvvField {
  return CVV_FIELDS.includes(key as CvvField);
}

function maskCardNumber(value: string): string {
  if (value.length < 4) return '****';
  const lastFour = value.slice(-4);
  const masked = '*'.repeat(value.length - 4);
  return masked + lastFour;
}

export function sanitizeData<T extends Record<string, unknown>>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (isSensitiveField(key)) {
      result[key] = '[REDACTED]';
    } else if (isCardField(key) && typeof value === 'string') {
      result[key] = maskCardNumber(value);
    } else if (isCvvField(key)) {
      result[key] = '***';
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeData(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeData(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd package && npm test -- --testPathPattern=sanitizer`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package/src/logging/ package/test/
git commit -m "feat(package): add logging interfaces and data sanitizer"
```

---

### Task 7: Create Logger

**Files:**
- Create: `package/src/logging/logger.ts`
- Create: `package/src/logging/index.ts`
- Create: `package/test/logger.spec.ts`

- [ ] **Step 1: Write failing test for logger**

```typescript
// package/test/logger.spec.ts
import { YouCanPayLogger } from '../src/logging/logger';
import { YouCanPayLoggingOptions, YouCanPayLogEntry } from '../src/logging/interfaces';

describe('YouCanPayLogger', () => {
  describe('when logging is disabled', () => {
    it('should not call handler', async () => {
      const handler = jest.fn();
      const options: YouCanPayLoggingOptions = {
        enabled: false,
        storage: 'custom',
        handler,
      };
      const logger = new YouCanPayLogger(options);

      await logger.log('createToken', { orderId: '123' }, { token: { id: 'tok_123' } }, 'success', 100);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('when using custom handler', () => {
    it('should call handler with sanitized data', async () => {
      const handler = jest.fn();
      const options: YouCanPayLoggingOptions = {
        enabled: true,
        storage: 'custom',
        handler,
      };
      const logger = new YouCanPayLogger(options);

      await logger.log(
        'payWithCreditCard',
        { creditCard: '4111111111111234', cvv: '123' },
        { success: true },
        'success',
        150,
      );

      expect(handler).toHaveBeenCalledTimes(1);
      const logEntry: YouCanPayLogEntry = handler.mock.calls[0][0];
      expect(logEntry.action).toBe('payWithCreditCard');
      expect(logEntry.request.creditCard).toBe('************1234');
      expect(logEntry.request.cvv).toBe('***');
      expect(logEntry.status).toBe('success');
      expect(logEntry.durationMs).toBe(150);
    });
  });

  describe('when using database storage', () => {
    it('should call repository.create', async () => {
      const mockRepository = {
        create: jest.fn().mockResolvedValue({ id: 'log_123' }),
      };
      const options: YouCanPayLoggingOptions = {
        enabled: true,
        storage: 'database',
        repository: mockRepository,
      };
      const logger = new YouCanPayLogger(options);

      await logger.log('createToken', { orderId: '123' }, { token: { id: 'tok_123' } }, 'success', 100);

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('when handler throws error', () => {
    it('should not propagate error (fire-and-forget)', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      const options: YouCanPayLoggingOptions = {
        enabled: true,
        storage: 'custom',
        handler,
      };
      const logger = new YouCanPayLogger(options);

      // Should not throw
      await expect(
        logger.log('createToken', { orderId: '123' }, { token: { id: 'tok_123' } }, 'success', 100),
      ).resolves.toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd package && npm test -- --testPathPattern=logger`
Expected: FAIL with "Cannot find module '../src/logging/logger'"

- [ ] **Step 3: Implement logger.ts**

```typescript
import { v4 as uuidv4 } from 'uuid';
import { YouCanPayLoggingOptions, YouCanPayLogEntry, LogAction, LogStatus } from './interfaces';
import { sanitizeData } from './sanitizer';

export class YouCanPayLogger {
  constructor(private readonly options?: YouCanPayLoggingOptions) {}

  async log(
    action: LogAction,
    request: Record<string, unknown>,
    response: Record<string, unknown> | undefined,
    status: LogStatus,
    durationMs?: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.options?.enabled) {
      return;
    }

    const logEntry: YouCanPayLogEntry = {
      id: uuidv4(),
      action,
      request: sanitizeData(request),
      response: response ? sanitizeData(response) : undefined,
      status,
      durationMs,
      metadata,
      createdAt: new Date(),
    };

    try {
      if (this.options.storage === 'custom' && this.options.handler) {
        await this.options.handler(logEntry);
      } else if (this.options.storage === 'database' && this.options.repository) {
        await this.options.repository.create(logEntry);
      }
    } catch {
      // Fire-and-forget: logging failures should not affect main operation
    }
  }
}
```

- [ ] **Step 4: Create logging/index.ts**

```typescript
export * from './interfaces';
export * from './sanitizer';
export * from './logger';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd package && npm test -- --testPathPattern=logger`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package/src/logging/ package/test/
git commit -m "feat(package): add YouCanPayLogger with fire-and-forget error handling"
```

---

### Task 8: Create Core Client - Tests First

**Files:**
- Create: `package/test/client.spec.ts`

- [ ] **Step 1: Write failing tests for YouCanPayClient**

```typescript
// package/test/client.spec.ts
import axios from 'axios';
import { YouCanPayClient } from '../src/client';
import { YouCanPayError, ErrorCodes } from '../src/errors';
import { CurrencyCode, Lang } from '../src/enums';
import {
  YOUCANPAY_BASE_URL,
  YOUCANPAY_SANDBOX_BASE_URL,
  YOUCANPAY_PAYMENT_URL,
  YOUCANPAY_SANDBOX_PAYMENT_URL,
} from '../src/constants';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('YouCanPayClient', () => {
  let client: YouCanPayClient;
  let sandboxClient: YouCanPayClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockedAxios.create.mockReturnValue({
      post: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<typeof axios>);

    client = new YouCanPayClient({
      privateKey: 'pri_test_key',
      publicKey: 'pub_test_key',
      sandbox: false,
    });

    sandboxClient = new YouCanPayClient({
      privateKey: 'pri_test_key',
      publicKey: 'pub_test_key',
      sandbox: true,
    });
  });

  describe('constructor', () => {
    it('should use production URL when sandbox is false', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: YOUCANPAY_BASE_URL,
        }),
      );
    });

    it('should use sandbox URL when sandbox is true', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: YOUCANPAY_SANDBOX_BASE_URL,
        }),
      );
    });
  });

  describe('createToken', () => {
    it('should send correct form data to /tokenize', async () => {
      const mockResponse = { data: { token: { id: 'tok_123' } } };
      const httpMock = mockedAxios.create();
      (httpMock.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.createToken({
        orderId: 'order_123',
        amount: 5000,
        currency: CurrencyCode.MAD,
        customerIp: '127.0.0.1',
        successUrl: 'https://example.com/success',
        errorUrl: 'https://example.com/error',
        customer: { name: 'John Doe', email: 'john@example.com' },
        metadata: { source: 'test' },
      });

      expect(httpMock.post).toHaveBeenCalledWith('/tokenize', expect.any(URLSearchParams));
      expect(result).toEqual({ token: { id: 'tok_123' } });
    });

    it('should throw YouCanPayError on API error', async () => {
      const httpMock = mockedAxios.create();
      (httpMock.post as jest.Mock).mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 422,
          data: { message: 'Validation failed', errors: { amount: ['required'] } },
        },
      });

      await expect(
        client.createToken({
          orderId: 'order_123',
          amount: 5000,
          currency: CurrencyCode.MAD,
          customerIp: '127.0.0.1',
          successUrl: 'https://example.com/success',
        }),
      ).rejects.toThrow(YouCanPayError);
    });
  });

  describe('getPaymentUrl', () => {
    it('should return production payment URL', () => {
      const url = client.getPaymentUrl('tok_123', Lang.FR);
      expect(url).toBe(`${YOUCANPAY_PAYMENT_URL}/tok_123?lang=fr`);
    });

    it('should return sandbox payment URL', () => {
      const url = sandboxClient.getPaymentUrl('tok_123', Lang.EN);
      expect(url).toBe(`${YOUCANPAY_SANDBOX_PAYMENT_URL}/tok_123?lang=en`);
    });

    it('should default to French language', () => {
      const url = client.getPaymentUrl('tok_123');
      expect(url).toContain('lang=fr');
    });
  });

  describe('payWithCreditCard', () => {
    it('should send correct form data to /pay', async () => {
      const mockResponse = {
        data: {
          success: true,
          code: '000',
          message: 'Payment successful',
          transaction_id: 'txn_123',
          order_id: 'order_123',
        },
      };
      const httpMock = mockedAxios.create();
      (httpMock.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.payWithCreditCard({
        tokenId: 'tok_123',
        creditCard: '4111111111111111',
        expireDate: '12/25',
        cvv: '123',
        cardHolderName: 'John Doe',
      });

      expect(httpMock.post).toHaveBeenCalledWith('/pay', expect.any(URLSearchParams));
      expect(result.success).toBe(true);
      expect(result.transaction_id).toBe('txn_123');
    });
  });

  describe('payWithCashPlus', () => {
    it('should send correct form data to /cashplus/init', async () => {
      const mockResponse = {
        data: {
          success: true,
          transaction_id: 'txn_123',
          cashplus_token: 'cp_tok_123',
        },
      };
      const httpMock = mockedAxios.create();
      (httpMock.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await client.payWithCashPlus({ tokenId: 'tok_123' });

      expect(httpMock.post).toHaveBeenCalledWith('/cashplus/init', expect.any(URLSearchParams));
      expect(result.cashplus_token).toBe('cp_tok_123');
    });
  });

  describe('verifyWebhook', () => {
    it('should return true for valid payload', () => {
      const payload = {
        transaction_id: 'txn_123',
        order_id: 'order_123',
        amount: 5000,
        status: 'success',
      };
      expect(client.verifyWebhook(payload)).toBe(true);
    });

    it('should return false for invalid payload', () => {
      expect(client.verifyWebhook(null)).toBe(false);
      expect(client.verifyWebhook({})).toBe(false);
      expect(client.verifyWebhook({ transaction_id: 'txn_123' })).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd package && npm test -- --testPathPattern=client`
Expected: FAIL with "Cannot find module '../src/client'"

- [ ] **Step 3: Commit test file**

```bash
git add package/test/client.spec.ts
git commit -m "test(package): add unit tests for YouCanPayClient"
```

---

### Task 8: Implement Core Client

**Files:**
- Create: `package/src/client.ts`

- [ ] **Step 1: Implement client.ts**

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  YouCanPayOptions,
  CreateTokenParams,
  TokenResponse,
  PayCreditCardParams,
  PayCashPlusParams,
  PaymentResponse,
  CashPlusPaymentResponse,
  Transaction,
  WebhookPayload,
} from './interfaces';
import { Lang } from './enums';
import { YouCanPayError, ErrorCodes } from './errors';
import { YouCanPayLogger } from './logging';
import {
  YOUCANPAY_BASE_URL,
  YOUCANPAY_SANDBOX_BASE_URL,
  YOUCANPAY_PAYMENT_URL,
  YOUCANPAY_SANDBOX_PAYMENT_URL,
  YOUCANPAY_TRANSACTION_API_URL,
} from './constants';

export class YouCanPayClient {
  private readonly http: AxiosInstance;
  private readonly baseUrl: string;
  private readonly paymentBaseUrl: string;
  private readonly logger: YouCanPayLogger;

  constructor(protected readonly options: YouCanPayOptions) {
    this.baseUrl = options.sandbox ? YOUCANPAY_SANDBOX_BASE_URL : YOUCANPAY_BASE_URL;
    this.paymentBaseUrl = options.sandbox ? YOUCANPAY_SANDBOX_PAYMENT_URL : YOUCANPAY_PAYMENT_URL;
    this.logger = new YouCanPayLogger(options.logging);

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: options.timeout ?? 30000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  async createToken(params: CreateTokenParams): Promise<TokenResponse> {
    const startTime = Date.now();
    const form = new URLSearchParams();

    form.append('pri_key', this.options.privateKey);
    form.append('order_id', params.orderId);
    form.append('amount', String(params.amount));
    form.append('currency', params.currency);
    form.append('customer_ip', params.customerIp);
    form.append('success_url', params.successUrl);

    if (params.errorUrl) {
      form.append('error_url', params.errorUrl);
    }

    if (params.customer) {
      for (const [key, value] of Object.entries(params.customer)) {
        if (value !== undefined && value !== null) {
          form.append(`customer[${key}]`, value);
        }
      }
    }

    if (params.metadata) {
      for (const [key, value] of Object.entries(params.metadata)) {
        form.append(`metadata[${key}]`, value);
      }
    }

    try {
      const { data } = await this.http.post<TokenResponse>('/tokenize', form);
      const durationMs = Date.now() - startTime;

      await this.logger.log(
        'createToken',
        { ...params, privateKey: this.options.privateKey },
        data as unknown as Record<string, unknown>,
        'success',
        durationMs,
      );

      return data;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const youcanpayError = this.handleError(error);

      await this.logger.log(
        'createToken',
        { ...params, privateKey: this.options.privateKey },
        { error: youcanpayError.toJSON() },
        'error',
        durationMs,
      );

      throw youcanpayError;
    }
  }

  getPaymentUrl(tokenId: string, lang: Lang = Lang.FR): string {
    return `${this.paymentBaseUrl}/${tokenId}?lang=${lang}`;
  }

  async payWithCreditCard(params: PayCreditCardParams): Promise<PaymentResponse> {
    const startTime = Date.now();
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
      const durationMs = Date.now() - startTime;

      await this.logger.log(
        'payWithCreditCard',
        params as unknown as Record<string, unknown>,
        data as unknown as Record<string, unknown>,
        'success',
        durationMs,
      );

      return data;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const youcanpayError = this.handleError(error);

      await this.logger.log(
        'payWithCreditCard',
        params as unknown as Record<string, unknown>,
        { error: youcanpayError.toJSON() },
        'error',
        durationMs,
      );

      throw youcanpayError;
    }
  }

  async payWithCashPlus(params: PayCashPlusParams): Promise<CashPlusPaymentResponse> {
    const startTime = Date.now();
    const form = new URLSearchParams({
      pub_key: this.options.publicKey,
      token_id: params.tokenId,
      'payment_method[type]': 'cashplus',
    });

    try {
      const { data } = await this.http.post<CashPlusPaymentResponse>('/cashplus/init', form);
      const durationMs = Date.now() - startTime;

      await this.logger.log(
        'payWithCashPlus',
        params as unknown as Record<string, unknown>,
        data as unknown as Record<string, unknown>,
        'success',
        durationMs,
      );

      return data;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const youcanpayError = this.handleError(error);

      await this.logger.log(
        'payWithCashPlus',
        params as unknown as Record<string, unknown>,
        { error: youcanpayError.toJSON() },
        'error',
        durationMs,
      );

      throw youcanpayError;
    }
  }

  async getTransaction(transactionId: string, bearerToken: string): Promise<Transaction> {
    const startTime = Date.now();

    try {
      const { data } = await axios.get<Transaction>(
        `${YOUCANPAY_TRANSACTION_API_URL}/transactions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            Accept: 'application/json',
          },
        },
      );
      const durationMs = Date.now() - startTime;

      await this.logger.log(
        'getTransaction',
        { transactionId },
        data as unknown as Record<string, unknown>,
        'success',
        durationMs,
      );

      return data;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const youcanpayError = this.handleError(error);

      await this.logger.log(
        'getTransaction',
        { transactionId },
        { error: youcanpayError.toJSON() },
        'error',
        durationMs,
      );

      throw youcanpayError;
    }
  }

  verifyWebhook(payload: unknown): payload is WebhookPayload {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const p = payload as Record<string, unknown>;
    return !!(p.transaction_id && p.order_id);
  }

  private handleError(error: unknown): YouCanPayError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{
        message?: string;
        errors?: Record<string, string[]>;
      }>;

      if (!axiosError.response) {
        return new YouCanPayError(
          axiosError.message || 'Network error',
          ErrorCodes.NETWORK_ERROR,
        );
      }

      const { status, data } = axiosError.response;
      const message = data?.message ?? axiosError.message;
      const details = data?.errors;

      if (status === 401) {
        return new YouCanPayError(message, ErrorCodes.UNAUTHORIZED, status, details);
      }

      if (status === 422) {
        return new YouCanPayError(message, ErrorCodes.VALIDATION_ERROR, status, details);
      }

      return new YouCanPayError(message, ErrorCodes.UNKNOWN_ERROR, status, details);
    }

    if (error instanceof Error) {
      return new YouCanPayError(error.message, ErrorCodes.UNKNOWN_ERROR);
    }

    return new YouCanPayError(String(error), ErrorCodes.UNKNOWN_ERROR);
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd package && npm test -- --testPathPattern=client`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add package/src/client.ts
git commit -m "feat(package): implement YouCanPayClient with all payment methods"
```

---

### Task 9: Create Migration Templates

**Files:**
- Create: `package/migrations/prisma/youcanpay-log.prisma`
- Create: `package/migrations/typeorm/YouCanPayLog.entity.ts`

- [ ] **Step 1: Create migrations directories**

```bash
mkdir -p package/migrations/prisma
mkdir -p package/migrations/typeorm
```

- [ ] **Step 2: Create Prisma migration template**

```prisma
// Copy this model into your schema.prisma file
// Then run: npx prisma migrate dev

model YouCanPayLog {
  id         String   @id @default(uuid())
  action     String   // "createToken", "payWithCreditCard", "payWithCashPlus", "webhook", "getTransaction"
  request    Json     // Sanitized request payload
  response   Json?    // Response data or error
  status     String   // "success", "error"
  durationMs Int?     @map("duration_ms")
  metadata   Json?    // Custom user data
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([action])
  @@index([status])
  @@index([createdAt])
  @@map("youcanpay_logs")
}
```

- [ ] **Step 3: Create TypeORM entity**

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('youcanpay_logs')
export class YouCanPayLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'jsonb' })
  request: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  response: Record<string, unknown> | null;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

- [ ] **Step 4: Commit**

```bash
git add package/migrations/
git commit -m "feat(package): add Prisma and TypeORM migration templates for audit logging"
```

---

### Task 10: Create NestJS Integration

**Files:**
- Create: `package/src/nestjs/youcanpay.service.ts`
- Create: `package/src/nestjs/youcanpay.module.ts`
- Create: `package/src/nestjs/decorators.ts`
- Create: `package/src/nestjs/index.ts`
- Create: `package/test/nestjs/youcanpay.module.spec.ts`

- [ ] **Step 1: Create nestjs directory**

```bash
mkdir -p package/src/nestjs
mkdir -p package/test/nestjs
```

- [ ] **Step 2: Write failing test for NestJS module**

```typescript
// package/test/nestjs/youcanpay.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { YouCanPayModule } from '../../src/nestjs/youcanpay.module';
import { YouCanPayService } from '../../src/nestjs/youcanpay.service';
import { YOUCANPAY_OPTIONS } from '../../src/constants';

describe('YouCanPayModule', () => {
  describe('forRoot', () => {
    it('should provide YouCanPayService', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          YouCanPayModule.forRoot({
            privateKey: 'pri_test',
            publicKey: 'pub_test',
            sandbox: true,
          }),
        ],
      }).compile();

      const service = module.get<YouCanPayService>(YouCanPayService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(YouCanPayService);
    });

    it('should provide options', async () => {
      const options = {
        privateKey: 'pri_test',
        publicKey: 'pub_test',
        sandbox: true,
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [YouCanPayModule.forRoot(options)],
      }).compile();

      const providedOptions = module.get(YOUCANPAY_OPTIONS);
      expect(providedOptions).toEqual(options);
    });
  });

  describe('forRootAsync', () => {
    it('should provide YouCanPayService with async factory', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          YouCanPayModule.forRootAsync({
            useFactory: () => ({
              privateKey: 'pri_async_test',
              publicKey: 'pub_async_test',
              sandbox: true,
            }),
          }),
        ],
      }).compile();

      const service = module.get<YouCanPayService>(YouCanPayService);
      expect(service).toBeDefined();
    });

    it('should support inject option', async () => {
      const CONFIG_TOKEN = 'CONFIG';
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          YouCanPayModule.forRootAsync({
            useFactory: (config: { privateKey: string; publicKey: string }) => ({
              privateKey: config.privateKey,
              publicKey: config.publicKey,
              sandbox: true,
            }),
            inject: [CONFIG_TOKEN],
          }),
        ],
        providers: [
          {
            provide: CONFIG_TOKEN,
            useValue: { privateKey: 'pri_injected', publicKey: 'pub_injected' },
          },
        ],
      }).compile();

      const service = module.get<YouCanPayService>(YouCanPayService);
      expect(service).toBeDefined();
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd package && npm test -- --testPathPattern=youcanpay.module`
Expected: FAIL

- [ ] **Step 4: Create youcanpay.service.ts**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { YouCanPayClient } from '../client';
import { YouCanPayOptions } from '../interfaces';
import { YOUCANPAY_OPTIONS } from '../constants';

@Injectable()
export class YouCanPayService extends YouCanPayClient {
  constructor(@Inject(YOUCANPAY_OPTIONS) options: YouCanPayOptions) {
    super(options);
  }
}
```

- [ ] **Step 5: Create youcanpay.module.ts**

```typescript
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { YouCanPayService } from './youcanpay.service';
import { YouCanPayOptions, YouCanPayAsyncOptions } from '../interfaces';
import { YOUCANPAY_OPTIONS } from '../constants';

@Module({})
export class YouCanPayModule {
  static forRoot(options: YouCanPayOptions): DynamicModule {
    return {
      module: YouCanPayModule,
      providers: [
        {
          provide: YOUCANPAY_OPTIONS,
          useValue: options,
        },
        YouCanPayService,
      ],
      exports: [YouCanPayService, YOUCANPAY_OPTIONS],
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
      imports: asyncOptions.imports as DynamicModule['imports'],
      providers: [optionsProvider, YouCanPayService],
      exports: [YouCanPayService, YOUCANPAY_OPTIONS],
    };
  }
}
```

- [ ] **Step 6: Create decorators.ts**

```typescript
import { Inject } from '@nestjs/common';
import { YouCanPayService } from './youcanpay.service';

export const InjectYouCanPay = (): ParameterDecorator => Inject(YouCanPayService);
```

- [ ] **Step 7: Create nestjs/index.ts**

```typescript
export * from './youcanpay.module';
export * from './youcanpay.service';
export * from './decorators';
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd package && npm test -- --testPathPattern=youcanpay.module`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add package/src/nestjs/ package/test/nestjs/
git commit -m "feat(package): add NestJS module with forRoot and forRootAsync"
```

---

### Task 11: Create Main Export and README

**Files:**
- Create: `package/src/index.ts`
- Create: `package/README.md`

- [ ] **Step 1: Create src/index.ts**

```typescript
// Core client (framework-agnostic)
export { YouCanPayClient } from './client';

// NestJS integration
export { YouCanPayModule } from './nestjs/youcanpay.module';
export { YouCanPayService } from './nestjs/youcanpay.service';
export { InjectYouCanPay } from './nestjs/decorators';

// Interfaces
export * from './interfaces';

// Enums
export * from './enums';

// Errors
export * from './errors';

// Logging
export {
  YouCanPayLogger,
  YouCanPayLogEntry,
  YouCanPayLoggingOptions,
  YouCanPayLogRepository,
  LogAction,
  LogStatus,
  LogStorage,
  sanitizeData,
} from './logging';

// Constants
export * from './constants';
```

- [ ] **Step 2: Create README.md**

```markdown
# youcanpay-sdk

Production-ready YouCanPay SDK for Node.js and NestJS with sandbox support and optional audit logging.

## Installation

```bash
npm install youcanpay-sdk
# or
yarn add youcanpay-sdk
```

## Quick Start

### Plain Node.js / Express

```typescript
import { YouCanPayClient, CurrencyCode } from 'youcanpay-sdk';

const client = new YouCanPayClient({
  privateKey: 'pri_xxx',
  publicKey: 'pub_xxx',
  sandbox: true, // Use sandbox for testing
});

// Create payment token
const { token } = await client.createToken({
  orderId: 'order-123',
  amount: 5000, // 50.00 MAD (amount in cents)
  currency: CurrencyCode.MAD,
  customerIp: '127.0.0.1',
  successUrl: 'https://myapp.com/success',
  errorUrl: 'https://myapp.com/error',
});

// Get payment URL for redirect
const paymentUrl = client.getPaymentUrl(token.id);
```

### NestJS

**app.module.ts:**

```typescript
import { Module } from '@nestjs/common';
import { YouCanPayModule } from 'youcanpay-sdk';

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

**With ConfigService:**

```typescript
YouCanPayModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    privateKey: config.get('YCP_PRIVATE_KEY'),
    publicKey: config.get('YCP_PUBLIC_KEY'),
    sandbox: config.get('NODE_ENV') !== 'production',
  }),
})
```

**payment.service.ts:**

```typescript
import { Injectable } from '@nestjs/common';
import { YouCanPayService, CurrencyCode } from 'youcanpay-sdk';

@Injectable()
export class PaymentService {
  constructor(private readonly youcanpay: YouCanPayService) {}

  async createPayment(orderId: string, amount: number, customerIp: string) {
    const { token } = await this.youcanpay.createToken({
      orderId,
      amount,
      currency: CurrencyCode.MAD,
      customerIp,
      successUrl: 'https://myapp.com/success',
    });

    return { tokenId: token.id };
  }
}
```

## Audit Logging (Optional)

Enable optional logging to track all SDK operations:

```typescript
// Custom handler
const client = new YouCanPayClient({
  privateKey: 'pri_xxx',
  publicKey: 'pub_xxx',
  sandbox: true,
  logging: {
    enabled: true,
    storage: 'custom',
    handler: async (log) => {
      console.log('YouCanPay operation:', log);
    },
  },
});

// Database storage (see migrations/ folder for schema)
YouCanPayModule.forRoot({
  privateKey: 'pri_xxx',
  publicKey: 'pub_xxx',
  sandbox: true,
  logging: {
    enabled: true,
    storage: 'database',
    repository: yourPrismaOrTypeORMRepository,
  },
})
```

Sensitive data (credit card numbers, CVV, private keys) is automatically redacted in logs.

## API Reference

### YouCanPayClient / YouCanPayService

- `createToken(params)` - Create a payment token
- `getPaymentUrl(tokenId, lang?)` - Get redirect URL for payment
- `payWithCreditCard(params)` - Process credit card payment
- `payWithCashPlus(params)` - Initiate CashPlus payment
- `getTransaction(id, bearerToken)` - Get transaction details
- `verifyWebhook(payload)` - Validate webhook payload

## License

MIT
```

- [ ] **Step 3: Verify build works**

Run: `cd package && npm run build`
Expected: Compiles without errors, `dist/` folder created

- [ ] **Step 4: Run all tests**

Run: `cd package && npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add package/src/index.ts package/README.md
git commit -m "feat(package): add main exports and README documentation"
```

---

## Chunk 2: Backend Application

### Task 12: Initialize Backend NestJS Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/tsconfig.build.json`
- Create: `backend/nest-cli.json`
- Create: `backend/.env.example`

- [ ] **Step 1: Create backend directory**

```bash
mkdir -p backend
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "youcanpay-backend",
  "version": "1.0.0",
  "description": "Test backend for YouCanPay SDK",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@prisma/client": "^5.0.0",
    "bcrypt": "^5.1.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.0.0",
    "uuid": "^9.0.0",
    "youcanpay-sdk": "file:../package"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/express": "^4.17.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^20.0.0",
    "@types/passport-jwt": "^4.0.0",
    "@types/supertest": "^6.0.0",
    "@types/uuid": "^9.0.0",
    "jest": "^29.0.0",
    "prisma": "^5.0.0",
    "supertest": "^6.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

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
    "strictNullChecks": true,
    "noImplicitAny": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 4: Create tsconfig.build.json**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*.spec.ts"]
}
```

- [ ] **Step 5: Create nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 6: Create .env.example**

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/youcanpay_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# YouCanPay
YCP_PRIVATE_KEY=pri_sandbox_xxx
YCP_PUBLIC_KEY=pub_sandbox_xxx
YCP_SANDBOX=true

# App
PORT=3000
```

- [ ] **Step 7: Create jest.config.js**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: 'coverage',
};
```

- [ ] **Step 8: Install dependencies**

Run: `cd backend && npm install`

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "chore(backend): initialize NestJS project structure"
```

---

### Task 13: Setup Prisma

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/prisma/prisma.module.ts`
- Create: `backend/src/prisma/prisma.service.ts`

- [ ] **Step 1: Create prisma directory**

```bash
mkdir -p backend/prisma
mkdir -p backend/src/prisma
```

- [ ] **Step 2: Create schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String
  payments  Payment[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@map("users")
}

model Payment {
  id            String        @id @default(uuid())
  orderId       String        @unique @map("order_id")
  tokenId       String?       @map("token_id")
  transactionId String?       @map("transaction_id")
  amount        Int
  currency      String
  status        PaymentStatus @default(PENDING)
  user          User          @relation(fields: [userId], references: [id])
  userId        String        @map("user_id")
  metadata      Json?
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  @@map("payments")
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
}
```

- [ ] **Step 3: Create prisma.service.ts**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 4: Create prisma.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 5: Generate Prisma client**

Run: `cd backend && npx prisma generate`

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/ backend/src/prisma/
git commit -m "feat(backend): add Prisma setup with User and Payment models"
```

---

### Task 14: Create Auth Module

**Files:**
- Create: `backend/src/auth/dto/register.dto.ts`
- Create: `backend/src/auth/dto/login.dto.ts`
- Create: `backend/src/auth/strategies/jwt.strategy.ts`
- Create: `backend/src/auth/guards/jwt-auth.guard.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.module.ts`

- [ ] **Step 1: Create auth directories**

```bash
mkdir -p backend/src/auth/dto
mkdir -p backend/src/auth/strategies
mkdir -p backend/src/auth/guards
```

- [ ] **Step 2: Create register.dto.ts**

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

- [ ] **Step 3: Create login.dto.ts**

```typescript
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

- [ ] **Step 4: Create jwt.strategy.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return { id: user.id, email: user.email };
  }
}
```

- [ ] **Step 5: Create jwt-auth.guard.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 6: Create auth.service.ts**

```typescript
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
      },
    });

    return this.generateToken(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user.id, user.email);
  }

  private generateToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
```

- [ ] **Step 7: Create auth.controller.ts**

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
```

- [ ] **Step 8: Create auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
```

- [ ] **Step 9: Commit**

```bash
git add backend/src/auth/
git commit -m "feat(backend): add JWT authentication module"
```

---

### Task 15: Create Payments Module

**Files:**
- Create: `backend/src/payments/dto/create-payment.dto.ts`
- Create: `backend/src/payments/payments.service.ts`
- Create: `backend/src/payments/payments.controller.ts`
- Create: `backend/src/payments/payments.module.ts`

- [ ] **Step 1: Create payments directories**

```bash
mkdir -p backend/src/payments/dto
```

- [ ] **Step 2: Create create-payment.dto.ts**

```typescript
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @Min(100)
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  @IsOptional()
  successUrl?: string;

  @IsString()
  @IsOptional()
  errorUrl?: string;
}
```

- [ ] **Step 3: Create payments.service.ts**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YouCanPayService, WebhookPayload, CurrencyCode } from 'youcanpay-sdk';
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

  async handleWebhook(payload: unknown) {
    if (!this.youcanpay.verifyWebhook(payload)) {
      throw new Error('Invalid webhook payload');
    }

    const webhookData = payload as WebhookPayload;

    const payment = await this.prisma.payment.findUnique({
      where: { orderId: webhookData.order_id },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const status = webhookData.status === 'success' ? 'COMPLETED' : 'FAILED';

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        transactionId: webhookData.transaction_id,
      },
    });

    return { received: true };
  }

  async getUserPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

- [ ] **Step 4: Create payments.controller.ts**

```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { id: string; email: string };
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-token')
  @UseGuards(JwtAuthGuard)
  createPayment(
    @Request() req: RequestWithUser,
    @Body() dto: CreatePaymentDto,
    @Ip() ip: string,
  ) {
    return this.paymentsService.createPayment(req.user.id, dto, ip || '127.0.0.1');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getPayment(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.paymentsService.getPayment(req.user.id, id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getUserPayments(@Request() req: RequestWithUser) {
    return this.paymentsService.getUserPayments(req.user.id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() payload: unknown) {
    return this.paymentsService.handleWebhook(payload);
  }
}
```

- [ ] **Step 5: Create payments.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/payments/
git commit -m "feat(backend): add payments module with YouCanPay integration"
```

---

### Task 16: Create App Module and Main Entry

**Files:**
- Create: `backend/src/app.module.ts`
- Create: `backend/src/main.ts`

- [ ] **Step 1: Create app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { YouCanPayModule } from 'youcanpay-sdk';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    YouCanPayModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        privateKey: config.get<string>('YCP_PRIVATE_KEY') || '',
        publicKey: config.get<string>('YCP_PUBLIC_KEY') || '',
        sandbox: config.get<string>('YCP_SANDBOX') === 'true',
      }),
    }),
    AuthModule,
    PaymentsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Create main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}

bootstrap();
```

- [ ] **Step 3: Verify build works**

Run: `cd backend && npm run build`
Expected: Compiles without errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/app.module.ts backend/src/main.ts
git commit -m "feat(backend): add app module and main entry point"
```

---

### Task 17: Add Backend E2E Tests

**Files:**
- Create: `backend/test/jest-e2e.json`
- Create: `backend/test/auth.e2e-spec.ts`
- Create: `backend/test/payments.e2e-spec.ts`

- [ ] **Step 1: Create test directory and config**

```bash
mkdir -p backend/test
```

- [ ] **Step 2: Create jest-e2e.json**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

- [ ] **Step 3: Create auth.e2e-spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.payment.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.payment.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
        });
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password456' })
        .expect(409);
    });

    it('should validate email format', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });
    });

    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
        });
    });

    it('should reject invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);
    });
  });
});
```

- [ ] **Step 4: Create payments.e2e-spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.payment.deleteMany();
    await prisma.user.deleteMany();

    // Create user and get token
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = res.body.access_token;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('/payments/create-token (POST)', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/payments/create-token')
        .send({ amount: 5000, currency: 'MAD' })
        .expect(401);
    });

    it('should create payment with valid token', () => {
      return request(app.getHttpServer())
        .post('/payments/create-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 5000, currency: 'MAD' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('paymentId');
          expect(res.body).toHaveProperty('tokenId');
          expect(res.body).toHaveProperty('paymentUrl');
        });
    });

    it('should validate minimum amount', () => {
      return request(app.getHttpServer())
        .post('/payments/create-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 50, currency: 'MAD' })
        .expect(400);
    });
  });

  describe('/payments/webhook (POST)', () => {
    it('should handle valid webhook payload', async () => {
      // First create a payment
      const paymentRes = await request(app.getHttpServer())
        .post('/payments/create-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 5000, currency: 'MAD' });

      const payment = await prisma.payment.findFirst();

      // Simulate webhook
      return request(app.getHttpServer())
        .post('/payments/webhook')
        .send({
          transaction_id: 'txn_123',
          order_id: payment?.orderId,
          amount: 5000,
          status: 'success',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ received: true });
        });
    });
  });

  describe('/payments (GET)', () => {
    it('should return user payments', async () => {
      // Create a payment first
      await request(app.getHttpServer())
        .post('/payments/create-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 5000, currency: 'MAD' });

      return request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(1);
        });
    });
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add backend/test/
git commit -m "test(backend): add E2E tests for auth and payments"
```

---

## Chunk 3: Frontend Application

### Task 18: Initialize Frontend React Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/.env.example`

- [ ] **Step 1: Create frontend directory**

```bash
mkdir -p frontend/src
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "youcanpay-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^14.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "jsdom": "^22.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

- [ ] **Step 6: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 7: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>YouCanPay Test</title>
    <script src="https://youcanpay.com/js/ycpay.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create .env.example**

```
# YouCanPay Configuration
VITE_YCP_PUBLIC_KEY=pub_sandbox_xxx
VITE_YCP_SANDBOX=true

# Backend API URL (optional, defaults to /api via proxy)
VITE_API_URL=
```

- [ ] **Step 9: Install dependencies**

Run: `cd frontend && npm install`

- [ ] **Step 10: Commit**

```bash
git add frontend/
git commit -m "chore(frontend): initialize React + Vite project"
```

---

### Task 19: Create Types and API Client

**Files:**
- Create: `frontend/src/types/ycpay.d.ts`
- Create: `frontend/src/api/payments.ts`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Create directories**

```bash
mkdir -p frontend/src/types
mkdir -p frontend/src/api
mkdir -p frontend/src/test
```

- [ ] **Step 2: Create ycpay.d.ts**

```typescript
interface YCPayOptions {
  formContainer: string;
  locale?: 'ar' | 'en' | 'fr';
  isSandbox?: boolean;
  errorContainer?: string;
  customCSS?: string;
}

interface YCPayInstance {
  renderAvailableGateways(): void;
  pay(tokenId: string): Promise<string>;
}

declare class YCPay {
  constructor(publicKey: string, options: YCPayOptions);
  renderAvailableGateways(): void;
  pay(tokenId: string): Promise<string>;
}

interface Window {
  YCPay: typeof YCPay;
}
```

- [ ] **Step 3: Create payments.ts**

```typescript
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Token storage (simple implementation for testing)
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

export interface CreatePaymentResponse {
  paymentId: string;
  tokenId: string;
  paymentUrl: string;
}

export interface Payment {
  id: string;
  orderId: string;
  tokenId: string | null;
  transactionId: string | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export async function createPayment(
  amount: number,
  currency: string,
): Promise<CreatePaymentResponse> {
  const response = await fetch(`${API_BASE}/payments/create-token`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount, currency }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create payment');
  }

  return response.json();
}

export async function getPayment(id: string): Promise<Payment> {
  const response = await fetch(`${API_BASE}/payments/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payment');
  }

  return response.json();
}

export async function getPayments(): Promise<Payment[]> {
  const response = await fetch(`${API_BASE}/payments`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payments');
  }

  return response.json();
}
```

- [ ] **Step 4: Create test/setup.ts**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/ frontend/src/api/ frontend/src/test/
git commit -m "feat(frontend): add YCPay types and API client"
```

---

### Task 20: Create useYouCanPay Hook

**Files:**
- Create: `frontend/src/hooks/useYouCanPay.ts`

- [ ] **Step 1: Create hooks directory**

```bash
mkdir -p frontend/src/hooks
```

- [ ] **Step 2: Create useYouCanPay.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseYouCanPayOptions {
  publicKey: string;
  isSandbox?: boolean;
  locale?: 'ar' | 'en' | 'fr';
  formContainer: string;
}

interface UseYouCanPayReturn {
  isReady: boolean;
  error: string | null;
  renderGateways: () => void;
  pay: (tokenId: string) => Promise<string>;
}

export function useYouCanPay(options: UseYouCanPayOptions): UseYouCanPayReturn {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ycpay, setYcpay] = useState<YCPayInstance | null>(null);

  useEffect(() => {
    const initYCPay = () => {
      try {
        if (typeof window.YCPay === 'undefined') {
          setError('YCPay script not loaded');
          return;
        }

        const instance = new window.YCPay(options.publicKey, {
          formContainer: options.formContainer,
          locale: options.locale || 'fr',
          isSandbox: options.isSandbox ?? true,
        });

        setYcpay(instance);
        setIsReady(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize YCPay');
      }
    };

    // Check if script is already loaded
    if (typeof window.YCPay !== 'undefined') {
      initYCPay();
    } else {
      // Wait for script to load
      const checkInterval = setInterval(() => {
        if (typeof window.YCPay !== 'undefined') {
          clearInterval(checkInterval);
          initYCPay();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isReady) {
          setError('YCPay script load timeout');
        }
      }, 10000);

      return () => clearInterval(checkInterval);
    }
  }, [options.publicKey, options.formContainer, options.locale, options.isSandbox]);

  const renderGateways = useCallback(() => {
    if (ycpay) {
      ycpay.renderAvailableGateways();
    }
  }, [ycpay]);

  const pay = useCallback(
    async (tokenId: string): Promise<string> => {
      if (!ycpay) {
        throw new Error('YCPay not initialized');
      }
      return ycpay.pay(tokenId);
    },
    [ycpay],
  );

  return { isReady, error, renderGateways, pay };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat(frontend): add useYouCanPay hook"
```

---

### Task 21: Create Payment Components

**Files:**
- Create: `frontend/src/components/PaymentForm.tsx`
- Create: `frontend/src/components/PaymentResult.tsx`

- [ ] **Step 1: Create components directory**

```bash
mkdir -p frontend/src/components
```

- [ ] **Step 2: Create PaymentForm.tsx**

```typescript
import { useState, useEffect } from 'react';
import { createPayment } from '../api/payments';
import { useYouCanPay } from '../hooks/useYouCanPay';
import { PaymentResult } from './PaymentResult';

const PUBLIC_KEY = import.meta.env.VITE_YCP_PUBLIC_KEY || 'pub_sandbox_xxx';
const IS_SANDBOX = import.meta.env.VITE_YCP_SANDBOX !== 'false';

export function PaymentForm() {
  const [amount, setAmount] = useState<string>('50.00');
  const [currency] = useState('MAD');
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const { isReady, error: ycpayError, renderGateways, pay } = useYouCanPay({
    publicKey: PUBLIC_KEY,
    isSandbox: IS_SANDBOX,
    formContainer: '#payment-container',
    locale: 'fr',
  });

  useEffect(() => {
    if (isReady && tokenId) {
      renderGateways();
    }
  }, [isReady, tokenId, renderGateways]);

  const handleCreatePayment = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100);
      const response = await createPayment(amountInCents, currency);
      setTokenId(response.tokenId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!tokenId) return;

    setLoading(true);
    setError(null);

    try {
      const transactionId = await pay(tokenId);
      setResult({
        success: true,
        message: `Payment successful! Transaction ID: ${transactionId}`,
      });
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Payment failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTokenId(null);
    setResult(null);
    setError(null);
  };

  if (result) {
    return <PaymentResult success={result.success} message={result.message} onReset={handleReset} />;
  }

  return (
    <div className="payment-form">
      <h2>YouCanPay Test</h2>

      {(error || ycpayError) && (
        <div className="error-message">{error || ycpayError}</div>
      )}

      {!tokenId ? (
        <div className="amount-section">
          <label>
            Amount ({currency}):
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="0.01"
              disabled={loading}
            />
          </label>
          <button onClick={handleCreatePayment} disabled={loading}>
            {loading ? 'Creating...' : 'Create Payment'}
          </button>
        </div>
      ) : (
        <div className="payment-section">
          <p>Amount: {amount} {currency}</p>

          <div id="payment-container"></div>

          <button onClick={handlePay} disabled={loading || !isReady}>
            {loading ? 'Processing...' : 'Pay Now'}
          </button>

          <button onClick={handleReset} className="secondary" disabled={loading}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create PaymentResult.tsx**

```typescript
interface PaymentResultProps {
  success: boolean;
  message: string;
  onReset: () => void;
}

export function PaymentResult({ success, message, onReset }: PaymentResultProps) {
  return (
    <div className={`payment-result ${success ? 'success' : 'error'}`}>
      <div className="icon">{success ? '✓' : '✗'}</div>
      <h2>{success ? 'Payment Successful' : 'Payment Failed'}</h2>
      <p>{message}</p>
      <button onClick={onReset}>Make Another Payment</button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/
git commit -m "feat(frontend): add PaymentForm and PaymentResult components"
```

---

### Task 22: Create App Entry Point and Styles

**Files:**
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/App.css`

- [ ] **Step 1: Create main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 2: Create App.tsx**

```typescript
import { PaymentForm } from './components/PaymentForm';

function App() {
  return (
    <div className="app">
      <header>
        <h1>YouCanPay SDK Test</h1>
        <p>Test the payment integration</p>
      </header>
      <main>
        <PaymentForm />
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Create App.css**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  text-align: center;
  margin-bottom: 2rem;
}

header h1 {
  color: #2563eb;
  margin-bottom: 0.5rem;
}

header p {
  color: #666;
}

.payment-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.payment-form h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.amount-section,
.payment-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-weight: 500;
}

input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

button {
  padding: 0.75rem 1.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: #1d4ed8;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button.secondary {
  background: #6b7280;
}

button.secondary:hover:not(:disabled) {
  background: #4b5563;
}

#payment-container {
  min-height: 200px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
}

.payment-result {
  text-align: center;
  padding: 2rem;
}

.payment-result .icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.payment-result.success .icon {
  color: #16a34a;
}

.payment-result.error .icon {
  color: #dc2626;
}

.payment-result h2 {
  margin-bottom: 1rem;
}

.payment-result p {
  color: #666;
  margin-bottom: 2rem;
}
```

- [ ] **Step 4: Verify dev server works**

Run: `cd frontend && npm run dev`
Expected: Opens on http://localhost:5173

- [ ] **Step 5: Commit**

```bash
git add frontend/src/main.tsx frontend/src/App.tsx frontend/src/App.css
git commit -m "feat(frontend): add App entry point and styles"
```

---

### Task 23: Add Frontend Tests

**Files:**
- Create: `frontend/src/components/PaymentForm.test.tsx`

- [ ] **Step 1: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentForm } from './PaymentForm';
import * as paymentsApi from '../api/payments';

// Mock the API
vi.mock('../api/payments', () => ({
  createPayment: vi.fn(),
}));

// Mock YCPay
const mockPay = vi.fn();
const mockRenderGateways = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Mock window.YCPay
  (window as any).YCPay = vi.fn().mockImplementation(() => ({
    renderAvailableGateways: mockRenderGateways,
    pay: mockPay,
  }));
});

describe('PaymentForm', () => {
  it('renders amount input', () => {
    render(<PaymentForm />);
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
  });

  it('renders create payment button', () => {
    render(<PaymentForm />);
    expect(screen.getByRole('button', { name: /create payment/i })).toBeInTheDocument();
  });

  it('calls createPayment API on button click', async () => {
    vi.mocked(paymentsApi.createPayment).mockResolvedValue({
      paymentId: 'pay_123',
      tokenId: 'tok_123',
      paymentUrl: 'https://example.com/pay',
    });

    render(<PaymentForm />);

    const input = screen.getByLabelText(/amount/i);
    fireEvent.change(input, { target: { value: '100' } });

    const button = screen.getByRole('button', { name: /create payment/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(paymentsApi.createPayment).toHaveBeenCalledWith(10000, 'MAD');
    });
  });

  it('shows error message on API failure', async () => {
    vi.mocked(paymentsApi.createPayment).mockRejectedValue(new Error('API Error'));

    render(<PaymentForm />);

    const button = screen.getByRole('button', { name: /create payment/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/api error/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd frontend && npm test`
Expected: Tests pass

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PaymentForm.test.tsx
git commit -m "test(frontend): add PaymentForm component tests"
```

---

### Task 24: Final Integration and Documentation

**Files:**
- Create: `README.md` (root)

- [ ] **Step 1: Create root README.md**

```markdown
# YouCanPay Package

Production-ready YouCanPay SDK for Node.js and NestJS, with a test backend and frontend.

## Structure

```
youcan_pay_package/
├── package/     # youcanpay-sdk npm package
├── backend/     # NestJS test backend
└── frontend/    # React test frontend
```

## Quick Start

### 1. Install Dependencies

```bash
# SDK Package
cd package && npm install

# Backend
cd ../backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Setup Database

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your PostgreSQL credentials and YouCanPay keys

# Run migrations
npx prisma migrate dev
```

### 3. Start Services

```bash
# Terminal 1: Backend
cd backend && npm run start:dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### 4. Test

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## SDK Usage

See `package/README.md` for detailed SDK documentation.

### Plain Node.js

```typescript
import { YouCanPayClient } from 'youcanpay-sdk';

const client = new YouCanPayClient({
  privateKey: 'pri_xxx',
  publicKey: 'pub_xxx',
  sandbox: true,
});

const { token } = await client.createToken({
  orderId: 'order-123',
  amount: 5000,
  currency: 'MAD',
  customerIp: '127.0.0.1',
  successUrl: 'https://myapp.com/success',
});
```

### NestJS

```typescript
import { YouCanPayModule } from 'youcanpay-sdk';

@Module({
  imports: [
    YouCanPayModule.forRoot({
      privateKey: process.env.YCP_PRIVATE_KEY,
      publicKey: process.env.YCP_PUBLIC_KEY,
      sandbox: true,
    }),
  ],
})
export class AppModule {}
```

## Testing

```bash
# SDK tests
cd package && npm test

# Backend E2E tests
cd backend && npm run test:e2e

# Frontend tests
cd frontend && npm test
```

## License

MIT
```

- [ ] **Step 2: Run all tests**

```bash
cd package && npm test
cd ../backend && npm test
cd ../frontend && npm test
```

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: add root README with quick start guide"
```

---

## Execution Checklist

After completing all tasks:

- [ ] All SDK tests pass (`cd package && npm test`)
- [ ] SDK builds successfully (`cd package && npm run build`)
- [ ] Backend compiles (`cd backend && npm run build`)
- [ ] Backend E2E tests pass (`cd backend && npm run test:e2e`)
- [ ] Frontend dev server runs (`cd frontend && npm run dev`)
- [ ] Frontend tests pass (`cd frontend && npm test`)
- [ ] Full payment flow works in sandbox mode
