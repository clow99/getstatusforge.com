"use client";

import axios from "axios";
import ky from "ky";
import { useMemo, useState } from "react";
import { normalizeError } from "statusforge";

type ScenarioId =
  | "axios"
  | "fetch"
  | "ky"
  | "apollo"
  | "node-http"
  | "thrown-string"
  | "backend-json";

type Scenario = {
  id: ScenarioId;
  label: string;
  description: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "axios",
    label: "Axios HTTP 503 error",
    description: "Triggers an axios request to a failing API route and catches AxiosError."
  },
  {
    id: "fetch",
    label: "Fetch HTTP error wrapper",
    description: "Wraps a non-OK fetch response into a fetch-style error object."
  },
  {
    id: "ky",
    label: "Ky HTTPError",
    description: "Triggers a ky request that throws HTTPError on a non-2xx response."
  },
  {
    id: "apollo",
    label: "Apollo / GraphQL error object",
    description: "Builds an Apollo-like GraphQL error shape from an API response."
  },
  {
    id: "node-http",
    label: "Node transport error",
    description: "Simulates a Node.js network transport error like ECONNRESET."
  },
  {
    id: "thrown-string",
    label: "Thrown string",
    description: "Simulates legacy code throwing a plain string."
  },
  {
    id: "backend-json",
    label: "Backend JSON payload",
    description: "Passes backend JSON directly to the normalizer without throwing."
  }
];

function toSerializable(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  if (value instanceof Error) {
    const base: Record<string, unknown> = {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
    for (const [key, nestedValue] of Object.entries(value)) {
      base[key] = toSerializable(nestedValue, seen);
    }
    return base;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item, seen));
  }

  const record = value as Record<string, unknown>;
  return Object.entries(record).reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
    acc[key] = toSerializable(nestedValue, seen);
    return acc;
  }, {});
}

async function buildScenarioInput(scenario: ScenarioId): Promise<unknown> {
  switch (scenario) {
    case "axios":
      try {
        await axios.get("/api/scenario/http-503");
        return { message: "Unexpected success" };
      } catch (error) {
        return error;
      }

    case "fetch":
      try {
        const response = await fetch("/api/scenario/http-503", { cache: "no-store" });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw {
            name: "FetchHttpError",
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            body
          };
        }
        return { message: "Unexpected success" };
      } catch (error) {
        return error;
      }

    case "ky":
      try {
        await ky.get("/api/scenario/http-503").json();
        return { message: "Unexpected success" };
      } catch (error) {
        return error;
      }

    case "apollo": {
      const response = await fetch("/api/scenario/graphql-error", { cache: "no-store" });
      const payload = (await response.json()) as { errors?: unknown[] };
      return {
        name: "ApolloError",
        message: "GraphQL request failed",
        graphQLErrors: payload.errors ?? [],
        networkError: {
          statusCode: 502,
          message: "Bad gateway from upstream service."
        }
      };
    }

    case "node-http": {
      const error = new Error("socket hang up") as Error & { code: string; syscall: string };
      error.code = "ECONNRESET";
      error.syscall = "read";
      return error;
    }

    case "thrown-string":
      try {
        throw "database connection dropped";
      } catch (error) {
        return error;
      }

    case "backend-json": {
      const response = await fetch("/api/scenario/backend-json", { cache: "no-store" });
      return response.json();
    }
  }
}

export default function HomePage() {
  const [scenario, setScenario] = useState<ScenarioId>("axios");
  const [rawInput, setRawInput] = useState<string>("Run a scenario to inspect its raw error value.");
  const [normalizedOutput, setNormalizedOutput] = useState<string>(
    "Run a scenario to inspect normalized output."
  );
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const selectedScenario = useMemo(
    () => SCENARIOS.find((item) => item.id === scenario) ?? SCENARIOS[0],
    [scenario]
  );

  const handleRunScenario = async () => {
    setRunning(true);
    setExecutionError(null);

    try {
      const input = await buildScenarioInput(scenario);
      const normalized = normalizeError(input);
      setRawInput(JSON.stringify(toSerializable(input), null, 2));
      setNormalizedOutput(JSON.stringify(normalized, null, 2));
    } catch (error) {
      setExecutionError(
        error instanceof Error ? error.message : "Failed to execute selected scenario."
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <main>
      <h1>getstatusforge.com demo</h1>
      <p>
        `normalizeError(anything)` converts mixed error shapes into
        {` { code, message, status, retryable, details }`}.
      </p>

      <section className="panel">
        <div className="controls">
          <div>
            <label htmlFor="scenario">Scenario</label>
            <select
              id="scenario"
              value={scenario}
              onChange={(event) => setScenario(event.currentTarget.value as ScenarioId)}
            >
              {SCENARIOS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <button type="button" onClick={handleRunScenario} disabled={running}>
            {running ? "Running..." : "Run scenario"}
          </button>
        </div>

        <p>{selectedScenario.description}</p>
        {executionError ? <p className="error">{executionError}</p> : null}
      </section>

      <section className="grid">
        <div className="panel">
          <label>Raw input (unknown)</label>
          <pre>{rawInput}</pre>
        </div>

        <div className="panel">
          <label>Normalized output</label>
          <pre>{normalizedOutput}</pre>
        </div>
      </section>
    </main>
  );
}
