import "server-only";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import type { z } from "zod";
import { config } from "@/lib/config";
import { AiError } from "./errors";
import { runWithRetry, type Outcome } from "./retry";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new AiError("not_configured");
  client ??= new OpenAI({ timeout: 60_000, maxRetries: 1 });
  return client;
}

export interface StructuredCall<S extends z.ZodType> {
  name: string;
  schema: S;
  system: string;
  user: string | ChatCompletionContentPart[];
  /** Extra rules beyond the JSON shape; return problems to trigger the retry. */
  validate?: (value: z.infer<S>) => string[];
}

function mapProviderError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof OpenAI.APIConnectionTimeoutError) return new AiError("timeout");
  if (err instanceof OpenAI.RateLimitError) return new AiError("provider_busy");
  if (err instanceof OpenAI.APIError && (err.status ?? 0) >= 500) return new AiError("provider_busy");
  if (err instanceof OpenAI.AuthenticationError) return new AiError("not_configured");
  console.error("OpenAI error:", err instanceof Error ? err.message : err);
  return new AiError("unavailable");
}

/** One OpenAI call with Structured Outputs, validated, retried once on bad output. */
export async function callStructured<S extends z.ZodType>(call: StructuredCall<S>): Promise<z.infer<S>> {
  const openai = getClient();
  return runWithRetry<z.infer<S>>({
    name: call.name,
    messages: [
      { role: "system", content: call.system },
      { role: "user", content: call.user },
    ],
    validate: call.validate,
    attempt: async (messages): Promise<Outcome<z.infer<S>>> => {
      try {
        const completion = await openai.chat.completions.parse({
          model: config.openaiModel,
          messages,
          response_format: zodResponseFormat(call.schema, call.name),
          ...(config.openaiReasoningEffort
            ? { reasoning_effort: config.openaiReasoningEffort as OpenAI.ReasoningEffort }
            : {}),
        });
        const message = completion.choices[0]?.message;
        if (message?.refusal) {
          return { ok: false, code: "refused", problems: ["you refused; if the request is acceptable, answer with the JSON"] };
        }
        if (message?.parsed == null) {
          return { ok: false, code: "invalid_response", problems: ["the response did not match the schema"] };
        }
        return { ok: true, value: message.parsed as z.infer<S> };
      } catch (err) {
        // The SDK's own zod parse failing means bad output, not a provider error.
        if (err instanceof Error && err.name === "ZodError") {
          return { ok: false, code: "invalid_response", problems: [err.message.slice(0, 500)] };
        }
        throw mapProviderError(err);
      }
    },
  });
}

export function imagePart(base64: string, mediaType: "image/jpeg" | "image/png"): ChatCompletionContentPart {
  return { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}`, detail: "high" } };
}
