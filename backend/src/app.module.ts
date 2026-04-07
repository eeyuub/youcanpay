import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { YouCanPayModule } from '@wiicode/youcanpay-sdk';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate limiting: 20 requests per 60 seconds by default
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
    PrismaModule,
    YouCanPayModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: any) => ({
        privateKey: (config.get('YCP_PRIVATE_KEY') as string) || '',
        publicKey: (config.get('YCP_PUBLIC_KEY') as string) || '',
        sandbox: (config.get('YCP_SANDBOX') as string) === 'true',
      } as any),
    }),
    AuthModule,
    PaymentsModule,
  ],
})
export class AppModule {}
