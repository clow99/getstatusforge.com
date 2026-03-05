import { defaultAdapters } from "./adapters";
import type { ErrorAdapter, NormalizeErrorOptions, NormalizedError } from "./types";
import { normalized } from "./utils";

export function normalizeError(input: unknown, options: NormalizeErrorOptions = {}): NormalizedError {
  const adapters: ErrorAdapter[] = options.adapters ?? defaultAdapters;

  for (const adapter of adapters) {
    if (!adapter.canHandle(input)) {
      continue;
    }
    return normalized(adapter.normalize(input));
  }

  return normalized({
    code: "UNKNOWN_ERROR",
    message: "An unexpected error occurred.",
    status: null,
    retryable: false,
    details: null
  });
}
