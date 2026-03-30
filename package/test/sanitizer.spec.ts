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
