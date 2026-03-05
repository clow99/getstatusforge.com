import { describe, expect, it } from "vitest";
import { normalizeError } from "../normalizeError";

describe("normalizeError", () => {
  it("normalizes axios-style errors", () => {
    const output = normalizeError({
      isAxiosError: true,
      message: "Request failed with status code 404",
      code: "ERR_BAD_REQUEST",
      response: {
        status: 404,
        data: {
          message: "Not found"
        }
      },
      config: {
        url: "/users/42",
        method: "get"
      }
    });

    expect(output).toEqual({
      code: "ERR_BAD_REQUEST",
      message: "Request failed with status code 404",
      status: 404,
      retryable: false,
      details: expect.objectContaining({
        config: expect.objectContaining({
          url: "/users/42"
        })
      })
    });
  });

  it("normalizes response-like fetch HTTP failures", () => {
    const output = normalizeError({
      status: 503,
      statusText: "Service Unavailable",
      url: "https://api.example.com/data",
      body: {
        message: "Try again soon"
      }
    });

    expect(output).toEqual({
      code: "HTTP_503",
      message: "Try again soon",
      status: 503,
      retryable: true,
      details: {
        url: "https://api.example.com/data"
      }
    });
  });

  it("normalizes ky timeout failures as retryable", () => {
    const output = normalizeError({
      name: "TimeoutError",
      message: "Request timed out after 10000ms"
    });

    expect(output).toEqual({
      code: "TIMEOUT_ERROR",
      message: "Request timed out after 10000ms",
      status: null,
      retryable: true,
      details: null
    });
  });

  it("normalizes apollo graphql errors", () => {
    const output = normalizeError({
      name: "ApolloError",
      message: "GraphQL request failed",
      graphQLErrors: [
        {
          message: "Rate limited",
          extensions: {
            code: "TOO_MANY_REQUESTS"
          }
        }
      ],
      networkError: {
        statusCode: 429
      }
    });

    expect(output).toEqual({
      code: "TOO_MANY_REQUESTS",
      message: "Rate limited",
      status: 429,
      retryable: true,
      details: expect.objectContaining({
        graphQLErrors: expect.any(Array)
      })
    });
  });

  it("normalizes node HTTP transport errors", () => {
    const err = new Error("socket hang up") as Error & { code: string };
    err.code = "ECONNRESET";

    const output = normalizeError(err);

    expect(output).toEqual({
      code: "ECONNRESET",
      message: "socket hang up",
      status: null,
      retryable: true,
      details: null
    });
  });

  it("normalizes thrown strings", () => {
    const output = normalizeError("backend unavailable");

    expect(output).toEqual({
      code: "THROWN_STRING",
      message: "backend unavailable",
      status: null,
      retryable: false,
      details: {
        original: "backend unavailable"
      }
    });
  });

  it("normalizes backend JSON payloads", () => {
    const output = normalizeError({
      status: 400,
      error: {
        code: "INVALID_INPUT",
        message: "email is required"
      },
      traceId: "abc123"
    });

    expect(output).toEqual({
      code: "INVALID_INPUT",
      message: "email is required",
      status: 400,
      retryable: false,
      details: {
        traceId: "abc123"
      }
    });
  });

  it("handles malformed input objects with fallback defaults", () => {
    const output = normalizeError({
      status: "9999",
      message: "",
      retryable: "maybe"
    });

    expect(output).toEqual({
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred.",
      status: null,
      retryable: false,
      details: null
    });
  });

  it("prefers specialized adapters over generic fallback", () => {
    const output = normalizeError({
      isAxiosError: true,
      name: "AxiosError",
      code: "ERR_NETWORK",
      message: "Network Error",
      response: {
        status: 500
      },
      config: {
        url: "/health"
      }
    });

    expect(output.code).toBe("ERR_NETWORK");
    expect(output.status).toBe(500);
    expect(output.retryable).toBe(true);
  });

  it("classifies retryability for transport codes and status codes", () => {
    const timedOut = normalizeError({
      message: "fetch failed",
      cause: {
        code: "ETIMEDOUT"
      }
    });
    const tooMany = normalizeError({ status: 429, message: "slow down" });
    const badRequest = normalizeError({ status: 400, message: "bad input" });
    const aborted = normalizeError(new DOMException("The user aborted a request.", "AbortError"));

    expect(timedOut.retryable).toBe(true);
    expect(tooMany.retryable).toBe(true);
    expect(badRequest.retryable).toBe(false);
    expect(aborted.retryable).toBe(false);
  });
});
