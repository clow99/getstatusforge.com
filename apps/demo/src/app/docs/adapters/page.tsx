"use client";

import {
  Accordion,
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

const DEFAULT_ORDER_CODE = `// Default adapter chain (used when options.adapters is omitted):
[axiosAdapter, kyAdapter, fetchAdapter, apolloAdapter, nodeHttpAdapter, genericAdapter]`;

const CUSTOM_CHAIN_CODE = `import {
  normalizeError,
  axiosAdapter,
  fetchAdapter,
  genericAdapter
} from "@npmforge/statusforge";

// Only keep adapters you need, in your preferred order
const result = normalizeError(error, {
  adapters: [axiosAdapter, fetchAdapter, genericAdapter]
});`;

const ADAPTER_COLUMNS = [
  { key: "field", header: "Field" },
  { key: "value", header: "Example value" }
];

const AXIOS_EXAMPLE = [
  { field: "code", value: "HTTP_503" },
  { field: "message", value: "Service unavailable. Please retry shortly." },
  { field: "status", value: "503" },
  { field: "retryable", value: "true" },
  { field: "details", value: '{ url: "/api/data", method: "get", ... }' }
];

const KY_EXAMPLE = [
  { field: "code", value: "HTTP_503" },
  { field: "message", value: "Service Unavailable" },
  { field: "status", value: "503" },
  { field: "retryable", value: "true" },
  { field: "details", value: '{ url: "/api/data", ... }' }
];

const FETCH_EXAMPLE = [
  { field: "code", value: "HTTP_503" },
  { field: "message", value: "Service Unavailable" },
  { field: "status", value: "503" },
  { field: "retryable", value: "true" },
  { field: "details", value: '{ url: "http://localhost/api/data", statusText: "Service Unavailable" }' }
];

const APOLLO_EXAMPLE = [
  { field: "code", value: "TOO_MANY_REQUESTS" },
  { field: "message", value: "Quota exhausted" },
  { field: "status", value: "502" },
  { field: "retryable", value: "true" },
  { field: "details", value: '{ graphQLErrors: [...], networkError: { ... } }' }
];

const NODE_EXAMPLE = [
  { field: "code", value: "ECONNRESET" },
  { field: "message", value: "socket hang up" },
  { field: "status", value: "null" },
  { field: "retryable", value: "true" },
  { field: "details", value: '{ syscall: "read" }' }
];

const GENERIC_EXAMPLE = [
  { field: "code", value: "UNKNOWN_ERROR" },
  { field: "message", value: "database connection dropped" },
  { field: "status", value: "null" },
  { field: "retryable", value: "false" },
  { field: "details", value: "null" }
];

const ADAPTERS = [
  {
    name: "axiosAdapter",
    exportName: "axiosAdapter",
    description:
      "Handles errors thrown by Axios. Detects AxiosError instances by checking isAxiosError, the error name, or the presence of config + request/response properties.",
    detects: [
      "isAxiosError === true",
      'name === "AxiosError"',
      "Has config + (request or response)"
    ],
    example: AXIOS_EXAMPLE,
    category: "HTTP client"
  },
  {
    name: "kyAdapter",
    exportName: "kyAdapter",
    description:
      "Handles HTTPError and TimeoutError thrown by ky. Detects by checking the error name or the presence of response + request + options.",
    detects: [
      'name === "HTTPError" or "TimeoutError"',
      "Has response + request + options"
    ],
    example: KY_EXAMPLE,
    category: "HTTP client"
  },
  {
    name: "fetchAdapter",
    exportName: "fetchAdapter",
    description:
      "Handles native fetch Response objects and fetch-related errors. Detects Response-like objects (status + statusText/url) and TypeError/AbortError from fetch.",
    detects: [
      "Has status + (statusText or url)",
      'name === "AbortError" or "TypeError"',
      '"fetch" in error message',
      "Error with cause.code"
    ],
    example: FETCH_EXAMPLE,
    category: "Browser fetch"
  },
  {
    name: "apolloAdapter",
    exportName: "apolloAdapter",
    description:
      "Handles Apollo Client errors and GraphQL error shapes. Detects by checking for graphQLErrors, networkError, or the ApolloError name.",
    detects: [
      "Has graphQLErrors array",
      "Has networkError",
      'name === "ApolloError"'
    ],
    example: APOLLO_EXAMPLE,
    category: "GraphQL"
  },
  {
    name: "nodeHttpAdapter",
    exportName: "nodeHttpAdapter",
    description:
      "Handles Node.js transport-level errors such as connection resets, timeouts, and DNS failures. Detects Error instances whose code matches known Node network error codes.",
    detects: [
      "Error with code in ECONNRESET, ECONNABORTED, ETIMEDOUT, EAI_AGAIN, ENOTFOUND, ECONNREFUSED, EHOSTUNREACH, EPIPE",
      "Error with code starting with UND_ERR_"
    ],
    example: NODE_EXAMPLE,
    category: "Transport"
  },
  {
    name: "genericAdapter",
    exportName: "genericAdapter",
    description:
      'Catches everything else. Handles plain Error instances, strings, and arbitrary objects. Always returns true from canHandle, so it should be last in any custom chain.',
    detects: ["canHandle always returns true"],
    example: GENERIC_EXAMPLE,
    category: "Fallback"
  }
];

const ACCORDION_ITEMS = ADAPTERS.map((adapter) => ({
  value: adapter.exportName,
  title: adapter.exportName,
  content: (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <Tag variant={adapter.category === "Fallback" ? "info" : "primary"} size="sm">
          {adapter.category}
        </Tag>
      </div>
      <p className="docs-paragraph">{adapter.description}</p>

      <Title level="h4" size="sm">
        Detection rules
      </Title>
      <ul style={{ color: "#8b949e", fontSize: "0.85rem", lineHeight: 1.65, paddingLeft: "1.25rem" }}>
        {adapter.detects.map((rule) => (
          <li key={rule}>
            <code style={{ fontSize: "0.8rem" }}>{rule}</code>
          </li>
        ))}
      </ul>

      <Title level="h4" size="sm">
        Example output
      </Title>
      <Table columns={ADAPTER_COLUMNS} data={adapter.example} bordered size="sm" />
    </div>
  )
}));

export default function AdaptersPage() {
  return (
    <>
      <div className="docs-breadcrumb">
        <Breadcrumb
          items={[
            { label: "Docs", href: "/docs" },
            { label: "Adapters" }
          ]}
        />
      </div>

      <section className="docs-section">
        <Title level="h1" size="xxl">
          Adapters
        </Title>
        <p className="docs-lead">
          Adapters are the detection and normalization layer. Each adapter knows how to recognize a
          specific error shape and extract its fields into a <code>NormalizedError</code>.
        </p>
      </section>

      <Divider />

      <section className="docs-section">
        <Title level="h2" size="lg">
          Default adapter chain
        </Title>
        <p className="docs-paragraph">
          When you call <code>normalizeError</code> without specifying adapters, the default chain
          runs in this order. The first adapter whose <code>canHandle</code> returns{" "}
          <code>true</code> wins.
        </p>
        <div className="docs-code-block">
          <span className="docs-code-label">Default order</span>
          <pre>{DEFAULT_ORDER_CODE}</pre>
        </div>

        <Alert variant="info" title="Adapter priority">
          More specific adapters (axios, ky) run before broader ones (fetch, generic). This
          prevents false positives — for example, an Axios error also has status and statusText
          properties, which would match the fetch adapter if it ran first.
        </Alert>
      </section>

      <section className="docs-section">
        <Title level="h2" size="lg">
          Built-in adapters
        </Title>
        <p className="docs-paragraph">
          Expand each adapter below to see its detection logic, handled error shapes, and example
          output.
        </p>

        <Accordion items={ACCORDION_ITEMS} variant="separated" multiple />
      </section>

      <Divider />

      <section className="docs-section">
        <Title level="h2" size="lg">
          Custom adapter chains
        </Title>
        <p className="docs-paragraph">
          Override the default chain by passing your own adapter array. This lets you add
          domain-specific adapters, remove adapters you don't need, or reorder the chain.
        </p>

        <div className="docs-code-block">
          <span className="docs-code-label">Custom chain</span>
          <pre>{CUSTOM_CHAIN_CODE}</pre>
        </div>

        <Card variant="bordered">
          <Card.Body>
            <Title level="h4" size="md">
              Best practices
            </Title>
            <div className="param-grid">
              <div className="param-item">
                <div className="param-header">
                  <span className="param-name">Specific before generic</span>
                </div>
                <span className="param-desc">
                  Place your most specific adapters first. The generic adapter matches everything, so
                  it should always be last.
                </span>
              </div>
              <div className="param-item">
                <div className="param-header">
                  <span className="param-name">Keep canHandle fast</span>
                </div>
                <span className="param-desc">
                  Avoid async operations or expensive checks in canHandle. It runs synchronously for
                  every adapter in the chain until one matches.
                </span>
              </div>
              <div className="param-item">
                <div className="param-header">
                  <span className="param-name">Return partial objects</span>
                </div>
                <span className="param-desc">
                  Your normalize function can return a partial NormalizedError. StatusForge fills in
                  sensible defaults for any fields you omit.
                </span>
              </div>
            </div>
          </Card.Body>
        </Card>
      </section>

      <section className="docs-section">
        <Alert variant="info" title="Need the full API?">
          See the{" "}
          <Link href="/docs/api" style={{ color: "#58a6ff" }}>
            API Reference
          </Link>{" "}
          for the complete ErrorAdapter interface, NormalizedError type, and retryable inference
          rules.
        </Alert>
      </section>

      <div className="docs-footer">
        <div className="docs-footer-nav">
          <div className="docs-nav-prev">
            <Link href="/docs/api">
              <span className="docs-nav-label">Previous</span>
              <span className="docs-nav-title">API Reference</span>
            </Link>
          </div>
          <div />
        </div>
      </div>
    </>
  );
}
