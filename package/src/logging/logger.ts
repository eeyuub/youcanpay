import { v4 as uuidv4 } from 'uuid';
import { YouCanPayLoggingOptions, YouCanPayLogEntry, LogAction, LogStatus } from './interfaces';
import { sanitizeData } from './sanitizer';

export class YouCanPayLogger {
  constructor(private readonly options?: YouCanPayLoggingOptions) {}

  async log(
    action: LogAction,
    request: Record<string, unknown>,
    response: Record<string, unknown> | undefined,
    status: LogStatus,
    durationMs?: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.options?.enabled) {
      return;
    }

    const logEntry: YouCanPayLogEntry = {
      id: uuidv4(),
      action,
      request: sanitizeData(request),
      response: response ? sanitizeData(response) : undefined,
      status,
      durationMs,
      metadata,
      createdAt: new Date(),
    };

    try {
      if (this.options.storage === 'custom' && this.options.handler) {
        await this.options.handler(logEntry);
      } else if (this.options.storage === 'database' && this.options.repository) {
        await this.options.repository.create(logEntry);
      }
    } catch {
      // Fire-and-forget: logging failures should not affect main operation
    }
  }
}
