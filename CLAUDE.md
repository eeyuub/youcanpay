# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouCanPay SDK for Node.js and NestJS - a production-ready payment integration for the YouCanPay Moroccan payment gateway. The repository contains three independent packages:

- `package/` - The SDK (published to npm as `@wiicode/youcanpay-sdk`)
- `backend/` - Demo NestJS app (for testing only, not part of SDK)
- `frontend/` - Demo React + Vite app (for testing only, not part of SDK)

## Common Commands

### SDK Package (`package/`)
```bash
cd package
npm test                           # Run all Jest tests
npm test -- client.spec.ts         # Run single test file
npm test -- --testNamePattern="createToken"  # Run tests matching pattern
npm run test:watch                 # Run tests in watch mode
npm run test:cov                   # Run tests with coverage
npm run build                      # Build to dist/
```

### Backend (`backend/`)
```bash
cd backend
npm run start:dev           # Start NestJS in watch mode
npm test                    # Run unit tests
npm run test:e2e            # Run E2E tests
npx prisma migrate dev      # Run database migrations
npx prisma generate         # Generate Prisma client
npx prisma studio           # Open Prisma Studio
```

### Frontend (`frontend/`)
```bash
cd frontend
npm run dev                 # Start Vite dev server (port 5173)
npm test                    # Run Vitest tests
npm run build               # Production build
```

## Architecture

### SDK (`package/src/`)

The SDK has two layers:
1. **Core Client** (`client.ts`) - Framework-agnostic `YouCanPayClient` class using Axios
2. **NestJS Integration** (`nestjs/`) - `YouCanPayModule` with `forRoot()`/`forRootAsync()` and injectable `YouCanPayService`

Supporting modules:
- `security/` - Webhook parsing/verification (`webhook.ts`), input validators (`validators.ts`)
- `logging/` - Optional audit logging with data sanitization
- `interfaces/` - TypeScript types for payments, tokens, transactions, webhooks
- `errors/` - `YouCanPayError` with error codes

Key design: NestJS dependencies are **optional peer dependencies** so the core client works without NestJS.

### Backend (`backend/src/`)

Demo NestJS application with:
- `auth/` - JWT authentication (register, login)
- `payments/` - Payment endpoints using SDK (card + CashPlus)
- `prisma/` - Database service

References SDK via `"youcanpay-sdk": "file:../package"` - rebuild SDK after changes.

### Database

PostgreSQL with Prisma. Schema at `backend/prisma/schema.prisma` defines `User` and `Payment` models (including CashPlus token storage).

## YouCanPay API

- **Production:** `https://youcanpay.com/api`
- **Sandbox:** `https://youcanpay.com/sandbox/api`
- Key endpoints: `POST /tokenize`, `POST /pay`, `POST /cashplus/init`
- The SDK's `sandbox: boolean` option automatically toggles the base URL

## Environment Variables (Backend)

Copy `backend/.env.example` to `backend/.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `YCP_PRIVATE_KEY`, `YCP_PUBLIC_KEY` - YouCanPay credentials
- `YCP_SANDBOX` - Set to `true` for sandbox mode
- `JWT_SECRET` - JWT signing key

## Testing

- SDK uses Jest with ts-jest (`package/jest.config.js`)
- Backend uses Jest for unit tests, Supertest for E2E
- Frontend uses Vitest with React Testing Library

### Sandbox Test Cards

| Card Number | Result |
|-------------|--------|
| `4000 0000 0000 0002` | Success |
| `4000 0000 0000 0010` | 3D Secure |
| `4000 0000 0000 0036` | Declined |

Use any future expiry date and any 3-digit CVV.

## Local Development Workflow

1. Make SDK changes in `package/src/`
2. Run `npm run build` in `package/` to compile
3. Backend/frontend auto-resolve via `file:../package` reference
4. Test with `npm test` in `package/` before committing
