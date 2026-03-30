# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouCanPay SDK for Node.js and NestJS - a production-ready payment integration for the YouCanPay Moroccan payment gateway. The repository contains three independent packages:

- `package/` - The SDK (publishable to npm as `youcanpay-sdk`)
- `backend/` - NestJS test backend demonstrating SDK integration
- `frontend/` - React + Vite test UI for payment flows

## Common Commands

### SDK Package (`package/`)
```bash
cd package
npm test                    # Run Jest unit tests
npm run test:cov            # Run tests with coverage
npm run build               # Build to dist/
```

### Backend (`backend/`)
```bash
cd backend
npm run start:dev           # Start NestJS in watch mode
npm test                    # Run unit tests
npm run test:e2e            # Run E2E tests
npm run prisma:migrate      # Run database migrations
npm run prisma:generate     # Generate Prisma client
npm run prisma:studio       # Open Prisma Studio
```

### Frontend (`frontend/`)
```bash
cd frontend
npm run dev                 # Start Vite dev server
npm test                    # Run Vitest tests
npm run build               # Production build
```

## Architecture

### SDK (`package/src/`)

The SDK has two layers:
1. **Core Client** (`client.ts`) - Framework-agnostic `YouCanPayClient` class using Axios. Works in any Node.js environment.
2. **NestJS Integration** (`nestjs/`) - `YouCanPayModule` with `forRoot()`/`forRootAsync()` and injectable `YouCanPayService`.

Key design: NestJS dependencies are **optional peer dependencies** so the core client works without NestJS.

### Backend (`backend/src/`)

NestJS application with:
- `auth/` - JWT authentication (register, login)
- `payments/` - Payment endpoints using SDK
- `prisma/` - Database service

References SDK via `"youcanpay-sdk": "file:../package"` for immediate local development.

### Database

PostgreSQL with Prisma. Schema at `backend/prisma/schema.prisma` defines `User` and `Payment` models.

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
