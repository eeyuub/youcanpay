import axios from 'axios';
import { YouCanPayClient } from '../src/client';
import { YouCanPayError, ErrorCodes } from '../src/errors';
import { CurrencyCode, Lang } from '../src/enums';
import {
  YOUCANPAY_BASE_URL,
  YOUCANPAY_SANDBOX_BASE_URL,
  YOUCANPAY_PAYMENT_URL,
  YOUCANPAY_SANDBOX_PAYMENT_URL,
  YOUCANPAY_TRANSACTION_API_URL,
  YOUCANPAY_SANDBOX_TRANSACTION_API_URL,
} from '../src/constants';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

type AxiosInstanceMock = {
  post: jest.Mock;
  get: jest.Mock;
};

describe('YouCanPayClient', () => {
  let client: YouCanPayClient;
  let sandboxClient: YouCanPayClient;
  let axiosInstances: AxiosInstanceMock[];

  beforeEach(() => {
    jest.clearAllMocks();
    axiosInstances = [];

    mockedAxios.create.mockImplementation(() => {
      const instance: AxiosInstanceMock = {
        post: jest.fn(),
        get: jest.fn(),
      };
      axiosInstances.push(instance);
      return instance as unknown as jest.Mocked<typeof axios>;
    });

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

  const productionHttpMock = () => axiosInstances[0];
  const productionTransactionHttpMock = () => axiosInstances[1];
  const sandboxHttpMock = () => axiosInstances[2];
  const sandboxTransactionHttpMock = () => axiosInstances[3];

  describe('constructor', () => {
    it('should use production API URLs when sandbox is false', () => {
      expect(mockedAxios.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          baseURL: YOUCANPAY_BASE_URL,
        }),
      );
      expect(mockedAxios.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          baseURL: YOUCANPAY_TRANSACTION_API_URL,
        }),
      );
    });

    it('should use sandbox API URLs when sandbox is true', () => {
      expect(mockedAxios.create).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          baseURL: YOUCANPAY_SANDBOX_BASE_URL,
        }),
      );
      expect(mockedAxios.create).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          baseURL: YOUCANPAY_SANDBOX_TRANSACTION_API_URL,
        }),
      );
    });

    it('should reject invalid client options', () => {
      expect(
        () =>
          new YouCanPayClient({
            privateKey: '',
            publicKey: 'pub_test_key',
          }),
      ).toThrow(YouCanPayError);
    });
  });

  describe('createToken', () => {
    it('should send correct form data to /tokenize', async () => {
      const mockResponse = { data: { token: { id: 'tok_123' } } };
      const httpMock = productionHttpMock();
      httpMock.post.mockResolvedValue(mockResponse);

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
      const httpMock = productionHttpMock();
      httpMock.post.mockRejectedValue({
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

    it('should reject invalid input before calling the API', async () => {
      await expect(
        client.createToken({
          amount: 50,
          currency: CurrencyCode.MAD,
          customerIp: '127.0.0.1',
          successUrl: 'https://example.com/success',
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.VALIDATION_ERROR });

      expect(productionHttpMock().post).not.toHaveBeenCalled();
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
      const httpMock = productionHttpMock();
      httpMock.post.mockResolvedValue(mockResponse);

      const result = await client.payWithCreditCard({
        tokenId: 'tok_123',
        creditCard: '4111111111111111',
        expireDate: '12/99',
        cvv: '123',
        cardHolderName: 'John Doe',
      });

      expect(httpMock.post).toHaveBeenCalledWith('/pay', expect.any(URLSearchParams));
      expect(result.success).toBe(true);
      expect(result.transaction_id).toBe('txn_123');
    });

    it('should reject invalid card input before calling the API', async () => {
      await expect(
        client.payWithCreditCard({
          tokenId: 'tok_123',
          creditCard: '4111111111111112',
          expireDate: '12/99',
          cvv: '123',
          cardHolderName: 'John Doe',
        }),
      ).rejects.toMatchObject({ code: ErrorCodes.VALIDATION_ERROR });

      expect(productionHttpMock().post).not.toHaveBeenCalled();
    });
  });

  describe('payWithCashPlus', () => {
    it('should send correct form data to /cashplus/init', async () => {
      const mockResponse = {
        data: {
          transaction_id: 'txn_123',
          token: 'cp115705252',
        },
      };
      const httpMock = productionHttpMock();
      httpMock.post.mockResolvedValue(mockResponse);

      const result = await client.payWithCashPlus({ tokenId: 'tok_123' });

      expect(httpMock.post).toHaveBeenCalledWith('/cashplus/init', expect.any(URLSearchParams));
      expect(result.token).toBe('cp115705252');
    });

    it('should reject an empty token ID before calling the API', async () => {
      await expect(client.payWithCashPlus({ tokenId: '' })).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_ERROR,
      });

      expect(productionHttpMock().post).not.toHaveBeenCalled();
    });
  });

  describe('getTransaction', () => {
    it('should query the dedicated transaction API', async () => {
      const transactionMock = productionTransactionHttpMock();
      transactionMock.get.mockResolvedValue({
        data: {
          id: 'txn_123',
          order_id: 'order_123',
          amount: 5000,
          currency: 'MAD',
          status: 'paid',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      });

      const result = await client.getTransaction('txn_123');

      expect(transactionMock.get).toHaveBeenCalledWith('/transactions/txn_123', {
        params: { pri_key: 'pri_test_key' },
      });
      expect(result.status).toBe('paid');
    });

    it('should configure a separate transaction API client for sandbox mode', () => {
      expect(sandboxTransactionHttpMock()).toBeDefined();
      expect(sandboxHttpMock()).toBeDefined();
    });

    it('should reject an empty transaction ID before calling the API', async () => {
      await expect(client.getTransaction('')).rejects.toMatchObject({
        code: ErrorCodes.VALIDATION_ERROR,
      });

      expect(productionTransactionHttpMock().get).not.toHaveBeenCalled();
    });
  });

  describe('verifyWebhook', () => {
    it('should return true for the current nested webhook payload', () => {
      const payload = {
        id: 'webhook-123',
        event_name: 'transaction.paid',
        sandbox: true,
        payload: {
          transaction: {
            id: 'txn_123',
            status: 1,
            order_id: 'order_123',
            amount: '5000',
            currency: 'MAD',
            created_at: '2026-01-01T00:00:00Z',
          },
        },
      };

      expect(client.verifyWebhook(payload)).toBe(true);
    });

    it('should keep supporting the legacy flat payload shape', () => {
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
