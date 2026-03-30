/**
 * Supported currencies for YouCanPay
 */
export const SUPPORTED_CURRENCIES = ['MAD', 'USD', 'EUR'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Amount validation options
 */
export interface AmountValidationOptions {
  /** Minimum amount in centimes (default: 100 = 1 MAD) */
  min?: number;
  /** Maximum amount in centimes (default: 100000000 = 1,000,000 MAD) */
  max?: number;
  /** Currency for context in error messages */
  currency?: string;
}

/**
 * URL validation options
 */
export interface URLValidationOptions {
  /** Allowed protocols (default: ['https']) */
  protocols?: string[];
  /** Allowed domains (whitelist) */
  allowedDomains?: string[];
  /** Blocked domains (blacklist) */
  blockedDomains?: string[];
  /** Allow localhost for development (default: false) */
  allowLocalhost?: boolean;
  /** Require TLD (default: true for production) */
  requireTLD?: boolean;
}

/**
 * Validate payment amount
 */
export function validateAmount(
  amount: unknown,
  options: AmountValidationOptions = {}
): ValidationResult {
  const { min = 100, max = 100000000, currency = 'centimes' } = options;

  if (amount === null || amount === undefined) {
    return { valid: false, error: 'Amount is required' };
  }

  if (typeof amount !== 'number') {
    return { valid: false, error: 'Amount must be a number' };
  }

  const numAmount = amount;

  if (!Number.isInteger(numAmount)) {
    return { valid: false, error: 'Amount must be an integer (in centimes)' };
  }

  if (numAmount < min) {
    return { valid: false, error: `Amount must be at least ${min} ${currency}` };
  }

  if (numAmount > max) {
    return { valid: false, error: `Amount must not exceed ${max} ${currency}` };
  }

  return { valid: true };
}

/**
 * Validate currency code
 */
export function validateCurrency(currency: unknown): ValidationResult {
  if (!currency || typeof currency !== 'string') {
    return { valid: false, error: 'Currency is required' };
  }

  const upperCurrency = currency.toUpperCase();

  if (!SUPPORTED_CURRENCIES.includes(upperCurrency as SupportedCurrency)) {
    return {
      valid: false,
      error: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate redirect URL (success/error URLs)
 */
export function validateRedirectURL(
  url: unknown,
  options: URLValidationOptions = {}
): ValidationResult {
  const {
    protocols = ['https', 'http'],
    allowedDomains,
    blockedDomains = [],
    allowLocalhost = true,
    requireTLD = false,
  } = options;

  if (!url) {
    return { valid: true }; // URLs are optional
  }

  if (typeof url !== 'string') {
    return { valid: false, error: 'URL must be a string' };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Check protocol
  const protocol = parsed.protocol.replace(':', '');
  if (!protocols.includes(protocol)) {
    return {
      valid: false,
      error: `URL protocol must be one of: ${protocols.join(', ')}`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check localhost
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (isLocalhost && !allowLocalhost) {
    return { valid: false, error: 'Localhost URLs are not allowed' };
  }

  // Check TLD requirement (skip for localhost)
  if (!isLocalhost && requireTLD) {
    const hasTLD = hostname.includes('.') && !hostname.endsWith('.');
    if (!hasTLD) {
      return { valid: false, error: 'URL must have a valid domain with TLD' };
    }
  }

  // Check blocked domains
  for (const blocked of blockedDomains) {
    if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
      return { valid: false, error: `Domain "${blocked}" is not allowed` };
    }
  }

  // Check allowed domains (whitelist)
  if (allowedDomains && allowedDomains.length > 0) {
    const isAllowed = allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
    if (!isAllowed) {
      return {
        valid: false,
        error: `Domain must be one of: ${allowedDomains.join(', ')}`,
      };
    }
  }

  // Check for potential open redirect patterns
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URL must not contain credentials' };
  }

  return { valid: true };
}

/**
 * Validate order ID format
 */
export function validateOrderId(orderId: unknown): ValidationResult {
  if (!orderId || typeof orderId !== 'string') {
    return { valid: false, error: 'Order ID is required' };
  }

  if (orderId.length < 1 || orderId.length > 255) {
    return { valid: false, error: 'Order ID must be between 1 and 255 characters' };
  }

  // Only allow safe characters
  const safePattern = /^[a-zA-Z0-9_\-:.]+$/;
  if (!safePattern.test(orderId)) {
    return {
      valid: false,
      error: 'Order ID contains invalid characters (allowed: alphanumeric, _, -, :, .)',
    };
  }

  return { valid: true };
}

/**
 * Validate customer IP address
 */
export function validateIP(ip: unknown): ValidationResult {
  if (!ip || typeof ip !== 'string') {
    return { valid: false, error: 'IP address is required' };
  }

  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  if (!ipv4Pattern.test(ip) && !ipv6Pattern.test(ip) && ip !== '::1') {
    return { valid: false, error: 'Invalid IP address format' };
  }

  // Validate IPv4 octets
  if (ipv4Pattern.test(ip)) {
    const octets = ip.split('.').map(Number);
    if (octets.some((octet) => octet > 255)) {
      return { valid: false, error: 'Invalid IP address: octet out of range' };
    }
  }

  return { valid: true };
}

/**
 * Validate email address
 */
export function validateEmail(email: unknown): ValidationResult {
  if (!email) {
    return { valid: true }; // Email is optional
  }

  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }

  // Basic email pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true };
}

/**
 * Validate all payment creation inputs
 */
export function validatePaymentInput(input: {
  amount: unknown;
  currency: unknown;
  orderId?: unknown;
  customerIp?: unknown;
  successUrl?: unknown;
  errorUrl?: unknown;
  customerEmail?: unknown;
}): ValidationResult {
  const checks = [
    validateAmount(input.amount),
    validateCurrency(input.currency),
    input.orderId !== undefined ? validateOrderId(input.orderId) : { valid: true },
    input.customerIp !== undefined ? validateIP(input.customerIp) : { valid: true },
    validateRedirectURL(input.successUrl),
    validateRedirectURL(input.errorUrl),
    validateEmail(input.customerEmail),
  ];

  const failed = checks.find((check) => !check.valid);
  if (failed) {
    return failed;
  }

  return { valid: true };
}

/**
 * Sanitize string input (remove potential XSS)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .trim();
}

/**
 * Convert amount from main unit to centimes
 */
export function toCentimes(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert amount from centimes to main unit
 */
export function fromCentimes(centimes: number): number {
  return centimes / 100;
}

/**
 * Format amount for display
 */
export function formatAmount(centimes: number, currency: string): string {
  const amount = fromCentimes(centimes);
  return `${amount.toFixed(2)} ${currency}`;
}
