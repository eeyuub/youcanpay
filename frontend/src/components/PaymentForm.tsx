import { useState } from 'react';
import { createPayment } from '../api/payments';

export function PaymentForm() {
  const [amount, setAmount] = useState<string>('50.00');
  const [currency] = useState('MAD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreatePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100);
      const response = await createPayment(amountInCents, currency);

      // Redirect to YouCanPay payment page
      window.location.href = response.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment');
      setLoading(false);
    }
  };

  return (
    <div className="payment-form">
      <h2>YouCanPay Test</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="amount-section">
        <label>
          Amount ({currency}):
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="0.01"
            disabled={loading}
          />
        </label>
        <button onClick={handleCreatePayment} disabled={loading}>
          {loading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>

      <p className="info-text">
        You will be redirected to YouCanPay to complete payment securely.
      </p>
    </div>
  );
}
