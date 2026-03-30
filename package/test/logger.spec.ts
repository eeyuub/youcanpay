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
