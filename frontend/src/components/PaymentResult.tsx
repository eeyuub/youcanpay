interface PaymentResultProps {
  success: boolean;
  message: string;
  onReset: () => void;
}

export function PaymentResult({ success, message, onReset }: PaymentResultProps) {
  return (
    <div className={`payment-result ${success ? 'success' : 'error'}`}>
      <div className="icon">{success ? '✓' : '✗'}</div>
      <h2>{success ? 'Payment Successful' : 'Payment Failed'}</h2>
      <p>{message}</p>
      <button onClick={onReset}>Make Another Payment</button>
    </div>
  );
}
