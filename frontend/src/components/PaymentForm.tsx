import { useState } from 'react';
import { createPayment, createCashPlusPayment, checkPaymentStatus, CreateCashPlusPaymentResponse } from '../api/payments';

type PaymentMethod = 'card' | 'cashplus';

export function PaymentForm() {
  const [amount, setAmount] = useState<string>('50.00');
  const [currency] = useState('MAD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashplusResult, setCashplusResult] = useState<CreateCashPlusPaymentResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const handleCheckStatus = async () => {
    if (!cashplusResult) return;

    setCheckingStatus(true);
    setPaymentStatus(null);

    try {
      const status = await checkPaymentStatus(cashplusResult.paymentId);
      if (status.status === 'COMPLETED') {
        setPaymentStatus('Payment confirmed! Thank you.');
      } else if (status.transactionStatus) {
        setPaymentStatus(`Status: ${status.transactionStatus}`);
      } else {
        setPaymentStatus('Payment still pending. Please complete payment at a CashPlus location.');
      }
    } catch (err) {
      setPaymentStatus('Could not check status. Please try again.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCreatePayment = async () => {
    setLoading(true);
    setError(null);
    setCashplusResult(null);

    try {
      const amountInCents = Math.round(parseFloat(amount) * 100);

      if (paymentMethod === 'card') {
        const response = await createPayment(amountInCents, currency);
        // Redirect to YouCanPay payment page
        window.location.href = response.paymentUrl;
      } else {
        // CashPlus payment
        const response = await createCashPlusPayment(amountInCents, currency);
        setCashplusResult(response);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment');
      setLoading(false);
    }
  };

  const formatAmount = (cents: number, curr: string) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: curr,
    }).format(cents / 100);
  };

  // If CashPlus payment was created, show the payment code
  if (cashplusResult) {
    return (
      <div className="payment-form cashplus-result">
        <h2>CashPlus Payment Code</h2>

        <div className="cashplus-code-container">
          <p className="code-label">Present this code at any CashPlus location:</p>
          <div className="cashplus-code">{cashplusResult.cashplusToken}</div>
        </div>

        <div className="payment-details">
          <p><strong>Amount:</strong> {formatAmount(cashplusResult.amount, cashplusResult.currency)}</p>
          <p><strong>Order ID:</strong> {cashplusResult.orderId}</p>
          {cashplusResult.expiresAt && (
            <p><strong>Expires:</strong> {new Date(cashplusResult.expiresAt).toLocaleString()}</p>
          )}
        </div>

        <div className="cashplus-instructions">
          <h3>How to pay:</h3>
          <ol>
            <li>Go to any CashPlus location in Morocco</li>
            <li>Tell the agent you want to make a YouCanPay payment</li>
            <li>Provide the payment code shown above</li>
            <li>Pay the amount in cash</li>
            <li>Keep your receipt as proof of payment</li>
          </ol>
        </div>

        {paymentStatus && (
          <div className={`status-message ${paymentStatus.includes('confirmed') ? 'success' : 'pending'}`}>
            {paymentStatus}
          </div>
        )}

        <div className="button-group">
          <button onClick={handleCheckStatus} disabled={checkingStatus} className="check-status-btn">
            {checkingStatus ? 'Checking...' : 'Check Payment Status'}
          </button>
          <button onClick={() => { setCashplusResult(null); setPaymentStatus(null); }} className="new-payment-btn secondary">
            Create New Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-form">
      <h2>YouCanPay Test</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="payment-method-section">
        <p className="section-label">Payment Method:</p>
        <div className="payment-methods">
          <label className={`payment-method-option ${paymentMethod === 'card' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={() => setPaymentMethod('card')}
              disabled={loading}
            />
            <span className="method-icon">💳</span>
            <span className="method-name">Credit Card</span>
          </label>
          <label className={`payment-method-option ${paymentMethod === 'cashplus' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="paymentMethod"
              value="cashplus"
              checked={paymentMethod === 'cashplus'}
              onChange={() => setPaymentMethod('cashplus')}
              disabled={loading}
            />
            <span className="method-icon">💵</span>
            <span className="method-name">CashPlus</span>
          </label>
        </div>
      </div>

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
          {loading ? 'Processing...' : paymentMethod === 'card' ? 'Pay with Card' : 'Get CashPlus Code'}
        </button>
      </div>

      <p className="info-text">
        {paymentMethod === 'card'
          ? 'You will be redirected to YouCanPay to complete payment securely.'
          : 'You will receive a payment code to use at any CashPlus location in Morocco.'}
      </p>
    </div>
  );
}
