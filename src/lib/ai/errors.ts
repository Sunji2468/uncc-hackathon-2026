export type AiErrorCode =
  | "rate_limited" // our own daily cap
  | "provider_busy" // OpenAI 429 / overloaded
  | "timeout"
  | "invalid_response"
  | "refused"
  | "not_configured"
  | "unavailable";

const STATUS: Record<AiErrorCode, number> = {
  rate_limited: 429,
  provider_busy: 503,
  timeout: 504,
  invalid_response: 502,
  refused: 422,
  not_configured: 503,
  unavailable: 502,
};

const MESSAGE: Record<AiErrorCode, string> = {
  rate_limited: "You have used today's AI lookups. Try a sample dish, or come back tomorrow.",
  provider_busy: "The AI service is busy right now. Please try again in a minute.",
  timeout: "That took too long. Please try again.",
  invalid_response: "We could not get a usable answer this time. Please try again.",
  refused: "We could not work with that photo. Please try a different one.",
  not_configured: "AI is not set up on this server. Try a sample dish instead.",
  unavailable: "The AI service is unavailable right now. Please try again.",
};

export class AiError extends Error {
  readonly status: number;
  constructor(
    readonly code: AiErrorCode,
    message?: string,
  ) {
    super(message ?? MESSAGE[code]);
    this.status = STATUS[code];
  }
}
