import { YouCanPayLoggingOptions } from '../logging/interfaces';

export interface YouCanPayOptions {
  privateKey: string;
  publicKey: string;
  sandbox?: boolean;
  timeout?: number;
  logging?: YouCanPayLoggingOptions;
}

export interface YouCanPayAsyncOptions {
  useFactory: (...args: unknown[]) => Promise<YouCanPayOptions> | YouCanPayOptions;
  inject?: unknown[];
  imports?: unknown[];
}
