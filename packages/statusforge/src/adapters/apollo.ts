import type { ErrorAdapter } from "../types";
import { asStatus, inferRetryable, isRecord, normalizeCode, pickDetails } from "../utils";

function isApolloErrorLike(input: unknown): input is Record<string, unknown> {
  if (!isRecord(input)) {
    return false;
  }
  if (Array.isArray(input.graphQLErrors) || isRecord(input.networkError)) {
    return true;
  }
  return input.name === "ApolloError";
}

function pickGraphQLErrorCode(graphQLErrors: unknown[]): string | null {
  for (const item of graphQLErrors) {
    if (!isRecord(item)) {
      continue;
    }
    const extensions = isRecord(item.extensions) ? item.extensions : null;
    if (typeof extensions?.code === "string" && extensions.code.length > 0) {
      return extensions.code;
    }
  }
  return null;
}

function pickGraphQLErrorMessage(graphQLErrors: unknown[]): string | null {
  for (const item of graphQLErrors) {
    if (isRecord(item) && typeof item.message === "string" && item.message.length > 0) {
      return item.message;
    }
  }
  return null;
}

export const apolloAdapter: ErrorAdapter = {
  name: "apollo",
  canHandle: isApolloErrorLike,
  normalize(input) {
    const error = input as Record<string, unknown>;
    const graphQLErrors = Array.isArray(error.graphQLErrors) ? error.graphQLErrors : [];
    const networkError = isRecord(error.networkError) ? error.networkError : null;
    const status = asStatus(networkError?.statusCode ?? networkError?.status);
    const gqlCode = pickGraphQLErrorCode(graphQLErrors);
    const code = normalizeCode(gqlCode ?? networkError?.code ?? "GRAPHQL_ERROR", "GRAPHQL_ERROR");
    const message =
      pickGraphQLErrorMessage(graphQLErrors) ||
      (typeof error.message === "string" && error.message) ||
      (typeof networkError?.message === "string" && networkError.message) ||
      "GraphQL request failed.";

    return {
      code,
      message,
      status,
      retryable: inferRetryable({ code, status, message }),
      details: pickDetails(error, ["name", "message", "stack"])
    };
  }
};
