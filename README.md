# YouCanPay SDK

[![npm version](https://img.shields.io/npm/v/@wiicode/youcanpay-sdk.svg)](https://www.npmjs.com/package/@wiicode/youcanpay-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@wiicode/youcanpay-sdk.svg)](https://www.npmjs.com/package/@wiicode/youcanpay-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Production-ready Node.js SDK for [YouCanPay](https://youcanpay.com) - Morocco's leading payment gateway.

## Features

- **Framework Agnostic** - Works with Express, Fastify, Hapi, or any Node.js framework
- **First-class NestJS Support** - Dynamic modules, injectable services, guards & pipes
- **Full TypeScript** - Complete type definitions included
- **Security Built-in** - Webhook verification, input validation, HMAC signing
- **Payment Methods** - Credit cards, CashPlus, and more
- **Sandbox Mode** - Test without real transactions

## Installation

```bash
npm install @wiicode/youcanpay-sdk
```

## Quick Start

```typescript
import { YouCanPayClient } from '@wiicode/youcanpay-sdk';

const client = new YouCanPayClient({
  privateKey: process.env.YCP_PRIVATE_KEY,
  publicKey: process.env.YCP_PUBLIC_KEY,
  sandbox: true,
});

// Create payment
const { token } = await client.createToken({
  amount: 50000, // 500.00 MAD
  currency: 'MAD',
  customerIp: '192.168.1.1',
  successUrl: 'https://myapp.com/success',
  // orderId: 'order-123', // Optional - auto-generated if not provided
});

// Redirect user to payment page
const paymentUrl = client.getPaymentUrl(token.id);
```

## Documentation

Full documentation available in the [SDK README](./package/README.md):

- [Installation & Setup](./package/README.md#installation)
- [NestJS Integration](./package/README.md#nestjs-integration)
- [Complete Payment Flow](./package/README.md#complete-payment-flow)
- [API Reference](./package/README.md#api-reference)
- [Webhook Handling](./package/README.md#webhook-handling)
- [Database Integration](./package/README.md#database-integration)
- [Security Best Practices](./package/README.md#validation--security)
- [Testing Guide](./package/README.md#testing)

## Repository Structure

```
youcanpay/
├── package/          # SDK source code (published to npm)
│   ├── src/          # TypeScript source
│   ├── test/         # Unit tests
│   └── README.md     # Full documentation
├── backend/          # Demo NestJS app (for testing only, not part of SDK)
└── frontend/         # Demo React app (for testing only, not part of SDK)
```

> **Note:** The `backend/` and `frontend/` directories are example applications for testing and demonstration purposes. They are NOT part of the npm package. Only the `package/` directory is published to npm.

## Running the Demo (Optional)

### Prerequisites

- Node.js 18+
- PostgreSQL database
- YouCanPay sandbox credentials

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/eeyuub/youcanpay.git
cd youcanpay
```

2. **Install dependencies**
```bash
cd package && npm install && npm run build && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

3. **Configure environment**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Frontend
cp frontend/.env.example frontend/.env
```

4. **Setup database**
```bash
cd backend
npx prisma migrate dev
```

5. **Start the applications**
```bash
# Terminal 1: Backend
cd backend && npm run start:dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

6. **Open the demo**
```
http://localhost:5173
```

## Test Cards (Sandbox)

| Card Number | Result |
|-------------|--------|
| `4000 0000 0000 0002` | Success |
| `4000 0000 0000 0010` | 3D Secure |
| `4000 0000 0000 0036` | Declined |

Use any future expiry date and any 3-digit CVV.

## API Methods

| Method | Description |
|--------|-------------|
| `createToken()` | Create a payment token |
| `getPaymentUrl()` | Get checkout page URL |
| `payWithCreditCard()` | Server-side card payment |
| `payWithCashPlus()` | CashPlus payment |
| `getTransaction()` | Fetch transaction details |

## Security Utilities

| Function | Description |
|----------|-------------|
| `parseWebhookPayload()` | Parse YouCanPay webhooks |
| `verifyWebhookSecret()` | Verify webhook authenticity |
| `validateAmount()` | Validate payment amounts |
| `validateCurrency()` | Validate currency codes |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- [npm Package](https://www.npmjs.com/package/@wiicode/youcanpay-sdk)
- [YouCanPay Documentation](https://youcanpay.com/docs)
- [Open an Issue](https://github.com/eeyuub/youcanpay/issues)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

**WiiCode** - [@eeyuub](https://github.com/eeyuub)

---

Made with love in Morocco
