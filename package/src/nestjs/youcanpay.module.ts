import { DynamicModule, Module, Provider } from '@nestjs/common';
import { YouCanPayService } from './youcanpay.service';
import { YouCanPayOptions, YouCanPayAsyncOptions } from '../interfaces';
import { YOUCANPAY_OPTIONS } from '../constants';

@Module({})
export class YouCanPayModule {
  static forRoot(options: YouCanPayOptions): DynamicModule {
    return {
      module: YouCanPayModule,
      providers: [
        {
          provide: YOUCANPAY_OPTIONS,
          useValue: options,
        },
        YouCanPayService,
      ],
      exports: [YouCanPayService],
      global: true,
    };
  }

  static forRootAsync(asyncOptions: YouCanPayAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: YOUCANPAY_OPTIONS,
      useFactory: asyncOptions.useFactory,
      inject: (asyncOptions.inject ?? []) as any[],
    };

    return {
      module: YouCanPayModule,
      imports: (asyncOptions.imports ?? []) as any[],
      providers: [optionsProvider, YouCanPayService],
      exports: [YouCanPayService],
      global: true,
    };
  }
}
