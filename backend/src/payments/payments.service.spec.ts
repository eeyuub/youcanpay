import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const createService = () => {
    const prisma = {
      payment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const youcanpay = {
      createToken: jest.fn(),
      getPaymentUrl: jest.fn().mockReturnValue('https://youcanpay.test/payment/tok_123'),
      payWithCashPlus: jest.fn(),
      getTransaction: jest.fn(),
    };

    const config = {
      get: jest.fn(),
    };

    const service = new PaymentsService(
      prisma as never,
      youcanpay as never,
      config as unknown as ConfigService,
    );

    return { service, prisma, youcanpay, config };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the frontend URL for default redirect callbacks', async () => {
    const { service, prisma, youcanpay, config } = createService();

    config.get.mockImplementation((key: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:5173';
      return undefined;
    });
    youcanpay.createToken.mockResolvedValue({ token: { id: 'tok_123' } });
    prisma.payment.create.mockResolvedValue({ id: 'pay_123' });

    await service.createPayment('user_123', { amount: 5000, currency: 'MAD' }, '127.0.0.1');

    expect(youcanpay.createToken).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl: 'http://localhost:5173/payments/success',
        errorUrl: 'http://localhost:5173/payments/error',
      }),
    );
  });

  it('does not persist a card payment when token creation fails', async () => {
    const { service, prisma, youcanpay } = createService();

    youcanpay.createToken.mockRejectedValue(new Error('token failed'));

    await expect(
      service.createPayment('user_123', { amount: 5000, currency: 'MAD' }, '127.0.0.1'),
    ).rejects.toThrow('token failed');

    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('does not persist a CashPlus payment when initialization fails', async () => {
    const { service, prisma, youcanpay } = createService();

    youcanpay.createToken.mockResolvedValue({ token: { id: 'tok_123' } });
    youcanpay.payWithCashPlus.mockRejectedValue(new Error('cashplus failed'));

    await expect(
      service.createCashPlusPayment('user_123', { amount: 5000, currency: 'MAD' }, '127.0.0.1'),
    ).rejects.toThrow('cashplus failed');

    expect(prisma.payment.create).not.toHaveBeenCalled();
  });
});
