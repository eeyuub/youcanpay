export interface Transaction {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, string>;
}
