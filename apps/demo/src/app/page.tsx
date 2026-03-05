"use client";

import axios from "axios";
import ky from "ky";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Progress,
  Select,
  Title
} from "@velocityuikit/velocityui";
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

type FeatureItem = {
  title: string;
  description: string;
};

type SchemaRow = {
  field: string;
  type: string;
  example: string;
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

const FEATURE_ITEMS: FeatureItem[] = [
  {
    title: "Any error shape",
    description:
      "Normalize Axios, Fetch, ky, Apollo, Node.js transport errors, thrown strings, and raw backend payloads."
  },
  {
    title: "Consistent output",
    description:
      "Always returns { code, message, status, retryable, details } — the same shape regardless of what threw."
  },
  {
    title: "Zero config",
    description: "Drop in normalizeError and handle every edge case without wrappers, adapters, or configuration."
  },
  {
    title: "Retry intelligence",
    description:
      "The retryable flag lets you build retry logic in one place instead of inferring it from status codes per-client."
  },
  {
    title: "TypeScript-first",
    description:
      "Fully typed output so your error handlers stay compile-safe across every client and scenario."
  },
  {
    title: "Preserve originals",
    description:
      "The details field keeps the raw error accessible for Sentry, Datadog, or any other observability pipeline."
  }
];

const NORMALIZED_SCHEMA: SchemaRow[] = [
  {
    field: "code",
    type: "string",
    example: '"SERVICE_UNAVAILABLE"',
    description: "Machine-readable token for switch/match logic and error tracking."
  },
  {
    field: "message",
    type: "string",
    example: '"Service temporarily unavailable"',
    description: "Human-readable explanation, safe to render directly in UI."
  },
  {
    field: "status",
    type: "number | null",
    example: "503",
    description: "HTTP status code when available; null for transport or non-HTTP errors."
  },
  {
    field: "retryable",
    type: "boolean",
    example: "true",
    description: "Whether retrying the request is likely to succeed."
  },
  {
    field: "details",
    type: "unknown",
    example: "{ ... }",
    description: "Original error value preserved for logging and debugging."
  }
];

const SUPPORTED_CLIENTS = [
  "Axios",
  "Fetch API",
  "ky",
  "Apollo / GraphQL",
  "Node.js http/https",
  "Thrown strings",
  "Raw JSON payloads"
];

const BEFORE_CODE = `// Brittle: every client needs its own logic
try {
  await axios.get("/api/data");
} catch (err) {
  if (err.response?.status === 503) {
    setMsg(err.response.data.message ?? "Down");
    scheduleRetry();
  } else if (err.code === "ECONNRESET") {
    setMsg("Connection lost");
  } else if (typeof err === "string") {
    setMsg(err);
  } else {
    setMsg("Something went wrong");
  }
}`;

const AFTER_CODE = `// Clean: one function, every client
import { normalizeError } from "statusforge";

try {
  await axios.get("/api/data");
} catch (err) {
  const { message, retryable } = normalizeError(err);
  setMsg(message);
  if (retryable) scheduleRetry();
}`;

const SCENARIO_CATEGORIES: Record<ScenarioId, string> = {
  axios: "HTTP client",
  fetch: "Browser fetch",
  ky: "HTTP client",
  apollo: "GraphQL",
  "node-http": "Transport",
  "thrown-string": "Legacy throw",
  "backend-json": "Backend payload"
};

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
    <>
      <header className="site-header">
        <a className="brand" href="/">
          <Image src="/logo.png" alt="StatusForge logo" width={34} height={34} priority />
          <span>StatusForge</span>
        </a>
        <nav className="header-nav">
          <a className="header-nav-link" href="#why">
            Why
          </a>
          <a className="header-nav-link" href="#schema">
            Schema
          </a>
          <a className="header-nav-link" href="#playground">
            Playground
          </a>
          <a className="header-nav-link" href="/docs">
            Docs
          </a>
        </nav>
        <div className="header-actions">
          <a
            href="https://www.npmjs.com/package/statusforge"
            target="_blank"
            rel="noreferrer"
            className="header-npm"
          >
            npm install statusforge
          </a>
          <a href="https://github.com/clow99/getstatusforge.com" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              GitHub
            </Button>
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-eyebrow">
            <Badge variant="primary" dot>
              v0.1.x
            </Badge>
            <span className="hero-eyebrow-text">TypeScript · Zero deps · 7 error shapes</span>
          </div>
          <Title level="h1" color="gradient">
            One function. Every error.
          </Title>
          <p className="lead">
            <code>normalizeError</code> turns Axios failures, failed fetches, GraphQL errors, Node
            transport errors, and thrown strings into a single predictable object — so your UI,
            retry logic, and logging code never need client-specific handling again.
          </p>
          <div className="hero-actions">
            <a href="#playground">
              <Button variant="primary" size="md">
                Try the playground
              </Button>
            </a>
            <a href="https://www.npmjs.com/package/statusforge" target="_blank" rel="noreferrer">
              <Button variant="outline" size="md">
                npm install statusforge
              </Button>
            </a>
          </div>
        </section>

        <section className="section features-grid">
          {FEATURE_ITEMS.map((item) => (
            <Card key={item.title} variant="bordered" hoverable>
              <Card.Header>
                <Title level="h3" size="lg">
                  {item.title}
                </Title>
              </Card.Header>
              <Card.Body>
                <p>{item.description}</p>
              </Card.Body>
            </Card>
          ))}
        </section>

        <section id="why" className="section problem-section">
          <div className="section-eyebrow">
            <Badge variant="info">The Problem</Badge>
          </div>
          <Title level="h2" size="xl">
            Every HTTP client throws differently
          </Title>
          <p className="section-desc">
            Axios wraps errors in AxiosError with a response object. Fetch never throws on HTTP
            errors — you check response.ok yourself. ky throws HTTPError. GraphQL returns an errors
            array, not an exception. Node transport errors carry a code field like ECONNRESET instead
            of a status. Without a normalizer, every catch block needs client-specific logic that
            breaks when you switch libraries.
          </p>
          <div className="problem-grid">
            <div className="problem-panel">
              <span className="panel-label panel-label--before">Without StatusForge</span>
              <pre className="pre-problem">{BEFORE_CODE}</pre>
            </div>
            <div className="problem-panel">
              <span className="panel-label panel-label--after">With StatusForge</span>
              <pre className="pre-problem">{AFTER_CODE}</pre>
            </div>
          </div>
        </section>

        <section id="schema" className="section">
          <Card variant="bordered">
            <Card.Header>
              <div className="section-eyebrow">
                <Badge variant="primary">Output</Badge>
              </div>
              <Title level="h2" size="xl">
                Consistent output, every time
              </Title>
              <p>
                No matter what threw — or whether anything threw at all — you always get the same
                five fields back.
              </p>
            </Card.Header>
            <Card.Body>
              <div className="schema-table">
                <div className="schema-row schema-row--header">
                  <span>Field</span>
                  <span>Type</span>
                  <span>Example</span>
                  <span>Description</span>
                </div>
                {NORMALIZED_SCHEMA.map((row) => (
                  <div className="schema-row" key={row.field}>
                    <code className="schema-field">{row.field}</code>
                    <code className="schema-type">{row.type}</code>
                    <code className="schema-example">{row.example}</code>
                    <span className="schema-desc">{row.description}</span>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </section>

        <section className="section clients-section">
          <p className="clients-label">Handles all of these out of the box</p>
          <div className="clients-grid">
            {SUPPORTED_CLIENTS.map((client) => (
              <span className="client-chip" key={client}>
                {client}
              </span>
            ))}
          </div>
        </section>

        <section id="playground" className="section">
          <Card variant="elevated">
            <Card.Header className="playground-head">
              <Title level="h2" size="xl">
                Live Playground
              </Title>
              <Badge variant="primary">{SCENARIO_CATEGORIES[scenario]}</Badge>
            </Card.Header>
            <Card.Body>
              <div className="controls">
                <Select
                  label="Scenario"
                  value={scenario}
                  onChange={(event) => setScenario(event.currentTarget.value as ScenarioId)}
                  options={SCENARIOS.map((item) => ({ value: item.id, label: item.label }))}
                  fullWidth
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleRunScenario}
                  loading={running}
                  disabled={running}
                >
                  Run Scenario
                </Button>
              </div>

              <Alert variant="info" title={selectedScenario.label}>
                {selectedScenario.description}
              </Alert>

              {executionError ? (
                <Alert variant="danger" title="Scenario failed">
                  {executionError}
                </Alert>
              ) : null}

              <div className="code-grid">
                <div className="code-panel">
                  <span className="code-label">Raw input (unknown)</span>
                  <pre>{rawInput}</pre>
                </div>

                <div className="code-panel">
                  <span className="code-label">Normalized output</span>
                  <pre>{normalizedOutput}</pre>
                </div>
              </div>
            </Card.Body>
            <Card.Footer>
              <Progress
                value={running ? 60 : 100}
                label={running ? "Executing scenario..." : "Ready"}
                showValue
              />
            </Card.Footer>
          </Card>
        </section>

        <section className="section">
          <Card variant="bordered">
            <Card.Header>
              <Title level="h3" size="lg">
                Get started in seconds
              </Title>
              <p>Install StatusForge and normalize every failure path the same way.</p>
            </Card.Header>
            <Card.Body>
              <div className="cta-row">
                <code className="install-command">npm install statusforge</code>
                <div className="cta-buttons">
                  <a href="/docs">
                    <Button variant="primary">Read the Docs</Button>
                  </a>
                  <a
                    href="https://github.com/clow99/getstatusforge.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline">View on GitHub</Button>
                  </a>
                </div>
              </div>
            </Card.Body>
          </Card>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Image src="/logo.png" alt="StatusForge logo" width={24} height={24} />
            <span>StatusForge</span>
          </div>
          <nav className="footer-links">
            <a href="/docs">Docs</a>
            <a href="/docs/api">API</a>
            <a href="/docs/adapters">Adapters</a>
            <a href="https://www.npmjs.com/package/statusforge" target="_blank" rel="noreferrer">
              npm
            </a>
            <a
              href="https://github.com/clow99/getstatusforge.com"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
          <p className="footer-copy">MIT License</p>
        </div>
      </footer>
    </>
  );
}
