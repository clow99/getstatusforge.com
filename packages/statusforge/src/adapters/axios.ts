import type { ErrorAdapter } from "../types";
import { asStatus, extractMessageFromBody, isRecord, pickDetails } from "../utils";

function isAxiosErrorLike(input: unknown): input is Record<string, unknown> {
  if (!isRecord(input)) {
    return false;
  }
  if (input.isAxiosError === true) {
    return true;
  }
  if (input.name === "AxiosError") {
    return true;
  }
  return isRecord(input.config) && (isRecord(input.request) || isRecord(input.response));
}

export const axiosAdapter: ErrorAdapter = {
  name: "axios",
  canHandle: isAxiosErrorLike,
  normalize(input) {
    const error = input as Record<string, unknown>;
    const response = isRecord(error.response) ? error.response : null;
    const responseData = response && isRecord(response.data) ? response.data : response?.data;
    const status = asStatus(response?.status);
    const message =
      (typeof error.message === "string" && error.message) ||
      extractMessageFromBody(responseData) ||
      (status ? `Request failed with status ${status}.` : "Axios request failed.");
    const code = error.code ?? (status ? `HTTP_${status}` : "AXIOS_ERROR");

    const detailSource: Record<string, unknown> = {
      ...error,
      responseData
    };

    return {
      code: typeof code === "string" ? code : "AXIOS_ERROR",
      message,
      status,
      details: pickDetails(detailSource, ["name", "message", "stack", "status", "code", "isAxiosError"])
    };
  }
};
