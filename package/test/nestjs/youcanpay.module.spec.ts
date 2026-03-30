import { Test, TestingModule } from '@nestjs/testing';
import { YouCanPayModule } from '../../src/nestjs/youcanpay.module';
import { YouCanPayService } from '../../src/nestjs/youcanpay.service';

describe('YouCanPayModule', () => {
  describe('forRoot', () => {
    it('should provide YouCanPayService', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          YouCanPayModule.forRoot({
            privateKey: 'pri_test',
            publicKey: 'pub_test',
            sandbox: true,
          }),
        ],
      }).compile();

      const service = module.get<YouCanPayService>(YouCanPayService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(YouCanPayService);
    });
  });

  describe('forRootAsync', () => {
    it('should provide YouCanPayService with async factory', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          YouCanPayModule.forRootAsync({
            useFactory: () => ({
              privateKey: 'pri_test',
              publicKey: 'pub_test',
              sandbox: true,
            }),
          }),
        ],
      }).compile();

      const service = module.get<YouCanPayService>(YouCanPayService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(YouCanPayService);
    });
  });
});
