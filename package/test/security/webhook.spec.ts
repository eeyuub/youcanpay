import {
  parseWebhookPayload,
  verifyWebhookSecret,
  verifyWebhookHMAC,
  createWebhookSignature,
  WebhookParseError,
} from '../../src/security/webhook';

describe('Webhook Security', () => {
  const validPayload = {
    id: 'webhook-123',
    event_name: 'transaction.paid',
    sandbox: true,
    payload: {
      transaction: {
        id: 'txn-456',
        status: 1,
        order_id: 'order-789',
        amount: '50000',
        currency: 'MAD',
        created_at: '2026-03-30T12:00:00.000000Z',
      },
      token: {
        id: 'token-abc',
      },
      payment_method: {
        id: 1,
        name: 'credit_card',
        card: {
          id: 'card-123',
          last_digits: '4242',
          fingerprint: 'abc123',
          is_3d_secure: true,
        },
      },
    },
  };

  describe('parseWebhookPayload', () => {
    it('should parse valid payload correctly', () => {
      const result = parseWebhookPayload(validPayload);

      expect(result.webhookId).toBe('webhook-123');
      expect(result.eventName).toBe('transaction.paid');
      expect(result.sandbox).toBe(true);
      expect(result.transactionId).toBe('txn-456');
      expect(result.orderId).toBe('order-789');
      expect(result.amount).toBe(50000);
      expect(result.currency).toBe('MAD');
      expect(result.status).toBe('paid');
      expect(result.isSuccess).toBe(true);
      expect(result.tokenId).toBe('token-abc');
      expect(result.cardLastDigits).toBe('4242');
      expect(result.is3DSecure).toBe(true);
    });

    it('should detect paid status from status=1', () => {
      const result = parseWebhookPayload(validPayload);
      expect(result.status).toBe('paid');
      expect(result.isSuccess).toBe(true);
    });

    it('should detect failed status from event_name', () => {
      const failedPayload = {
        ...validPayload,
        event_name: 'transaction.failed',
        payload: {
          ...validPayload.payload,
          transaction: {
            ...validPayload.payload.transaction,
            status: 0,
          },
        },
      };
      const result = parseWebhookPayload(failedPayload);
      expect(result.status).toBe('failed');
      expect(result.isSuccess).toBe(false);
    });

    it('should throw on invalid payload (not an object)', () => {
      expect(() => parseWebhookPayload(null)).toThrow(WebhookParseError);
      expect(() => parseWebhookPayload('string')).toThrow(WebhookParseError);
      expect(() => parseWebhookPayload(123)).toThrow(WebhookParseError);
    });

    it('should throw on missing required fields', () => {
      expect(() => parseWebhookPayload({})).toThrow(WebhookParseError);
      expect(() => parseWebhookPayload({ id: '123' })).toThrow(WebhookParseError);
    });

    it('should throw on missing transaction data', () => {
      expect(() =>
        parseWebhookPayload({
          id: '123',
          event_name: 'transaction.paid',
          payload: {},
        })
      ).toThrow(WebhookParseError);
    });

    it('should include raw payload in result', () => {
      const result = parseWebhookPayload(validPayload);
      expect(result.raw).toEqual(validPayload);
    });
  });

  describe('verifyWebhookSecret', () => {
    const secret = 'my-webhook-secret';

    it('should verify secret from query parameter', () => {
      const result = verifyWebhookSecret({
        secret,
        query: { secret: 'my-webhook-secret' },
      });
      expect(result).toBe(true);
    });

    it('should verify secret from header', () => {
      const result = verifyWebhookSecret({
        secret,
        headers: { 'x-ycp-signature': 'my-webhook-secret' },
      });
      expect(result).toBe(true);
    });

    it('should reject invalid secret', () => {
      const result = verifyWebhookSecret({
        secret,
        query: { secret: 'wrong-secret' },
      });
      expect(result).toBe(false);
    });

    it('should reject missing secret', () => {
      const result = verifyWebhookSecret({
        secret,
        query: {},
      });
      expect(result).toBe(false);
    });

    it('should support custom query parameter name', () => {
      const result = verifyWebhookSecret({
        secret,
        query: { token: 'my-webhook-secret' },
        secretParam: 'token',
      });
      expect(result).toBe(true);
    });

    it('should support custom header name', () => {
      const result = verifyWebhookSecret({
        secret,
        headers: { 'x-custom-sig': 'my-webhook-secret' },
        signatureHeader: 'x-custom-sig',
      });
      expect(result).toBe(true);
    });

    it('should throw if secret not provided', () => {
      expect(() =>
        verifyWebhookSecret({
          secret: '',
          query: { secret: 'test' },
        })
      ).toThrow();
    });
  });

  describe('HMAC verification', () => {
    const secret = 'hmac-secret';
    const payload = JSON.stringify({ test: 'data' });

    it('should create and verify HMAC signature', () => {
      const signature = createWebhookSignature(payload, secret);
      const isValid = verifyWebhookHMAC(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const isValid = verifyWebhookHMAC(payload, 'invalid-signature', secret);
      expect(isValid).toBe(false);
    });

    it('should reject tampered payload', () => {
      const signature = createWebhookSignature(payload, secret);
      const tamperedPayload = JSON.stringify({ test: 'tampered' });
      const isValid = verifyWebhookHMAC(tamperedPayload, signature, secret);
      expect(isValid).toBe(false);
    });

    it('should support sha512 algorithm', () => {
      const signature = createWebhookSignature(payload, secret, 'sha512');
      const isValid = verifyWebhookHMAC(payload, signature, secret, 'sha512');
      expect(isValid).toBe(true);
    });

    it('should accept object payload', () => {
      const objPayload = { test: 'data' };
      const signature = createWebhookSignature(objPayload, secret);
      expect(signature).toBeTruthy();
    });
  });
});
