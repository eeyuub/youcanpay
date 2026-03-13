# YouCanPay SDK Design Specification

**Date:** 2026-03-13
**Status:** Approved

## Overview

Production-ready YouCanPay SDK for Node.js and NestJS with sandbox support, plus a test backend and frontend for development and demonstration.

## Requirements Summary

| Aspect | Decision |
|--------|----------|
| Package name | `youcanpay-sdk` |
| Structure | 3 separate folders (no monorepo) |
| Frontend | React + Vite (payment form only) |
| Backend | NestJS + Prisma + PostgreSQL |
| Auth | JWT authentication |
| Testing | Full suite (unit, integration, E2E) |
| Audit Logging | Optional, with database/custom handler support |

## Approach

**Parallel Development with Local Path Reference** - Build all three components in parallel. Backend references SDK via relative path (`"youcanpay-sdk": "file:../package"`). SDK remains independent and publishable, changes reflect immediately in backend without `npm link`.

---

## Project Structure

```
youcan_pay_package/
├── package/                    # SDK Package (youcanpay-sdk)
│   ├── src/
│   │   ├── index.ts           # Public exports
│   │   ├── client.ts          # Core HTTP client (framework-agnostic)
│   │   ├── nestjs/
│   │   │   ├── youcanpay.module.ts
│   │   │   ├── youcanpay.service.ts
│   │   │   └── decorators.ts
│   │   ├── interfaces/
│   │   ├── enums/
│   │   ├── errors/
│   │   └── logging/
│   │       ├── logger.ts          # Audit logger implementation
│   │       └── interfaces.ts      # Logging types
│   ├── migrations/
│   │   ├── prisma/
│   │   │   └── youcanpay-log.prisma
│   │   └── typeorm/
│   │       └── YouCanPayLog.entity.ts
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                    # NestJS Test Backend
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── auth/              # JWT auth module
│   │   ├── payments/          # Payment endpoints using SDK
│   │   └── prisma/            # Database service
│   ├── prisma/
│   │   └── schema.prisma
│   ├── test/
│   ├── .env.example
│   └── package.json
│
└── frontend/                   # React Test UI
    ├── src/
    │   ├── App.tsx
    │   ├── components/
    │   │   └── PaymentForm.tsx
    │   └── api/
    ├── index.html
    └── package.json
```

---

## SDK Package Architecture

### Core Client (`client.ts`)

Framework-agnostic HTTP client that works in any Node.js environment:

```typescript
class YouCanPayClient {
  constructor(options: YouCanPayOptions)

  createToken(params: CreateTokenParams): Promise<TokenResponse>
  payWithCreditCard(params: PayCreditCardParams): Promise<PaymentResponse>
  payWithCashPlus(params: PayCashPlusParams): Promise<CashPlusPaymentResponse>
  getTransaction(id: string, bearerToken: string): Promise<Transaction>
  getPaymentUrl(tokenId: string, lang?: Lang): string
  verifyWebhook(payload: unknown, signature?: string): boolean
}
```

### NestJS Integration

- `YouCanPayModule.forRoot(options)` - Static configuration
- `YouCanPayModule.forRootAsync(options)` - Async config with ConfigService
- `YouCanPayService` - Injectable wrapper extending `YouCanPayClient`
- `@InjectYouCanPay()` - Decorator for injection

### Key Design Decisions

- **Axios** for HTTP requests (widely used, good error handling)
- `sandbox: boolean` option toggles base URL automatically
- All methods throw `YouCanPayError` with structured error info
- NestJS dependencies are **peer dependencies** (optional)
- Full TypeScript with strict mode, zero `any` types

### API Endpoints (YouCanPay)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tokenize` | Create payment token |
| POST | `/pay` | Pay with credit card |
| POST | `/cashplus/init` | Initiate CashPlus payment |
| GET | `/transactions/:id` | Get transaction details (OAuth) |

**Base URLs:**
- Production: `https://youcanpay.com/api`
- Sandbox: `https://youcanpay.com/sandbox/api`

---

## Backend Architecture

### Modules

```
AppModule
├── AuthModule
│   ├── AuthController      POST /auth/register, POST /auth/login
│   ├── AuthService         JWT token generation, password hashing
│   ├── JwtStrategy         Passport JWT validation
│   └── JwtAuthGuard
│
├── PaymentsModule
│   ├── PaymentsController  POST /payments/create-token (protected)
│   │                       POST /payments/webhook (public)
│   │                       GET  /payments/:id (protected)
│   └── PaymentsService     Uses YouCanPayService from SDK
│
├── PrismaModule
│   └── PrismaService       Database connection
│
└── YouCanPayModule.forRootAsync(...)
```

### Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  payments  Payment[]
  createdAt DateTime @default(now())
}

