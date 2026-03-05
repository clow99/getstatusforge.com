"use client";

import {
  Alert,
  Badge,
  Breadcrumb,
  Card,
  Divider,
  Table,
  Tag,
  Title
} from "@velocityuikit/velocityui";
import Link from "next/link";

const NORMALIZE_SIGNATURE = `function normalizeError(
  input: unknown,
  options?: NormalizeErrorOptions
): NormalizedError`;

const NORMALIZED_ERROR_TYPE = `interface NormalizedError {
  code: string;
  message: string;
  status: number | null;
  retryable: boolean;
  details: Record<string, unknown> | null;
}`;

const OPTIONS_TYPE = `interface NormalizeErrorOptions {
  adapters?: ErrorAdapter[];
}`;

const ADAPTER_INTERFACE = `interface ErrorAdapter {
  name: string;
  canHandle(input: unknown): boolean;
  normalize(input: unknown): Partial<NormalizedError>;
}`;

const CUSTOM_ADAPTER_EXAMPLE = `import {
  normalizeError,
  axiosAdapter,
  genericAdapter,
  type ErrorAdapter
} from "@npmforge/statusforge";

const stripeAdapter: ErrorAdapter = {
  name: "stripe",
  canHandle(input) {
    return (
      typeof input === "object" &&
      input !== null &&
      "type" in input &&
      (input as Record<string, unknown>).type === "StripeCardError"
    );
  },
  normalize(input) {
    const err = input as {
      type: string;
      code?: string;
      message?: string;
      decline_code?: string;
    };
    return {
      code: err.code ?? err.type,
      message: err.message ?? "Payment failed",
      status: 402,
      retryable: err.decline_code === "insufficient_funds",
      details: { decline_code: err.decline_code }
    };
  }
};

const normalized = normalizeError(error, {
  adapters: [stripeAdapter, axiosAdapter, genericAdapter]
});`;

const OUTPUT_COLUMNS = [
  { key: "field", header: "Field" },
  { key: "type", header: "Type" },
  { key: "description", header: "Description" }
];

const OUTPUT_DATA = [
  {
    field: "code",
    type: "string",
    description:
      "Uppercase identifier such as HTTP_503, ECONNRESET, or UNKNOWN_ERROR. Suitable for switch statements and error tracking."
  },
  {
    field: "message",
    type: "string",
    description: "Human-readable explanation extracted from the error source. Safe to render in UI."
  },
  {
    field: "status",
    type: "number | null",
    description:
      "HTTP status in the 100-599 range when available. null for transport errors and non-HTTP failures."
  },
  {
    field: "retryable",
    type: "boolean",
    description:
      "true when the error is transient (e.g. 429, 503, ECONNRESET). Inferred from status codes, error codes, and message patterns."
  },
  {
    field: "details",
    type: "Record<string, unknown> | null",
    description:
      "Original error payload minus redundant fields. Preserved for logging, Sentry, or debugging."
  }
];

const RETRYABLE_COLUMNS = [
  { key: "category", header: "Category" },
  { key: "values", header: "Values" }
];

const RETRYABLE_DATA = [
  {
    category: "HTTP status codes",
    values: "408, 425, 429, 500, 502, 503, 504"
  },
  {
    category: "Network error codes",
    values:
      "ECONNRESET, ECONNABORTED, ETIMEDOUT, EAI_AGAIN, ENOTFOUND, ECONNREFUSED, EHOSTUNREACH, EPIPE, UND_ERR_*"
  },
  {
    category: "Message patterns",
    values: '"timeout", "network error", "fetch failed", "temporar"'
  },
  {
    category: "Non-retryable override",
    values: 'Messages containing "abort"'
  }
];

