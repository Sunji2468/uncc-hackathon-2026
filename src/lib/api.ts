import { NextResponse } from "next/server";
import type { z } from "zod";
import type { ApiError } from "@/types";

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json<ApiError>({ error: { code, message } }, { status });
}

type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse<ApiError> };

/** Reads and validates a JSON body. Never throws. */
export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<Parsed<z.infer<S>>> {
  // JSON only: plain cross-site HTML forms cannot send this content type (CSRF guard).
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return { ok: false, response: apiError(415, "json_required", "Send the request as JSON.") };
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: apiError(400, "invalid_json", "The request body must be JSON.") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    return {
      ok: false,
      response: apiError(400, "invalid_body", `${where}${first?.message ?? "Invalid request."}`),
    };
  }
  return { ok: true, data: result.data };
}

/** Wraps a handler so unexpected errors become a clean 500, never a stack trace. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error(err);
      return apiError(500, "internal", "Something went wrong on our side. Please try again.");
    }
  };
}