model Payment {
  id            String        @id @default(uuid())
  orderId       String        @unique
  tokenId       String?
  transactionId String?
  amount        Int
  currency      String
  status        PaymentStatus @default(PENDING)
  user          User          @relation(fields: [userId], references: [id])
  userId        String
  metadata      Json?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
}
```

### Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/youcanpay_db
JWT_SECRET=your-secret-key
YCP_PRIVATE_KEY=pri_sandbox_xxx
YCP_PUBLIC_KEY=pub_sandbox_xxx
YCP_SANDBOX=true
```

---

## Frontend Architecture

### Structure

```
frontend/src/
├── App.tsx                 # Main app with routing
├── api/
│   └── payments.ts         # API client to call backend
├── components/
│   ├── PaymentForm.tsx     # Main payment form
│   └── PaymentResult.tsx   # Success/error display
├── hooks/
│   └── useYouCanPay.ts     # Hook to load ycpay.js script
└── types/
    └── ycpay.d.ts          # TypeScript declarations for YCPay
```

### Payment Flow

1. User enters amount, clicks "Pay"
2. Frontend calls backend `POST /payments/create-token`
3. Backend creates token via SDK, stores payment record, returns `tokenId`
4. Frontend initializes YCPay with `tokenId`, renders payment gateways
5. User enters card details in YouCanPay's embedded form
6. On success, YouCanPay redirects to success URL or calls callback
7. Webhook hits backend, updates payment status

### UI Components

- Amount input field
- "Create Payment" button
- YouCanPay embedded form container (`#payment-container`)
- "Pay Now" button (triggers YCPay.pay())
- Result display (success/error message)

---

## Testing Strategy

### SDK Package

| Type | What | Tools |
|------|------|-------|
| Unit | `YouCanPayClient` methods - mock Axios, verify payloads | Jest |
| Unit | URL generation, error handling, webhook validation | Jest |
| Unit | NestJS module `forRoot`/`forRootAsync` providers | Jest + @nestjs/testing |
| Unit | Audit logger - sanitization, custom handler calls | Jest |
| Unit | Data sanitization - verify sensitive fields redacted | Jest |

### Backend

| Type | What | Tools |
|------|------|-------|
| Unit | `AuthService` - password hashing, token generation | Jest |
| Unit | `PaymentsService` - mock SDK, verify logic | Jest |
| Integration | Auth flow - register, login, get JWT | Jest + Supertest |
| Integration | Payment flow - create token, webhook | Jest + Supertest |
| E2E | Full flow with test database | Jest + Supertest + Prisma |

### Frontend

| Type | What | Tools |
|------|------|-------|
| Unit | Components render correctly | Vitest + React Testing Library |
| Unit | API client functions | Vitest |

### Test Database

- Separate PostgreSQL database for tests (`youcanpay_test`)
- Prisma migrations run before test suite
- Database reset between test runs

---

## Error Handling

### YouCanPayError Class

```typescript
class YouCanPayError extends Error {
  constructor(
    message: string,
    public code: string,           // e.g., "INVALID_TOKEN", "NETWORK_ERROR"
    public statusCode?: number,    // HTTP status if from API
    public details?: Record<string, string[]>  // Validation errors
  ) {}
}
```

### Error Types

- All API errors wrapped in `YouCanPayError`
- Network failures: `NETWORK_ERROR`
- API validation errors: `VALIDATION_ERROR` with field details
- Timeout handling with configurable timeout option

---

## Audit Logging (Optional Feature)

A comprehensive logging system that records all SDK actions with full request/response data. This feature is **opt-in** and does not require database migrations unless the user chooses database storage.

### What Gets Logged

| Field | Description |
|-------|-------------|
| `action` | SDK method name: `createToken`, `payWithCreditCard`, `payWithCashPlus`, `webhook` |
| `request` | Sanitized request payload (sensitive data like CVV, full card numbers removed) |
| `response` | Full response or error details |
| `status` | `success` or `error` |
| `durationMs` | Request duration in milliseconds |
| `metadata` | Custom user-provided data |
| `createdAt` | Timestamp |

### Storage Options

Users choose one of three storage modes:

1. **Database** - Persist logs to database (requires optional migration)
2. **Custom Handler** - User provides their own async logging function
3. **Disabled** - No logging (default)

### Configuration

```typescript
// Option 1: Database storage (requires migration)
YouCanPayModule.forRoot({
  privateKey: '...',
  publicKey: '...',
  sandbox: true,
  logging: {
    enabled: true,
    storage: 'database',
    // For NestJS: inject PrismaService or TypeORM repository
    repository: YouCanPayLogRepository,
  }
})

// Option 2: Custom handler
YouCanPayModule.forRoot({
  privateKey: '...',
  publicKey: '...',
  sandbox: true,
  logging: {
    enabled: true,
    storage: 'custom',
    handler: async (log: YouCanPayLogEntry) => {
      // Send to external service, file, etc.
      await myLoggingService.log(log);
    }
  }
})

// Option 3: Disabled (default)
YouCanPayModule.forRoot({
  privateKey: '...',
  publicKey: '...',
  sandbox: true,
  // logging not specified = disabled
})
```

