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
