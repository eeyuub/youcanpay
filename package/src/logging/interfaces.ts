export type LogAction = 'createToken' | 'payWithCreditCard' | 'payWithCashPlus' | 'webhook' | 'getTransaction' | 'createRefund' | 'getRefund' | 'listRefunds';
export type LogStatus = 'success' | 'error';
export type LogStorage = 'database' | 'custom' | 'none';

export interface YouCanPayLogEntry {
  id: string;
  action: LogAction;
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
  status: LogStatus;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface YouCanPayLogRepository {
  create(data: Omit<YouCanPayLogEntry, 'id'>): Promise<YouCanPayLogEntry>;
}

export interface YouCanPayLoggingOptions {
  enabled: boolean;
  storage?: LogStorage;
  handler?: (log: YouCanPayLogEntry) => Promise<void>;
  repository?: YouCanPayLogRepository;
}
