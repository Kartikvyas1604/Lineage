"use client";

import { cn } from "@/lib/utils";
import type { TraceStep } from "@/lib/types";
import { Check, ChevronRight, Search, Sparkles, Waypoints, Wrench, X } from "lucide-react";
import { useState } from "react";

const TOOL_ICON: Record<string, typeof Search> = {
  search_decisions: Search,
  vector_search: Search,
  why_decision: Waypoints,
  impact_of: Waypoints,
  who_knows: Waypoints,
  synthesize_answer: Sparkles,
};

const TOOL_LABEL: Record<string, string> = {
  search_decisions: "Search decisions",
  vector_search: "Semantic search",
  why_decision: "Trace provenance",
  impact_of: "Compute impact",
  who_knows: "Rank people",
  synthesize_answer: "Synthesise answer",
};

/**
 * The agent trace timeline. Steps stream in; each shows the tool, what it
 * did, how long it took and — when expanded — the Cypher it ran.
 */
export function AgentTrace({
  steps,
  active,
  total,
}: {
  steps: TraceStep[];
  active: boolean;
  total?: number;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const pending = active && (total ?? steps.length) > steps.length;

  return (
    <section aria-label="Agent trace" className="rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Wrench className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          How I found this
        </h2>
        <span className="ml-auto tabular text-xs text-muted-foreground">
          {steps.length}
          {pending ? "…" : ""} step{steps.length === 1 ? "" : "s"}
        </span>
      </header>
      <ol className="divide-y divide-border">
        {steps.map((step, i) => {
          const Icon = TOOL_ICON[step.tool] ?? Wrench;
          const isOpen = open === i;
          return (
            <li key={`${step.tool}-${i}`} className="animate-rise">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
                    step.ok ? "border-border text-muted-foreground" : "border-destructive text-destructive",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {TOOL_LABEL[step.tool] ?? step.tool}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{step.summary}</span>
                </span>
                <span className="tabular shrink-0 text-xs text-muted-foreground">{step.duration_ms}ms</span>
                {step.ok ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-active" aria-label="succeeded" />
                ) : (
                  <X className="h-3.5 w-3.5 shrink-0 text-destructive" aria-label="failed" />
                )}
                <ChevronRight
                  className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")}
                  aria-hidden
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-3 pl-[3.25rem]">
                  {step.cypher.length > 0 ? (
                    <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
                      <code className="tabular text-muted-foreground">
                        {step.cypher.join("\n")}
                        {"\n"}
                        <span className="text-foreground">{`// ${step.summary}`}</span>
                      </code>
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">{step.summary}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {pending && (
          <li className="flex items-center gap-3 px-4 py-2.5">
            <span className="inline-flex h-6 w-6 animate-pulse items-center justify-center rounded-md border border-border motion-reduce:animate-none" />
            <span className="text-sm text-muted-foreground">Thinking…</span>
          </li>
        )}
      </ol>
    </section>
  );
}
