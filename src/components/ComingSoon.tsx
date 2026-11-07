import { Construction } from "lucide-react";

/** Placeholder body for screens that later milestones fill in. */
export function ComingSoon({ milestone, what }: { milestone: string; what: string }) {
  return (
    <div className="dotted-board mt-7 flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[32px] border-2 border-line p-8 text-center">
      <Construction size={36} className="text-butter" aria-hidden="true" />
      <p className="font-display text-2xl font-extrabold">{what}</p>
      <p className="text-muted">Arrives in milestone {milestone}.</p>
    </div>
  );
}
