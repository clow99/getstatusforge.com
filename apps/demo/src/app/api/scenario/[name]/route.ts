import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    name: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { name } = await context.params;

  switch (name) {
    case "http-503":
      return NextResponse.json(
        {
          code: "UPSTREAM_UNAVAILABLE",
          message: "Service unavailable. Please retry shortly."
        },
        { status: 503 }
      );

    case "graphql-error":
      return NextResponse.json(
        {
          data: null,
          errors: [
            {
              message: "Quota exhausted",
              extensions: {
                code: "TOO_MANY_REQUESTS"
              }
            }
          ]
        },
        { status: 200 }
      );

    case "backend-json":
      return NextResponse.json(
        {
          status: 400,
          error: {
            code: "INVALID_INPUT",
            message: "email is required"
          },
          requestId: "demo-request-001"
        },
        { status: 400 }
      );

    default:
      return NextResponse.json(
        {
          code: "UNKNOWN_SCENARIO",
          message: `No scenario defined for '${name}'.`
        },
        { status: 404 }
      );
  }
}
