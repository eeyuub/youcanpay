const SENSITIVE_FIELDS = ['privateKey', 'password', 'pri_key'] as const;
const CARD_FIELDS = ['creditCard', 'credit_card', 'cardNumber', 'card_number'] as const;
const CVV_FIELDS = ['cvv', 'cvc', 'securityCode', 'security_code'] as const;

type SensitiveField = (typeof SENSITIVE_FIELDS)[number];
type CardField = (typeof CARD_FIELDS)[number];
type CvvField = (typeof CVV_FIELDS)[number];

function isSensitiveField(key: string): key is SensitiveField {
  return SENSITIVE_FIELDS.includes(key as SensitiveField);
}

function isCardField(key: string): key is CardField {
  return CARD_FIELDS.includes(key as CardField);
}

function isCvvField(key: string): key is CvvField {
  return CVV_FIELDS.includes(key as CvvField);
}

function maskCardNumber(value: string): string {
  if (value.length < 4) return '****';
  const lastFour = value.slice(-4);
  const masked = '*'.repeat(value.length - 4);
  return masked + lastFour;
}

export function sanitizeData<T extends Record<string, unknown>>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (isSensitiveField(key)) {
      result[key] = '[REDACTED]';
    } else if (isCardField(key) && typeof value === 'string') {
      result[key] = maskCardNumber(value);
    } else if (isCvvField(key)) {
      result[key] = '***';
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeData(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeData(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
