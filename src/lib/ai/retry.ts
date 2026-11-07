import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { AiError } from "./errors";

export type Outcome<T> =
  | { ok: true; value: T }
  | { ok: false; code: "refused" | "invalid_response"; problems: string[] };

export interface RetryOptions<T> {
  name: string;
  messages: ChatCompletionMessageParam[];
  /** One model call. Throws only for provider errors (network, auth, 5xx). */
  attempt: (messages: ChatCompletionMessageParam[]) => Promise<Outcome<T>>;
  /** Rules beyond the JSON shape. Any problem triggers the single retry. */
  validate?: (value: T) => string[];
  maxAttempts?: number;
}

/**
 * Calls the model, validates, and on failure retries once with the problems
 * spelled out so the model can fix them. Gives up with a typed AiError.
 * Pure (no network of its own), so it is unit-tested with a fake `attempt`.
 */
export async function runWithRetry<T>(opts: RetryOptions<T>): Promise<T> {
  const messages = [...opts.messages];
  const max = opts.maxAttempts ?? 2;
  let lastCode: "refused" | "invalid_response" = "invalid_response";

  for (let i = 0; i < max; i++) {
    const outcome = await opts.attempt(messages);
    let problems: string[];
    if (outcome.ok) {
      problems = opts.validate?.(outcome.value) ?? [];
      if (problems.length === 0) return outcome.value;
      lastCode = "invalid_response";
      messages.push({ role: "assistant", content: JSON.stringify(outcome.value) });
    } else {
      lastCode = outcome.code;
      problems = outcome.problems;
    }
    console.warn(`${opts.name}: attempt ${i + 1} rejected: ${problems.join("; ")}`);
    messages.push({
      role: "user",
      content: `Your previous answer was rejected for these reasons:\n- ${problems.join("\n- ")}\nFix every problem and answer again.`,
    });
  }
  throw new AiError(lastCode);
}
