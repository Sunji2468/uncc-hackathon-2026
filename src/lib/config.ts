import "server-only";

export const config = {
  openaiModel: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  /** Optional: "minimal" | "low" | "medium" | "high". Unset sends nothing. */
  openaiReasoningEffort: process.env.OPENAI_REASONING_EFFORT || undefined,
  aiDailyLimit: Number.parseInt(process.env.AI_DAILY_LIMIT ?? "40", 10) || 40,
  demoMode: process.env.DEMO_MODE === "true",
  /** Sign-ups per IP per hour (raise it for automated test servers). */
  signupsPerHour: Number.parseInt(process.env.SIGNUPS_PER_HOUR ?? "10", 10) || 10,
};
