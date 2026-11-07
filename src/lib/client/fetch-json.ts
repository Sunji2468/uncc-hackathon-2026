"use client";

export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** fetch + JSON with our `{ error: { code, message } }` shape turned into an exception. */
export async function fetchJson<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiRequestError("offline", "You seem to be offline. Check your connection and try again.", 0);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const e =
      typeof body === "object" && body && "error" in body
        ? (body as { error: { code?: string; message?: string } }).error
        : {};
    throw new ApiRequestError(e.code ?? "error", e.message ?? "Something went wrong. Please try again.", res.status);
  }
  return body as T;
}
