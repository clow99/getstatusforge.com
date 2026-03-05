import type { ErrorAdapter } from "../types";
import {
  asStatus,
  extractMessageFromBody,
  inferRetryable,
  isRecord,
  pickDetails
} from "../utils";

function extractStatus(input: Record<string, unknown>): number | null {
  return asStatus(input.status) ?? asStatus(input.statusCode) ?? asStatus(input.httpStatus);
}

function extractCode(input: Record<string, unknown>, status: number | null): string {
  if (typeof input.code === "string") {
    return input.code;
  }
  if (typeof input.errorCode === "string") {
    return input.errorCode;
  }

  const nestedError = isRecord(input.error) ? input.error : null;
  if (typeof nestedError?.code === "string") {
    return nestedError.code;
  }
  return status ? `HTTP_${status}` : "UNKNOWN_ERROR";
}

function extractMessage(input: Record<string, unknown>, status: number | null): string {
  const direct =
    (typeof input.message === "string" && input.message) ||
    (typeof input.error === "string" && input.error) ||
    (typeof input.detail === "string" && input.detail) ||
    (typeof input.title === "string" && input.title);
  if (direct) {
    return direct;
  }

  const nestedError = isRecord(input.error) ? input.error : null;
  if (typeof nestedError?.message === "string" && nestedError.message) {
    return nestedError.message;
  }

  const bodyMessage = extractMessageFromBody(input);
  if (bodyMessage) {
    return bodyMessage;
  }

  return status ? `HTTP request failed with status ${status}.` : "An unexpected error occurred.";
}

export const genericAdapter: ErrorAdapter = {
  name: "generic",
  canHandle() {
    return true;
  },
  normalize(input) {
    if (typeof input === "string") {
      return {
        code: "THROWN_STRING",
        message: input,
        status: null,
        retryable: inferRetryable({ message: input, status: null, code: "THROWN_STRING" }),
        details: { original: input }
      };
    }

    if (input instanceof Error) {
      const err = input as Error & { code?: string; status?: number };
      const status = asStatus(err.status);
      const code = err.code ?? (status ? `HTTP_${status}` : err.name || "UNEXPECTED_ERROR");
      return {
        code,
        message: err.message || "An unexpected error occurred.",
        status,
        retryable: inferRetryable({ code, status, message: err.message }),
        details: {
          name: err.name,
          stack: err.stack,
          cause: (err as unknown as { cause?: unknown }).cause
        }
      };
    }

    if (isRecord(input)) {
      const status = extractStatus(input);
      const code = extractCode(input, status);
      const message = extractMessage(input, status);
      const retryable =
        typeof input.retryable === "boolean"
          ? input.retryable
          : inferRetryable({ status, code, message });
      const details =
        isRecord(input.details) && Object.keys(input.details).length > 0
          ? input.details
          : pickDetails(input, [
              "code",
              "errorCode",
              "message",
              "error",
              "detail",
              "title",
              "status",
              "statusCode",
              "httpStatus",
              "retryable",
              "details"
            ]);

      return {
        code,
        message,
        status,
        retryable,
        details
      };
    }

    return {
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred.",
      status: null,
      retryable: false,
      details: null
    };
  }
};
