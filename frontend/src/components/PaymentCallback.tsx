import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface VerifyResponse {
  verified: boolean;
  status?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  pending?: boolean;
  error?: string;
}

export function PaymentCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading');
  const [details, setDetails] = useState<{
    transactionId?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    message?: string;
  }>({});

  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      const transactionId = params.get('transaction_id') || '';
      const orderId = params.get('order_id') || '';

      if (!orderId || !transactionId) {
        setStatus('error');
        setDetails({ message: 'Missing payment information' });
        return;
      }

      try {
        // SECURE: Verify payment with backend instead of trusting URL params
        const response = await fetch(
          `${API_BASE}/payments/verify?order_id=${orderId}&transaction_id=${transactionId}`
        );
        const data: VerifyResponse = await response.json();

        if (data.verified) {
          setStatus('success');
          setDetails({
            transactionId: data.transactionId,
            orderId,
            amount: data.amount,
            currency: data.currency,
            message: 'Payment verified successfully',
          });
        } else if (data.pending) {
          setStatus('pending');
          setDetails({
            orderId,
            message: 'Payment is being processed. Please wait...',
          });
          // Retry verification after a few seconds
          setTimeout(verifyPayment, 3000);
        } else {
          setStatus('error');
          setDetails({
            orderId,
            message: data.error || 'Payment verification failed',
          });
        }
      } catch (err) {
        setStatus('error');
        setDetails({
          message: 'Failed to verify payment. Please contact support.',
        });
      }
    };

    verifyPayment();
  }, []);

  const handleBackToApp = () => {
    window.location.href = '/';
  };

  if (status === 'loading') {
    return (
      <div className="payment-callback">
        <div className="callback-card loading">
          <div className="spinner"></div>
          <h2>Verifying Payment...</h2>
          <p>Please wait while we securely verify your payment.</p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="payment-callback">
        <div className="callback-card pending">
          <div className="spinner"></div>
          <h2>Payment Processing</h2>
          <p>{details.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-callback">
      <div className={`callback-card ${status}`}>
        <div className="icon">{status === 'success' ? '✓' : '✗'}</div>
        <h2>{status === 'success' ? 'Payment Verified' : 'Payment Failed'}</h2>

        {details.amount && details.currency && (
          <p className="amount">{(details.amount / 100).toFixed(2)} {details.currency}</p>
        )}
        {details.transactionId && (
          <p><strong>Transaction ID:</strong> {details.transactionId}</p>
        )}
        {details.orderId && (
          <p><strong>Order ID:</strong> {details.orderId}</p>
        )}
        {details.message && (
          <p className="message">{details.message}</p>
        )}

        <button onClick={handleBackToApp}>Back to App</button>
      </div>
    </div>
  );
}
