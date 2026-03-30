import { useState, useEffect, useCallback } from 'react';

interface UseYouCanPayOptions {
  publicKey: string;
  isSandbox?: boolean;
  locale?: 'ar' | 'en' | 'fr';
  formContainer: string;
}

interface UseYouCanPayReturn {
  isReady: boolean;
  error: string | null;
  renderGateways: () => void;
  pay: (tokenId: string) => Promise<string>;
}

export function useYouCanPay(options: UseYouCanPayOptions): UseYouCanPayReturn {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ycpay, setYcpay] = useState<YCPayInstance | null>(null);

  useEffect(() => {
    const initYCPay = () => {
      try {
        if (typeof window.YCPay === 'undefined') {
          setError('YCPay script not loaded');
          return;
        }

        const instance = new window.YCPay(options.publicKey, {
          formContainer: options.formContainer,
          locale: options.locale || 'fr',
          isSandbox: options.isSandbox ?? true,
        });

        setYcpay(instance);
        setIsReady(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize YCPay');
      }
    };

    if (typeof window.YCPay !== 'undefined') {
      initYCPay();
    } else {
      const checkInterval = setInterval(() => {
        if (typeof window.YCPay !== 'undefined') {
          clearInterval(checkInterval);
          initYCPay();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isReady) {
          setError('YCPay script load timeout');
        }
      }, 10000);

      return () => clearInterval(checkInterval);
    }
  }, [options.publicKey, options.formContainer, options.locale, options.isSandbox]);

  const renderGateways = useCallback(() => {
    if (ycpay) {
      ycpay.renderAvailableGateways();
    }
  }, [ycpay]);

  const pay = useCallback(
    async (tokenId: string): Promise<string> => {
      if (!ycpay) {
        throw new Error('YCPay not initialized');
      }
      return ycpay.pay(tokenId);
    },
    [ycpay],
  );

  return { isReady, error, renderGateways, pay };
}