export default function ApiPage() {
  return (
    <>
      <div className="docs-breadcrumb">
        <Breadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "API Reference" }
          ]}
        />
      </div>

      <section className="docs-section">
        <Title level="h1" size="xxl">
          API Reference
        </Title>
        <p className="docs-lead">
          Complete reference for every function, type, and option exported by StatusForge.
        </p>
      </section>

      <Divider />

      <section className="docs-section">
        <Title level="h2" size="lg">
          normalizeError
        </Title>
        <Badge variant="info">Core function</Badge>
        <p className="docs-paragraph">
          Accepts any value — an Error instance, an HTTP response, a plain object, or even a string
          — and returns a <code>NormalizedError</code>. Adapters are tried in order; the first whose{" "}
          <code>canHandle</code> returns <code>true</code> produces the output.
        </p>

        <div className="docs-code-block">
          <span className="docs-code-label">Signature</span>
          <pre>{NORMALIZE_SIGNATURE}</pre>
        </div>

        <Title level="h3" size="md">
          Parameters
        </Title>

        <div className="param-grid">
          <div className="param-item">
            <div className="param-header">
              <span className="param-name">input</span>
              <span className="param-type">unknown</span>
              <Badge variant="danger" size="sm">
                required
              </Badge>
            </div>
            <span className="param-desc">
              The value to normalize. Can be an Error, a Response, a plain object, a string, or
              anything else.
            </span>
          </div>

          <div className="param-item">
            <div className="param-header">
              <span className="param-name">options</span>
              <span className="param-type">NormalizeErrorOptions</span>
              <Badge variant="info" size="sm">
                optional
              </Badge>
            </div>
            <span className="param-desc">
              Configuration object. Currently supports a single field:{" "}
              <code>adapters</code>.
            </span>
          </div>
        </div>

        <Title level="h3" size="md">
          Options
        </Title>
        <div className="docs-code-block">
          <span className="docs-code-label">NormalizeErrorOptions</span>
          <pre>{OPTIONS_TYPE}</pre>
        </div>

        <div className="param-grid">
          <div className="param-item">
            <div className="param-header">
              <span className="param-name">adapters</span>
              <span className="param-type">ErrorAdapter[]</span>
              <Badge variant="info" size="sm">
                optional
              </Badge>
            </div>
            <span className="param-desc">
              Custom list of adapters to use instead of the defaults. Order matters — adapters are
              tried left to right until one handles the input. If omitted, the default chain is used:
              axios, ky, fetch, apollo, node-http, generic.
            </span>
          </div>
        </div>
      </section>

      <Divider />

      <section className="docs-section">
        <Title level="h2" size="lg">
          NormalizedError
        </Title>
        <Badge variant="primary">Return type</Badge>
        <p className="docs-paragraph">
          The object returned by <code>normalizeError</code>. Always contains all five fields, never
          undefined.
        </p>

        <div className="docs-code-block">
          <span className="docs-code-label">Type definition</span>
          <pre>{NORMALIZED_ERROR_TYPE}</pre>
        </div>

        <Table columns={OUTPUT_COLUMNS} data={OUTPUT_DATA} bordered size="sm" />
      </section>

      <Divider />

      <section className="docs-section">
        <Title level="h2" size="lg">
          ErrorAdapter
        </Title>
        <Badge variant="primary">Interface</Badge>
        <p className="docs-paragraph">
          The contract every adapter must satisfy. Implement this interface to add support for custom
          error shapes.
        </p>

        <div className="docs-code-block">
          <span className="docs-code-label">Type definition</span>
          <pre>{ADAPTER_INTERFACE}</pre>
        </div>

        <div className="param-grid">
          <div className="param-item">
            <div className="param-header">
              <span className="param-name">name</span>
              <span className="param-type">string</span>
            </div>
            <span className="param-desc">
              Identifier for the adapter. Used for debugging and logging.
            </span>
          </div>

          <div className="param-item">
            <div className="param-header">
              <span className="param-name">canHandle</span>
              <span className="param-type">(input: unknown) =&gt; boolean</span>
            </div>
            <span className="param-desc">
              Returns <code>true</code> if this adapter knows how to normalize the given input.
              Should be fast — avoid async operations or heavy computation.
            </span>
          </div>

          <div className="param-item">
            <div className="param-header">
              <span className="param-name">normalize</span>
              <span className="param-type">
                (input: unknown) =&gt; Partial&lt;NormalizedError&gt;
              </span>
            </div>
            <span className="param-desc">
              Extracts fields from the input. Return a partial — StatusForge fills in defaults for
              any missing fields.
            </span>
          </div>
        </div>
      </section>

      <Divider />

      <section className="docs-section">
        <Title level="h2" size="lg">
          Custom adapters
        </Title>
        <p className="docs-paragraph">
          Pass a custom adapter array via options to handle domain-specific error shapes. Your
          adapters run first; include <code>genericAdapter</code> at the end as a fallback.
        </p>

        <div className="docs-code-block">
          <span className="docs-code-label">Example: Stripe error adapter</span>
          <pre>{CUSTOM_ADAPTER_EXAMPLE}</pre>
        </div>

        <Alert variant="warning" title="Adapter order matters">
          Adapters are tried left to right. Place more specific adapters before generic ones. If no
          adapter matches and <code>genericAdapter</code> is not in the list, the fallback returns
          code <code>UNKNOWN_ERROR</code>.
        </Alert>
      </section>

      <Divider />

      <section className="docs-section">
        <Title level="h2" size="lg">
          Retryable inference
        </Title>
        <p className="docs-paragraph">
          The <code>retryable</code> field is automatically derived from status codes, error codes,
          and message patterns. No configuration needed.
        </p>

        <Table columns={RETRYABLE_COLUMNS} data={RETRYABLE_DATA} bordered size="sm" />
      </section>

      <section className="docs-section">
        <Title level="h2" size="lg">
          Exported adapters
        </Title>
        <p className="docs-paragraph">
          All six built-in adapters are exported individually so you can compose custom chains. See
          the{" "}
          <Link href="/docs/adapters" style={{ color: "#58a6ff" }}>
            Adapters reference
          </Link>{" "}
          for detection rules and output examples.
        </p>
        <div className="adapter-detection">
          <Tag variant="primary">axiosAdapter</Tag>
          <Tag variant="primary">kyAdapter</Tag>
          <Tag variant="primary">fetchAdapter</Tag>
          <Tag variant="primary">apolloAdapter</Tag>
          <Tag variant="primary">nodeHttpAdapter</Tag>
          <Tag variant="info">genericAdapter</Tag>
        </div>
      </section>

      <div className="docs-footer">
        <div className="docs-footer-nav">
          <div className="docs-nav-prev">
            <Link href="/docs">
              <span className="docs-nav-label">Previous</span>
              <span className="docs-nav-title">Getting Started</span>
            </Link>
          </div>
          <div className="docs-nav-next">
            <Link href="/docs/adapters">
              <span className="docs-nav-label">Next</span>
              <span className="docs-nav-title">Adapters</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
