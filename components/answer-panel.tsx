"use client";

import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { AskResponse, Confidence } from "@/lib/types";
import { AlertTriangle, ArrowRight, CircleCheck, CircleDot, CircleHelp, ExternalLink, Sparkles } from "lucide-react";

const CONFIDENCE: Record<
  Confidence,
  { tone: "active" | "proposal" | "stale" | "risk"; label: string; Icon: typeof CircleCheck; note: string }
> = {
  high: { tone: "active", label: "High confidence", Icon: CircleCheck, note: "Directly grounded in linked decisions and sources." },
  medium: { tone: "proposal", label: "Medium confidence", Icon: CircleDot, note: "Grounded, but the chain is incomplete or partly inferred." },
  low: { tone: "stale", label: "Low confidence", Icon: AlertTriangle, note: "A weak match — treat as a lead, not an answer." },
  none: { tone: "risk", label: "No grounded answer", Icon: CircleHelp, note: "No path in the graph supports an answer." },
};

export function AnswerPanel({
  response,
  onAsk,
}: {
  response: AskResponse;
  onAsk?: (question: string) => void;
}) {
  const c = CONFIDENCE[response.confidence];
  return (
    <section aria-label="Answer" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={c.tone} title={c.note}>
          <c.Icon className="h-3 w-3" aria-hidden />
          {c.label}
        </Badge>
        <Badge tone="outline">
          <Sparkles className="h-3 w-3" aria-hidden />
          {response.mode === "llm" ? "Grounded answer" : "Rules mode"}
        </Badge>
        <span className="ml-auto">
          <CopyButton value={response.answer} label="Copy answer" />
        </span>
      </div>

      <p className="max-w-prose text-base leading-7 text-foreground">{response.answer}</p>

      {response.citations.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sources ({response.citations.length})
            </p>
            <ul className="flex flex-wrap gap-2">
              {response.citations.map((cite) => {
                const inner = (
                  <>
                    <span className="tabular text-[10px] uppercase text-muted-foreground">
                      {cite.label}
                    </span>
                    <span className="max-w-56 truncate">{cite.title}</span>
                    {cite.source_url && <ExternalLink className="h-3 w-3" aria-hidden />}
                  </>
                );
                const cls = cn(
                  "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground",
                  cite.source_url && "hover:bg-accent",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                );
                return (
                  <li key={cite.node_id}>
                    {cite.source_url ? (
                      <a href={cite.source_url} target="_blank" rel="noreferrer noopener" className={cls}>
                        {inner}
                      </a>
                    ) : (
                      <span className={cls}>{inner}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {response.follow_ups.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ask next
            </p>
            <div className="flex flex-wrap gap-2">
              {response.follow_ups.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onAsk?.(f)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {f}
                  <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
