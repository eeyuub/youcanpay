const API_BASE = import.meta.env.VITE_API_URL || '/api';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

export interface CreatePaymentResponse {
  paymentId: string;
  tokenId: string;
  paymentUrl: string;
}

export interface CreateCashPlusPaymentResponse {
  paymentId: string;
  orderId: string;
  cashplusToken: string;
  transactionId: string;
  amount: number;
  currency: string;
  message?: string;
  expiresAt?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  tokenId: string | null;
  transactionId: string | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paymentMethod: 'CARD' | 'CASHPLUS';
  cashplusToken: string | null;
  createdAt: string;
}

export async function createPayment(
  amount: number,
  currency: string,
): Promise<CreatePaymentResponse> {
  const response = await fetch(`${API_BASE}/payments/create-token`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount, currency }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create payment');
  }

  return response.json();
}

export async function createCashPlusPayment(
  amount: number,
  currency: string,
): Promise<CreateCashPlusPaymentResponse> {
  const response = await fetch(`${API_BASE}/payments/cashplus`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ amount, currency }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create CashPlus payment');
  }

  return response.json();
}

export async function getPayment(id: string): Promise<Payment> {
  const response = await fetch(`${API_BASE}/payments/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payment');
  }

  return response.json();
}

export async function getPayments(): Promise<Payment[]> {
  const response = await fetch(`${API_BASE}/payments`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payments');
  }

  return response.json();
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  transactionStatus?: string;
  cashplusToken?: string;
  amount?: number;
  currency?: string;
  message?: string;
  error?: string;
}

export async function checkPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
  const response = await fetch(`${API_BASE}/payments/${paymentId}/status`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to check payment status');
  }

  return response.json();
}
