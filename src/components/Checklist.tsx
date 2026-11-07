import { Check, Circle, LoaderCircle } from "lucide-react";

export type StepState = "todo" | "active" | "done";

export function Checklist({ steps }: { steps: { label: string; state: StepState }[] }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {steps.map(({ label, state }) => (
        <li
          key={label}
          className={`flex items-center gap-3.5 text-base font-bold ${state === "todo" ? "text-muted" : ""}`}
        >
          <span
            className={`flex size-8 flex-none items-center justify-center rounded-full ${
              state === "done" ? "bg-butter text-bg" : ""
            }`}
          >
            {state === "done" && <Check size={18} strokeWidth={3} aria-hidden="true" />}
            {state === "active" && (
              <LoaderCircle size={22} className="animate-spin text-butter motion-reduce:animate-none" aria-hidden="true" />
            )}
            {state === "todo" && <Circle size={20} aria-hidden="true" />}
          </span>
          {label}
          <span className="sr-only">
            {state === "done" ? " (done)" : state === "active" ? " (in progress)" : " (waiting)"}
          </span>
        </li>
      ))}
    </ul>
  );
}
