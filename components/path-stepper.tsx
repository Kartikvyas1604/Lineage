import { cn } from "@/lib/utils";
import type { PathStep } from "@/lib/types";
import { ExternalLink } from "lucide-react";

/** The ordered "why → who → where it landed" chain, hop by hop. */
export function PathStepper({ steps, className }: { steps: PathStep[]; className?: string }) {
  if (steps.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No path — this answer was not grounded in a chain of decisions.
      </p>
    );
  }

  return (
    <ol className={cn("relative flex flex-col gap-0", className)}>
      {steps.map((step, i) => (
        <li key={`${step.from_id}-${step.rel}-${step.to_id}`} className="relative flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <span className="tabular z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[11px] font-medium text-foreground">
              {i + 1}
            </span>
            {i < steps.length - 1 && <span className="w-px flex-1 bg-border" aria-hidden />}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-sm leading-snug text-foreground">{step.from_title}</p>
            <p className="my-0.5">
              <span className="tabular inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {step.rel}
              </span>
            </p>
            <p className="flex items-center gap-1.5 text-sm leading-snug text-foreground">
              <span className="truncate">{step.to_title}</span>
              {step.source_url && (
                <a
                  href={step.source_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex shrink-0 items-center gap-0.5 rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  source
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              )}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
