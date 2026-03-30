interface YCPayOptions {
  formContainer: string;
  locale?: 'ar' | 'en' | 'fr';
  isSandbox?: boolean;
  errorContainer?: string;
  customCSS?: string;
}

interface YCPayInstance {
  renderAvailableGateways(): void;
  pay(tokenId: string): Promise<string>;
  selectGateway(gateway: string): void;
}

declare class YCPay {
  constructor(publicKey: string, options: YCPayOptions);
  renderAvailableGateways(): void;
  pay(tokenId: string): Promise<string>;
}

interface Window {
  YCPay: typeof YCPay;
}
