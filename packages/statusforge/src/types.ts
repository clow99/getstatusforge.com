export interface NormalizedError {
  code: string;
  message: string;
  status: number | null;
  retryable: boolean;
  details: Record<string, unknown> | null;
}

export interface ErrorAdapter {
  name: string;
  canHandle(input: unknown): boolean;
  normalize(input: unknown): Partial<NormalizedError>;
}

export interface NormalizeErrorOptions {
  adapters?: ErrorAdapter[];
}
