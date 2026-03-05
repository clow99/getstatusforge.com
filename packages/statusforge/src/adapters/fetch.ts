import type { ErrorAdapter } from "../types";
import {
  asStatus,
  extractMessageFromBody,
  inferRetryable,
  isRecord,
  pickDetails
} from "../utils";

function isFetchResponseLike(input: unknown): input is Record<string, unknown> {
  if (!isRecord(input)) {
    return false;
  }
  return typeof input.status === "number" && ("statusText" in input || "url" in input);
}

function isFetchErrorLike(input: unknown): input is Record<string, unknown> {
  if (!(input instanceof Error) && !isRecord(input)) {
    return false;
  }
  const error = input as Record<string, unknown>;
  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";
  const name = typeof error.name === "string" ? error.name : "";

  return (
    name === "AbortError" ||
    name === "TypeError" ||
    message.includes("fetch") ||
    (isRecord(error.cause) && typeof error.cause.code === "string")
  );
}

export const fetchAdapter: ErrorAdapter = {
  name: "fetch",
  canHandle(input) {
    return isFetchResponseLike(input) || isFetchErrorLike(input);
  },
  normalize(input) {
    if (isFetchResponseLike(input)) {
      const status = asStatus(input.status);
      const body = input.body;
      const message =
        extractMessageFromBody(body) ||
        (typeof input.statusText === "string" && input.statusText) ||
        (status ? `HTTP request failed with status ${status}.` : "Fetch request failed.");

      return {
        code: status ? `HTTP_${status}` : "FETCH_HTTP_ERROR",
        status,
        message,
        details: pickDetails(input, ["status", "statusText", "ok", "body"])
      };
    }

    const error = input as Record<string, unknown>;
    const cause = isRecord(error.cause) ? error.cause : null;
    const causeCode = typeof cause?.code === "string" ? cause.code : null;
    const name = typeof error.name === "string" ? error.name : "TypeError";
    const message =
      typeof error.message === "string" && error.message.length > 0
        ? error.message
        : "Fetch request failed.";
    const code = name === "AbortError" ? "ABORT_ERROR" : causeCode ?? "FETCH_ERROR";

    return {
      code,
      message,
      status: null,
      retryable: inferRetryable({ code, message, status: null }),
      details: pickDetails(error, ["name", "message", "stack", "code"])
    };
  }
};
