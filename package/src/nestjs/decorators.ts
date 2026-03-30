import { Inject } from '@nestjs/common';
import { YouCanPayService } from './youcanpay.service';

export const InjectYouCanPay = (): ReturnType<typeof Inject> => Inject(YouCanPayService);
