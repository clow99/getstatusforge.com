"use client";

import {
  Alert,
  Badge,
  Breadcrumb,
  Card,
  Divider,
  Table,
  Tabs,
  Tag,
  Title
} from "@velocityuikit/velocityui";
import Link from "next/link";

const INSTALL_TABS = [
  {
    value: "npm",
    label: "npm",
    children: (
      <pre>npm i @npmforge/statusforge</pre>
    )
  },
  {
    value: "yarn",
    label: "yarn",
    children: (
      <pre>yarn add @npmforge/statusforge</pre>
    )
  },
  {
    value: "pnpm",
    label: "pnpm",
    children: (
      <pre>pnpm add @npmforge/statusforge</pre>
    )
  }
];

const BASIC_USAGE = `import { normalizeError } from "@npmforge/statusforge";

try {
  const res = await fetch("/api/data");
  if (!res.ok) throw res;
} catch (err) {
  const { code, message, status, retryable } = normalizeError(err);

  showToast(message);
  if (retryable) scheduleRetry();
}`;

const RETRY_EXAMPLE = `import { normalizeError } from "@npmforge/statusforge";

async function fetchWithRetry(url: string, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw res;
      return await res.json();
    } catch (err) {
      const normalized = normalizeError(err);
      if (!normalized.retryable || i === attempts - 1) {
        throw normalized;
      }
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
}`;

const LOGGING_EXAMPLE = `import { normalizeError } from "@npmforge/statusforge";

function logError(err: unknown) {
  const { code, message, status, details } = normalizeError(err);

  logger.error({
    code,
    message,
    status,
    details,
    timestamp: Date.now()
  });
}`;

const SCHEMA_COLUMNS = [
  { key: "field", header: "Field" },
  { key: "type", header: "Type" },
  { key: "description", header: "Description" }
];

const SCHEMA_DATA = [
  {
    field: "code",
    type: "string",
    description: "Machine-readable error token for switch/match logic."
  },
  {
    field: "message",
    type: "string",
    description: "Human-readable explanation safe to display in UI."
  },
  {
    field: "status",
    type: "number | null",
    description: "HTTP status code when available; null for transport or non-HTTP errors."
  },
  {
    field: "retryable",
    type: "boolean",
    description: "Whether retrying the request is likely to succeed."
  },
  {
    field: "details",
    type: "Record<string, unknown> | null",
    description: "Original error value preserved for logging and observability."
  }
];

export default function DocsPage() {
  return (
    <>
      <div className="docs-breadcrumb">
        <Breadcrumb items={[{ label: "Docs", href: "/docs" }, { label: "Getting Started" }]} />
      </div>

      <section className="docs-section">
        <Badge variant="primary" dot>
          v0.1.x
        </Badge>
        <Title level="h1" size="xxl">
          Getting Started
        </Title>
        <p className="docs-lead">
          StatusForge normalizes every error shape your app will ever encounter into a single
          predictable object. Install it, wrap your catch blocks, and stop writing client-specific
          error handling.
        </p>
      </section>

      <Divider />

      <section className="docs-section">
        <Title level="h2" size="lg">
          Installation
        </Title>
        <Tabs items={INSTALL_TABS} variant="pills" />
        <Alert variant="info" title="Zero dependencies">
          StatusForge has no runtime dependencies. It ships ESM and CJS builds and works in every
          Node.js, browser, and edge runtime.
        </Alert>
      </section>

      <section className="docs-section">
        <Title level="h2" size="lg">
          Basic usage
        </Title>
        <p className="docs-paragraph">
          Import <code>normalizeError</code> and pass any caught value. You always get back the same
          five fields regardless of what threw.
        </p>
        <div className="docs-code-block">
          <span className="docs-code-label">app.ts</span>
          <pre>{BASIC_USAGE}</pre>
        </div>
      </section>

      <section className="docs-section">
        <Title level="h2" size="lg">
          Output schema
        </Title>
        <p className="docs-paragraph">
          Every call to <code>normalizeError</code> returns a <code>NormalizedError</code> with
          these fields:
        </p>
        <Table columns={SCHEMA_COLUMNS} data={SCHEMA_DATA} bordered size="sm" />
      </section>

      <section id="why" className="docs-section">
        <Title level="h2" size="lg">
          Why StatusForge?
        </Title>
        <p className="docs-paragraph">
          Every HTTP client throws differently. Axios wraps errors in <code>AxiosError</code>. Fetch
          never throws on non-2xx responses. ky throws <code>HTTPError</code>. Apollo returns an
          errors array. Node transport errors carry codes like <code>ECONNRESET</code>. Without a
          normalizer, every catch block needs its own branching logic — and it breaks the moment you
          switch libraries.
        </p>

        <div className="param-grid">
          <Card variant="bordered">
            <Card.Body>
              <Title level="h4" size="md">
                Consistent error handling
              </Title>
              <p className="docs-paragraph">
                One function, one output shape. Your UI toasts, retry logic, and logging code stay
                the same regardless of which client made the request.
              </p>
            </Card.Body>
          </Card>
          <Card variant="bordered">
            <Card.Body>
              <Title level="h4" size="md">
                Built-in retry intelligence
              </Title>
              <p className="docs-paragraph">
                The <code>retryable</code> flag is inferred from status codes, network error codes,
                and message patterns so you never have to maintain a list of retryable conditions.
              </p>
            </Card.Body>
          </Card>
          <Card variant="bordered">
            <Card.Body>
              <Title level="h4" size="md">
                Full observability
              </Title>
              <p className="docs-paragraph">
                The <code>details</code> field preserves the original error for Sentry, Datadog, or
                any logging pipeline that needs the raw context.
              </p>
            </Card.Body>
          </Card>
        </div>
      </section>

      <section className="docs-section">
        <Title level="h2" size="lg">
          Supported error sources
        </Title>
        <p className="docs-paragraph">
          StatusForge ships six built-in adapters that handle the most common error shapes. See
          the{" "}
          <Link href="/docs/adapters" style={{ color: "#58a6ff" }}>
            Adapters reference
          </Link>{" "}
          for detection rules and examples.
        </p>
        <div className="adapter-detection">
          <Tag variant="primary">Axios</Tag>
          <Tag variant="primary">Fetch API</Tag>
          <Tag variant="primary">ky</Tag>
          <Tag variant="primary">Apollo / GraphQL</Tag>
          <Tag variant="primary">Node.js http/https</Tag>
          <Tag variant="info">Generic fallback</Tag>
        </div>
      </section>

      <Divider />

      <section className="docs-section">
        <Title level="h2" size="lg">
          Recipes
        </Title>

        <Title level="h3" size="md">
          Retry with exponential backoff
        </Title>
        <p className="docs-paragraph">
          Use the <code>retryable</code> flag to decide whether to retry, without maintaining a list
          of retryable status codes per client.
        </p>
        <div className="docs-code-block">
          <span className="docs-code-label">retry.ts</span>
          <pre>{RETRY_EXAMPLE}</pre>
        </div>

        <Title level="h3" size="md">
          Structured logging
        </Title>
        <p className="docs-paragraph">
          Pass the normalized error to your logger for consistent, structured error events.
        </p>
        <div className="docs-code-block">
          <span className="docs-code-label">logger.ts</span>
          <pre>{LOGGING_EXAMPLE}</pre>
        </div>
      </section>

      <div className="docs-footer">
        <div className="docs-footer-nav">
          <div />
          <div className="docs-nav-next">
            <Link href="/docs/api">
              <span className="docs-nav-label">Next</span>
              <span className="docs-nav-title">API Reference</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
