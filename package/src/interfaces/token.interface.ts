import { CurrencyCode } from '../enums';

export interface CustomerInfo {
  name?: string;
  address?: string;
  zip_code?: string;
  city?: string;
  state?: string;
  country_code?: string;
  phone?: string;
  email?: string;
}

export interface CreateTokenParams {
  orderId?: string;
  amount: number;
  currency: CurrencyCode | string;
  customerIp: string;
  successUrl: string;
  errorUrl?: string;
  customer?: CustomerInfo;
  metadata?: Record<string, string>;
}

export interface TokenResponse {
  token: {
    id: string;
  };
}
