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

export interface Payment {
  id: string;
  orderId: string;
  tokenId: string | null;
  transactionId: string | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
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
