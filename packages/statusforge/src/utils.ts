import type { NormalizedError } from "./types";

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNABORTED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT"
]);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function asStatus(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed >= 100 && parsed <= 599) {
      return parsed;
    }
  }
  return null;
}

export function normalizeCode(value: unknown, fallback = "UNKNOWN_ERROR"): string {
  const input = asString(value);
  if (!input) {
    return fallback;
  }
  const normalized = input
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return normalized || fallback;
}

export function inferRetryable(input: {
  status?: number | null;
  code?: string | null;
  message?: string | null;
}): boolean {
  if (typeof input.status === "number" && RETRYABLE_STATUS_CODES.has(input.status)) {
    return true;
  }

  const code = input.code ? input.code.toUpperCase() : null;
  if (code && RETRYABLE_NETWORK_CODES.has(code)) {
    return true;
  }

  const message = input.message?.toLowerCase() ?? "";
  if (
    message.includes("timeout") ||
    message.includes("network error") ||
    message.includes("fetch failed") ||
    message.includes("temporar")
  ) {
    return true;
  }

  if (message.includes("abort")) {
    return false;
  }

  return false;
}

export function pickDetails(
  source: Record<string, unknown>,
  excludedKeys: string[]
): Record<string, unknown> | null {
  const details = Object.entries(source).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (!excludedKeys.includes(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});

  return Object.keys(details).length > 0 ? details : null;
}

export function normalized(input: Partial<NormalizedError>): NormalizedError {
  const status = asStatus(input.status) ?? null;
  const code = normalizeCode(input.code, status ? `HTTP_${status}` : "UNKNOWN_ERROR");
  const message = asString(input.message) ?? "An unexpected error occurred.";
  const retryable =
    typeof input.retryable === "boolean"
      ? input.retryable
      : inferRetryable({
          status,
          code,
          message
        });
  const details = isRecord(input.details) ? input.details : null;

  return {
    code,
    message,
    status,
    retryable,
    details
  };
}

export function extractMessageFromBody(body: unknown): string | null {
  if (typeof body === "string") {
    return body;
  }
  if (!isRecord(body)) {
    return null;
  }

  const knownFields = ["message", "error", "title", "detail", "description"];
  for (const field of knownFields) {
    const value = body[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    if (isRecord(value) && typeof value.message === "string") {
      return value.message;
    }
  }
  return null;
}