### Plain Node.js Usage

```typescript
const client = new YouCanPayClient({
  privateKey: '...',
  publicKey: '...',
  sandbox: true,
  logging: {
    enabled: true,
    storage: 'custom',
    handler: async (log) => console.log(JSON.stringify(log))
  }
});
```

### Database Schema

**Prisma (`migrations/prisma/youcanpay-log.prisma`):**

```prisma
model YouCanPayLog {
  id         String   @id @default(uuid())
  action     String   // "createToken", "payWithCreditCard", "payWithCashPlus", "webhook"
  request    Json     // Sanitized request payload
  response   Json?    // Response data or error
  status     String   // "success", "error"
  durationMs Int?
  metadata   Json?    // Custom user data
  createdAt  DateTime @default(now())

  @@index([action])
  @@index([status])
  @@index([createdAt])
}
```

**TypeORM (`migrations/typeorm/YouCanPayLog.entity.ts`):**

```typescript
@Entity('youcanpay_logs')
export class YouCanPayLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string;

  @Column('jsonb')
  request: Record<string, unknown>;

  @Column('jsonb', { nullable: true })
  response: Record<string, unknown>;

  @Column()
  status: string;

  @Column({ nullable: true })
  durationMs: number;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
```

### Data Sanitization

Sensitive fields are automatically redacted before logging:

| Field | Sanitization |
|-------|--------------|
| `creditCard` | Last 4 digits only: `************1234` |
| `cvv` | Completely removed: `***` |
| `privateKey` | Completely removed: `[REDACTED]` |
| `password` | Completely removed: `[REDACTED]` |

### Logging Interface

```typescript
interface YouCanPayLogEntry {
  id: string;
  action: 'createToken' | 'payWithCreditCard' | 'payWithCashPlus' | 'webhook';
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
  status: 'success' | 'error';
  durationMs?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

interface YouCanPayLoggingOptions {
  enabled: boolean;
  storage: 'database' | 'custom' | 'none';
  handler?: (log: YouCanPayLogEntry) => Promise<void>;
  repository?: any; // Prisma client or TypeORM repository
}
```

### Installation Instructions (for SDK users)

**For Prisma users:**
1. Copy `node_modules/youcanpay-sdk/migrations/prisma/youcanpay-log.prisma` content into your `schema.prisma`
2. Run `npx prisma migrate dev`
3. Configure SDK with `storage: 'database'` and pass PrismaService

**For TypeORM users:**
1. Import `YouCanPayLog` entity from `youcanpay-sdk/migrations/typeorm`
2. Add to your TypeORM entities array
3. Run migrations
4. Configure SDK with `storage: 'database'` and pass repository

---

## Data Flow

```
┌──────────┐     1. Create Payment      ┌──────────┐
│ Frontend │ ─────────────────────────► │ Backend  │
└──────────┘                            └──────────┘
                                              │
                                              │ 2. createToken()
                                              ▼
                                        ┌──────────┐
                                        │   SDK    │
                                        └──────────┘
                                              │
                                              │ 3. POST /tokenize
                                              ▼
                                        ┌──────────┐
                                        │ YouCanPay│
                                        │   API    │
                                        └──────────┘
                                              │
                    4. tokenId                │
┌──────────┐ ◄────────────────────────────────┘
│ Frontend │
└──────────┘
      │
      │ 5. YCPay.pay(tokenId) - User enters card
      ▼
┌──────────┐     6. Process payment     ┌──────────┐
│ ycpay.js │ ─────────────────────────► │ YouCanPay│
└──────────┘                            └──────────┘
                                              │
                                              │ 7. Webhook POST
                                              ▼
                                        ┌──────────┐
                                        │ Backend  │ → Update payment status
                                        └──────────┘
```

---

## Implementation Notes

### SDK Package

- Use `URLSearchParams` for form-encoded POST requests (YouCanPay API requirement)
- Customer and metadata fields use bracket notation: `customer[name]`, `metadata[key]`
- Payment URL format: `https://youcanpay.com/payment-form/{tokenId}?lang={lang}`
- Sandbox URL format: `https://youcanpay.com/sandbox/payment-form/{tokenId}?lang={lang}`

### Backend

- Use `bcrypt` for password hashing
- JWT expiration: configurable, default 24h
- Webhook endpoint must be public (no JWT)
- Store `tokenId` and `transactionId` for reconciliation

### Frontend

- Load `ycpay.js` dynamically via custom hook
- YCPay requires `publicKey` and `tokenId` to initialize
- Handle both callback and redirect flows
