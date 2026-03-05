import type { ErrorAdapter } from "../types";
import { asStatus, extractMessageFromBody, inferRetryable, isRecord, pickDetails } from "../utils";

function isKyErrorLike(input: unknown): input is Record<string, unknown> {
  if (!isRecord(input)) {
    return false;
  }
  const name = input.name;
  if (name === "HTTPError" || name === "TimeoutError") {
    return true;
  }
  return isRecord(input.response) && isRecord(input.request) && isRecord(input.options);
}

export const kyAdapter: ErrorAdapter = {
  name: "ky",
  canHandle: isKyErrorLike,
  normalize(input) {
    const error = input as Record<string, unknown>;
    const name = error.name;

    if (name === "TimeoutError") {
      return {
        code: "TIMEOUT_ERROR",
        message:
          (typeof error.message === "string" && error.message) || "The request timed out.",
        status: null,
        retryable: true,
        details: pickDetails(error, ["name", "message", "stack"])
      };
    }

    const response = isRecord(error.response) ? error.response : null;
    const status = asStatus(response?.status);
    const statusText = typeof response?.statusText === "string" ? response.statusText : "";
    const body = response?.body;
    const message =
      extractMessageFromBody(body) ||
      (typeof error.message === "string" && error.message) ||
      statusText ||
      (status ? `Ky request failed with status ${status}.` : "Ky request failed.");
    const code = status ? `HTTP_${status}` : "KY_HTTP_ERROR";

    return {
      code,
      message,
      status,
      retryable: inferRetryable({ code, status, message }),
      details: pickDetails(error, ["name", "message", "stack", "code"])
    };
  }
};
