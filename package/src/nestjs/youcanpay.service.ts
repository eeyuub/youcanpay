import { Injectable, Inject } from '@nestjs/common';
import { YouCanPayClient } from '../client';
import { YouCanPayOptions } from '../interfaces';
import { YOUCANPAY_OPTIONS } from '../constants';

@Injectable()
export class YouCanPayService extends YouCanPayClient {
  constructor(@Inject(YOUCANPAY_OPTIONS) options: YouCanPayOptions) {
    super(options);
  }
}
