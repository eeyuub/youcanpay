import {
  validateAmount,
  validateCurrency,
  validateRedirectURL,
  validateOrderId,
  validateIP,
  validateEmail,
  validateTokenId,
  validateTimeout,
  validateClientOptions,
  validateCardNumber,
  validateExpiryDate,
  validateCVV,
  validateCardHolderName,
  validatePaymentInput,
  toCentimes,
  fromCentimes,
  formatAmount,
  SUPPORTED_CURRENCIES,
} from '../../src/security/validators';

describe('Validators', () => {
  describe('validateAmount', () => {
    it('should accept valid amounts', () => {
      expect(validateAmount(100).valid).toBe(true);
      expect(validateAmount(50000).valid).toBe(true);
      expect(validateAmount(1000000).valid).toBe(true);
    });

    it('should reject amounts below minimum', () => {
      const result = validateAmount(50);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least');
    });

    it('should reject amounts above maximum', () => {
      const result = validateAmount(999999999);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed');
    });

    it('should reject non-integer amounts', () => {
      const result = validateAmount(100.5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('integer');
    });

    it('should reject non-numeric values', () => {
      expect(validateAmount('100').valid).toBe(false);
      expect(validateAmount(null).valid).toBe(false);
      expect(validateAmount(undefined).valid).toBe(false);
    });

    it('should respect custom min/max options', () => {
      expect(validateAmount(50, { min: 50 }).valid).toBe(true);
      expect(validateAmount(200, { max: 100 }).valid).toBe(false);
    });
  });

  describe('validateCurrency', () => {
    it('should accept supported currencies', () => {
      expect(validateCurrency('MAD').valid).toBe(true);
      expect(validateCurrency('USD').valid).toBe(true);
      expect(validateCurrency('EUR').valid).toBe(true);
    });

    it('should accept lowercase currencies', () => {
      expect(validateCurrency('mad').valid).toBe(true);
    });

    it('should reject unsupported currencies', () => {
      const result = validateCurrency('GBP');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('MAD, USD, EUR');
    });

    it('should reject empty/null values', () => {
      expect(validateCurrency('').valid).toBe(false);
      expect(validateCurrency(null).valid).toBe(false);
    });
  });

  describe('validateRedirectURL', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(validateRedirectURL('https://example.com/success').valid).toBe(true);
    });

    it('should accept valid HTTP URLs by default', () => {
      expect(validateRedirectURL('http://example.com/success').valid).toBe(true);
    });

    it('should accept localhost when allowed', () => {
      expect(validateRedirectURL('http://localhost:3000/success').valid).toBe(true);
    });

    it('should reject localhost when not allowed', () => {
      const result = validateRedirectURL('http://localhost:3000', {
        allowLocalhost: false,
      });
      expect(result.valid).toBe(false);
    });

    it('should accept empty/undefined URLs (optional)', () => {
      expect(validateRedirectURL('').valid).toBe(true);
      expect(validateRedirectURL(undefined).valid).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateRedirectURL('not-a-url').valid).toBe(false);
      expect(validateRedirectURL('ftp://example.com').valid).toBe(false);
    });

    it('should reject blocked domains', () => {
      const result = validateRedirectURL('https://evil.com/callback', {
        blockedDomains: ['evil.com'],
      });
      expect(result.valid).toBe(false);
    });

    it('should only allow whitelisted domains', () => {
      const options = { allowedDomains: ['myapp.com'] };
      expect(validateRedirectURL('https://myapp.com/success', options).valid).toBe(true);
      expect(validateRedirectURL('https://other.com/success', options).valid).toBe(false);
    });

    it('should reject URLs with credentials', () => {
      const result = validateRedirectURL('https://user:pass@example.com');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('credentials');
    });
  });

  describe('validateOrderId', () => {
    it('should accept valid order IDs', () => {
      expect(validateOrderId('order-123').valid).toBe(true);
      expect(validateOrderId('abc_def').valid).toBe(true);
      expect(validateOrderId('uuid-123-456').valid).toBe(true);
    });

    it('should reject empty order IDs', () => {
      expect(validateOrderId('').valid).toBe(false);
      expect(validateOrderId(null).valid).toBe(false);
    });

    it('should reject order IDs with invalid characters', () => {
      expect(validateOrderId('order<script>').valid).toBe(false);
      expect(validateOrderId('order id').valid).toBe(false);
    });
  });

  describe('validateIP', () => {
    it('should accept valid IPv4 addresses', () => {
      expect(validateIP('192.168.1.1').valid).toBe(true);
      expect(validateIP('127.0.0.1').valid).toBe(true);
      expect(validateIP('8.8.8.8').valid).toBe(true);
    });

    it('should accept valid IPv6 addresses', () => {
      expect(validateIP('::1').valid).toBe(true);
      expect(validateIP('2001:db8::1').valid).toBe(true);
    });

    it('should reject invalid IPs', () => {
      expect(validateIP('256.1.1.1').valid).toBe(false);
      expect(validateIP('not-an-ip').valid).toBe(false);
      expect(validateIP('').valid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com').valid).toBe(true);
      expect(validateEmail('user.name@domain.co.uk').valid).toBe(true);
    });

    it('should accept empty emails (optional)', () => {
      expect(validateEmail('').valid).toBe(true);
      expect(validateEmail(null).valid).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('not-an-email').valid).toBe(false);
      expect(validateEmail('@domain.com').valid).toBe(false);
      expect(validateEmail('user@').valid).toBe(false);
    });
  });

  describe('validateTokenId', () => {
    it('should accept valid token IDs', () => {
      expect(validateTokenId('tok_123').valid).toBe(true);
    });

    it('should reject empty token IDs', () => {
      expect(validateTokenId('').valid).toBe(false);
    });
  });

  describe('validateTimeout', () => {
    it('should accept undefined and positive numbers', () => {
      expect(validateTimeout(undefined).valid).toBe(true);
      expect(validateTimeout(30000).valid).toBe(true);
    });

    it('should reject zero, negative, and non-number values', () => {
      expect(validateTimeout(0).valid).toBe(false);
      expect(validateTimeout(-1).valid).toBe(false);
      expect(validateTimeout('1000').valid).toBe(false);
    });
  });

  describe('validateClientOptions', () => {
    it('should accept valid SDK options', () => {
      expect(
        validateClientOptions({
          privateKey: 'pri_test',
          publicKey: 'pub_test',
          timeout: 1000,
        }).valid,
      ).toBe(true);
    });

    it('should reject missing keys', () => {
      expect(validateClientOptions({ publicKey: 'pub_test' }).valid).toBe(false);
      expect(validateClientOptions({ privateKey: 'pri_test' }).valid).toBe(false);
    });
  });

  describe('card validation helpers', () => {
    it('should validate card numbers using Luhn', () => {
      expect(validateCardNumber('4111111111111111').valid).toBe(true);
      expect(validateCardNumber('4111111111111112').valid).toBe(false);
    });

    it('should validate expiry dates', () => {
      expect(validateExpiryDate('12/99').valid).toBe(true);
      expect(validateExpiryDate('13/30').valid).toBe(false);
      expect(validateExpiryDate('01/20').valid).toBe(false);
    });

    it('should validate CVV values', () => {
      expect(validateCVV('123').valid).toBe(true);
      expect(validateCVV('1234').valid).toBe(true);
      expect(validateCVV('12').valid).toBe(false);
    });

    it('should validate card holder names', () => {
      expect(validateCardHolderName('Jane Doe').valid).toBe(true);
      expect(validateCardHolderName('').valid).toBe(false);
    });
  });

  describe('validatePaymentInput', () => {
    it('should validate complete valid input', () => {
      const result = validatePaymentInput({
        amount: 5000,
        currency: 'MAD',
        orderId: 'order-123',
        customerIp: '192.168.1.1',
        successUrl: 'https://example.com/success',
        errorUrl: 'https://example.com/error',
        customerEmail: 'test@example.com',
      });
      expect(result.valid).toBe(true);
    });

    it('should return first validation error', () => {
      const result = validatePaymentInput({
        amount: 50, // Too low
        currency: 'MAD',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least');
    });
  });

  describe('Amount utilities', () => {
    it('should convert to centimes', () => {
      expect(toCentimes(10)).toBe(1000);
      expect(toCentimes(99.99)).toBe(9999);
    });

    it('should convert from centimes', () => {
      expect(fromCentimes(1000)).toBe(10);
      expect(fromCentimes(9999)).toBe(99.99);
    });

    it('should format amount correctly', () => {
      expect(formatAmount(50000, 'MAD')).toBe('500.00 MAD');
      expect(formatAmount(9999, 'USD')).toBe('99.99 USD');
    });
  });

  describe('SUPPORTED_CURRENCIES', () => {
    it('should include expected currencies', () => {
      expect(SUPPORTED_CURRENCIES).toContain('MAD');
      expect(SUPPORTED_CURRENCIES).toContain('USD');
      expect(SUPPORTED_CURRENCIES).toContain('EUR');
    });
  });
});
