import { z } from "zod";

/** Shared by the sign-up and log-in forms and their API routes. */

export const USERNAME_RULES = "3 to 24 letters, numbers, dots or underscores";

export const nameSchema = z.string().trim().min(1, "Enter your name.").max(24, "Keep your name under 24 characters.");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Usernames need at least 3 characters.")
  .max(24, "Usernames can be at most 24 characters.")
  .regex(/^[a-z0-9_.]+$/, `Use ${USERNAME_RULES}.`)
  .refine((u) => !/^[._]|[._]$/.test(u), "Usernames can't start or end with a dot or underscore.")
  .refine((u) => !/^u_/.test(u), "That username is reserved.");

export const emailSchema = z.string().trim().toLowerCase().max(254).email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Keep it under 128 characters.")
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), "Use at least one letter and one number.");

export const signupSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  /** Username or email. */
  identifier: z.string().trim().toLowerCase().min(1, "Enter your username or email.").max(254),
  password: z.string().min(1, "Enter your password.").max(128),
});

/** 0 to 4, for the strength meter on the sign-up form. */
export function passwordScore(p: string): number {
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p) && /[^a-zA-Z0-9]/.test(p)) score++;
  return Math.min(4, score);
}

export function safeNext(next: string | null | undefined): string {
  // Only same-site paths, never "//evil.com" or absolute URLs.
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/board";
}
