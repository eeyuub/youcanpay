# YouCanPay SDK - Potential Improvements

This document outlines potential improvements that could make the SDK more robust and valuable.

## High Priority

### 1. Retry Logic with Exponential Backoff

Currently, API calls fail immediately on network errors. Add configurable retry logic.

```typescript
interface RetryConfig {
  maxRetries: number;      // default: 3
  baseDelayMs: number;     // default: 1000
  maxDelayMs: number;      // default: 10000
  retryOn: number[];       // HTTP codes to retry, e.g., [429, 500, 502, 503]
}
```

### 2. Request Timeout Configuration

Add configurable timeouts per operation type.

```typescript
interface TimeoutConfig {
  createToken: number;     // default: 10000ms
  payment: number;         // default: 30000ms (longer for 3DS)
  refund: number;          // default: 15000ms
  webhook: number;         // default: 5000ms
}
```

### 3. Idempotency Keys

Support idempotency keys for POST requests to prevent duplicate charges/refunds.

```typescript
await youcanpay.createRefund({
  transactionId: 'txn-123',
  amount: 10000,
  idempotencyKey: 'refund-order-456-attempt-1', // SDK generates if not provided
});
```

## Medium Priority

### 4. Circuit Breaker Pattern

Prevent cascading failures when YouCanPay API is down.

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;    // failures before opening circuit
  resetTimeoutMs: number;      // time before attempting recovery
  halfOpenRequests: number;    // test requests in half-open state
}
```

### 5. Webhook Signature Verification

Add HMAC signature verification for webhook security.

```typescript
const isValid = youcanpay.verifyWebhookSignature(
  rawBody,
  signature,      // from X-YouCanPay-Signature header
  webhookSecret,
);
```

### 6. Rate Limiting Awareness

Track rate limit headers and expose them to consumers.

```typescript
interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date;
}

const result = await youcanpay.createToken({...});
console.log(result.rateLimit); // { remaining: 98, limit: 100, resetAt: ... }
```

### 7. Request/Response Interceptors

Allow consumers to hook into request/response lifecycle.

```typescript
youcanpay.addRequestInterceptor((config) => {
  config.headers['X-Correlation-ID'] = generateCorrelationId();
  return config;
});

youcanpay.addResponseInterceptor((response) => {
  metrics.recordLatency(response.config.url, response.duration);
  return response;
});
```

## Low Priority

### 8. Metrics Collection

Built-in metrics for observability.

```typescript
interface MetricsConfig {
  enabled: boolean;
  collector: 'prometheus' | 'statsd' | 'custom';
  customHandler?: (metric: Metric) => void;
}

// Metrics emitted:
// - youcanpay_request_duration_ms
// - youcanpay_request_total (by endpoint, status)
// - youcanpay_errors_total (by type)
```

### 9. Caching for Read Operations

Cache transaction lookups to reduce API calls.

```typescript
interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;        // default: 60
  adapter: 'memory' | 'redis' | 'custom';
  redisClient?: Redis;
}

// Only applies to: getTransaction, getRefund, listRefunds
```

### 10. Better Error Classification

Structured error types for easier handling.

```typescript
class YouCanPayError extends Error {
  code: ErrorCode;
  httpStatus?: number;
  isRetryable: boolean;
  raw?: unknown;
}

enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_REQUEST = 'INVALID_REQUEST',
  CARD_DECLINED = 'CARD_DECLINED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  REFUND_FAILED = 'REFUND_FAILED',
  UNKNOWN = 'UNKNOWN',
}
```

### 11. Dry Run Mode

Test integrations without hitting the real API.

```typescript
const youcanpay = new YouCanPayClient({
  ...config,
  dryRun: true, // Returns mock responses, logs would-be requests
});
```

### 12. Health Check Endpoint

Verify API connectivity.

```typescript
const health = await youcanpay.healthCheck();
// { status: 'ok', latencyMs: 45, timestamp: '...' }
```

## Documentation Improvements

- [ ] Add JSDoc comments to all public methods
- [ ] Include example error handling in README
- [ ] Document all webhook event types
- [ ] Add migration guide for version upgrades
- [ ] Include Postman/Insomnia collection for manual testing

## Testing Improvements

- [ ] Add integration tests against sandbox API
- [ ] Add contract tests for API response shapes
- [ ] Add load tests for concurrent request handling
- [ ] Mock server for offline development

---

## Implementation Priority

If implementing, suggested order:

1. **Retry logic** - Highest ROI, prevents transient failures
2. **Better error classification** - Improves consumer error handling
3. **Webhook signature verification** - Security requirement
4. **Request timeout** - Prevents hanging requests
5. **Circuit breaker** - Production resilience

The rest can be added as needed based on actual usage patterns.
