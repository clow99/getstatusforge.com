import type { ErrorAdapter } from "../types";
import { inferRetryable, isRecord, pickDetails } from "../utils";

const NODE_HTTP_CODES = new Set([
  "ECONNRESET",
  "ECONNABORTED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "EPIPE",
  "ERR_HTTP2_STREAM_ERROR"
]);

function isNodeHttpError(input: unknown): input is Record<string, unknown> {
  if (!(input instanceof Error) && !isRecord(input)) {
    return false;
  }
  const err = input as Record<string, unknown>;
  return typeof err.code === "string" && NODE_HTTP_CODES.has(err.code.toUpperCase());
}

export const nodeHttpAdapter: ErrorAdapter = {
  name: "node-http",
  canHandle: isNodeHttpError,
  normalize(input) {
    const error = input as Record<string, unknown>;
    const code = typeof error.code === "string" ? error.code : "NODE_HTTP_ERROR";
    const message =
      (typeof error.message === "string" && error.message) ||
      "Node HTTP request failed due to a network issue.";

    return {
      code,
      message,
      status: null,
      retryable: inferRetryable({ code, status: null, message }),
      details: pickDetails(error, ["name", "message", "stack", "code"])
    };
  }
};
