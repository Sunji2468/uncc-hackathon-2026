"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { AlertTriangle, Eye, EyeOff, LoaderCircle } from "lucide-react";
import type { z } from "zod";
import {
  USERNAME_RULES,
  emailSchema,
  loginSchema,
  nameSchema,
  passwordSchema,
  passwordScore,
  signupSchema,
  usernameSchema,
} from "@/lib/auth-schemas";
import { ApiRequestError, fetchJson } from "@/lib/client/fetch-json";

type Mode = "signup" | "login";
type Field = "name" | "username" | "email" | "password" | "confirm" | "identifier";

const FIELD_FOR_CODE: Record<string, Field> = { username_taken: "username", email_taken: "email" };
const STRENGTH = ["Too short", "Okay", "Good", "Strong", "Very strong"];

function check(schema: z.ZodType, value: string): string {
  const r = schema.safeParse(value);
  return r.success ? "" : (r.error.issues[0]?.message ?? "Check this field.");
}

export function AuthForm({ mode, next, hasGuestData }: { mode: Mode; next: string; hasGuestData: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
    identifier: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const validators: Partial<Record<Field, (v: string) => string>> =
    mode === "signup"
      ? {
          name: (v) => check(nameSchema, v),
          username: (v) => check(usernameSchema, v),
          email: (v) => check(emailSchema, v),
          password: (v) => check(passwordSchema, v),
          confirm: (v) => (v === values.password ? "" : "The passwords do not match."),
        }
      : {
          identifier: (v) => (v.trim() ? "" : "Enter your username or email."),
          password: (v) => (v ? "" : "Enter your password."),
        };

  const set = (f: Field, v: string) => {
    setValues((s) => ({ ...s, [f]: v }));
    if (errors[f]) setErrors((e) => ({ ...e, [f]: validators[f]?.(v) ?? "" }));
  };
  const blur = (f: Field) => values[f] && setErrors((e) => ({ ...e, [f]: validators[f]?.(values[f]) ?? "" }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const found: Partial<Record<Field, string>> = {};
    for (const [f, v] of Object.entries(validators) as [Field, (s: string) => string][]) {
      const msg = v(values[f]);
      if (msg) found[f] = msg;
    }
    setErrors(found);
    const firstBad = Object.keys(found)[0];
    if (firstBad) {
      document.getElementById(`${mode}-${firstBad}`)?.focus();
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const body = signupSchema.parse({ name: values.name, username: values.username, email: values.email, password: values.password });
        await fetchJson("/api/auth/signup", { method: "POST", json: body });
      } else {
        const body = loginSchema.parse({ identifier: values.identifier, password: values.password });
        await fetchJson("/api/auth/login", { method: "POST", json: body });
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiRequestError && FIELD_FOR_CODE[err.code]) {
        const f = FIELD_FOR_CODE[err.code];
        setErrors((e2) => ({ ...e2, [f]: err.message }));
        document.getElementById(`${mode}-${f}`)?.focus();
      } else {
        setFormError(err instanceof ApiRequestError ? err.message : "Something went wrong. Please try again.");
      }
    }
  };

  const score = passwordScore(values.password);

  return (
    <div>
      <h1 className="text-[40px] leading-[1.05] tracking-[-1.2px]">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-2 text-base text-muted">
        {mode === "signup"
          ? hasGuestData
            ? "Everything on your board comes with you."
            : "Save your stickers, goals and recipes to any device."
          : hasGuestData
            ? "Log in and we will move this browser's stickers into your account."
            : "Log in to see your board on this device."}
      </p>

      {formError && (
        <p role="alert" className="mt-5 flex items-start gap-2 rounded-2xl border-2 border-coral bg-coral/10 p-3.5 font-bold">
          <AlertTriangle size={18} className="mt-0.5 flex-none text-coral" aria-hidden="true" /> {formError}
        </p>
      )}

      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        {mode === "signup" ? (
          <>
            <TextField id="signup-name" label="Name" autoComplete="name" value={values.name} error={errors.name} onChange={(v) => set("name", v)} onBlur={() => blur("name")} />
            <TextField
              id="signup-username"
              label="Username"
              autoComplete="username"
              hint={`Shown on the Community Fridge. ${USERNAME_RULES}.`}
              value={values.username}
              error={errors.username}
              onChange={(v) => set("username", v.toLowerCase())}
              onBlur={() => blur("username")}
              prefix="@"
            />
            <TextField id="signup-email" label="Email" type="email" autoComplete="email" inputMode="email" value={values.email} error={errors.email} onChange={(v) => set("email", v)} onBlur={() => blur("email")} />
            <PasswordField
              id="signup-password"
              label="Password"
              autoComplete="new-password"
              hint="At least 8 characters, with a letter and a number."
              value={values.password}
              error={errors.password}
              show={show}
              onToggle={() => setShow((s) => !s)}
              onChange={(v) => set("password", v)}
              onBlur={() => blur("password")}
            />
            {values.password && (
              <div aria-live="polite" className="-mt-2">
                <div className="flex gap-1.5" aria-hidden="true">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= score ? (score >= 3 ? "bg-butter" : "bg-coral") : "bg-line"}`} />
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted">Strength: {STRENGTH[score]}</p>
              </div>
            )}
            <PasswordField
              id="signup-confirm"
              label="Confirm password"
              autoComplete="new-password"
              value={values.confirm}
              error={errors.confirm}
              show={show}
              onToggle={() => setShow((s) => !s)}
              onChange={(v) => set("confirm", v)}
              onBlur={() => blur("confirm")}
            />
          </>
        ) : (
          <>
            <TextField
              id="login-identifier"
              label="Username or email"
              autoComplete="username"
              value={values.identifier}
              error={errors.identifier}
              onChange={(v) => set("identifier", v)}
              onBlur={() => blur("identifier")}
            />
            <PasswordField
              id="login-password"
              label="Password"
              autoComplete="current-password"
              value={values.password}
              error={errors.password}
              show={show}
              onToggle={() => setShow((s) => !s)}
              onChange={(v) => set("password", v)}
              onBlur={() => blur("password")}
            />
          </>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-butter text-lg font-bold text-bg transition hover:brightness-105 disabled:opacity-70"
        >
          {busy && <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />}
          {mode === "signup" ? (busy ? "Creating your account..." : "Create account") : busy ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-[15px] text-muted">
        {mode === "signup" ? "Already have an account? " : "New to Bytehacks? "}
        <Link
          href={`${mode === "signup" ? "/login" : "/signup"}${next !== "/board" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-bold text-butter underline-offset-4 hover:underline"
        >
          {mode === "signup" ? "Log in" : "Create an account"}
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-muted">
        Or{" "}
        <Link href="/board" className="font-bold text-ink underline-offset-4 hover:underline">
          continue as a guest
        </Link>
      </p>
    </div>
  );
}

const inputCls =
  "min-h-[52px] w-full rounded-[14px] border-2 bg-face px-4 text-base text-sticker-ink placeholder:text-sticker-muted focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-butter";

function FieldShell({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[15px] font-bold">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-0.5 text-[13px] text-muted">
          {hint}
        </p>
      )}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-bold text-coral">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

function TextField({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  onBlur,
  prefix,
  ...rest
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  prefix?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "onBlur" | "value" | "prefix">) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-bold text-sticker-muted" aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, hint, error)}
          spellCheck={false}
          autoCapitalize="none"
          className={`${inputCls} ${prefix ? "pl-8" : ""} ${error ? "border-coral" : "border-transparent"}`}
          {...rest}
        />
      </div>
    </FieldShell>
  );
}

function PasswordField({
  id,
  label,
  hint,
  error,
  value,
  show,
  onToggle,
  onChange,
  onBlur,
  autoComplete,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  onBlur: () => void;
  autoComplete: string;
}) {
  const toggleId = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, hint, error)}
          className={`${inputCls} pr-14 ${error ? "border-coral" : "border-transparent"}`}
        />
        <button
          id={toggleId}
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl text-sticker-muted hover:bg-chip"
        >
          {show ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
    </FieldShell>
  );
}
