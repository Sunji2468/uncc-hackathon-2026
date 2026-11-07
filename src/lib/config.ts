import "server-only";

export const config = {
  openaiModel: process.env.OPENAI_MODEL || "gpt-5.4-mini",
  /** Optional: "minimal" | "low" | "medium" | "high". Unset sends nothing. */
  openaiReasoningEffort: process.env.OPENAI_REASONING_EFFORT || undefined,
  aiDailyLimit: Number.parseInt(process.env.AI_DAILY_LIMIT ?? "40", 10) || 40,
  demoMode: process.env.DEMO_MODE === "true",
};
