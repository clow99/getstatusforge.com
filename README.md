# statusforge

`statusforge` normalizes mixed error shapes into a consistent JSON object:

```ts
{
  code: string;
  message: string;
  status: number | null;
  retryable: boolean;
  details: Record<string, unknown> | null;
}
```

This repository is an npm workspaces monorepo containing the core package and a Next.js demo app.

## Repo Structure

- `packages/statusforge` - core TypeScript library
- `apps/demo` - interactive Next.js demo (`getstatusforge.com`)

## Requirements

- Node.js 20+
- npm 10+

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development environment (library watch build + demo app):

```bash
npm run dev
```

Open `http://localhost:3000`.

## Workspace Scripts

From the repository root:

- `npm run dev` - watch library build and run demo app
- `npm run build` - build library and demo
- `npm run test` - run package tests (Vitest)
- `npm run lint` - lint package and demo
- `npm run typecheck` - TypeScript checks for package and demo

## Library Usage

```ts
import { normalizeError } from "statusforge";

try {
  // your request logic
} catch (error) {
  const normalized = normalizeError(error);
  console.log(normalized);
}
```

Default adapters include support for:

- Axios errors
- Ky errors
- Fetch/HTTP-style errors
- Apollo/GraphQL-style errors
- Node transport errors (for example `ECONNRESET`, `ETIMEDOUT`)
- Generic fallback handling

### Custom Adapter Order

You can override adapter order or add your own adapter:

```ts
import { normalizeError, axiosAdapter, genericAdapter, type ErrorAdapter } from "statusforge";

const customAdapter: ErrorAdapter = {
  name: "my-backend-adapter",
  canHandle(input) {
    return typeof input === "object" && input !== null && "kind" in input;
  },
  normalize(input) {
    const record = input as { kind?: string; message?: string };
    return {
      code: record.kind ?? "CUSTOM_ERROR",
      message: record.message ?? "Unknown custom error"
    };
  }
};

const normalized = normalizeError(someUnknownValue, {
  adapters: [customAdapter, axiosAdapter, genericAdapter]
});
```

## Running Tests

Run all tests from root:

```bash
npm run test
```

Run tests only for the package:

```bash
npm -w packages/statusforge run test
```

## License

MIT
