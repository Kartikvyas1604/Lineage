"use client";

import { GraphView } from "@/components/graph-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { Proposal, ProposalDecisionResult } from "@/lib/types";
import { ArrowRight, Check, ChevronDown, Quote, Sparkles, X } from "lucide-react";
import { useState } from "react";

function fmtDate(ts: number) {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

export function ProposalCard({
  proposal,
  onDecide,
}: {
  proposal: Proposal;
  onDecide: (id: string, action: "accept" | "reject") => Promise<ProposalDecisionResult>;
}) {
  const [showImpact, setShowImpact] = useState(false);
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [result, setResult] = useState<ProposalDecisionResult | null>(null);
  const [outcome, setOutcome] = useState<"accepted" | "rejected" | null>(
    proposal.status === "pending" ? null : proposal.status,
  );
  const [error, setError] = useState<string | null>(null);

  const pct = Math.round(proposal.confidence * 100);
  const kindLabel = proposal.kind === "supersedes" ? "Supersedes" : "Contradicts";

  async function decide(action: "accept" | "reject") {
    setBusy(action);
    setError(null);
    try {
      const res = await onDecide(proposal.id, action);
      setResult(res);
      setOutcome(action === "accept" ? "accepted" : "rejected");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record the decision.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="proposal">
          <Sparkles className="h-3 w-3" aria-hidden />
          {kindLabel}
        </Badge>
        <span className="tabular text-xs text-muted-foreground">
          {pct}% confidence · {proposal.kind === "supersedes" ? "link" : "text"} signal
        </span>
        {outcome && (
          <Badge tone={outcome === "accepted" ? "active" : "outline"} className="ml-auto">
            {outcome === "accepted" ? "Accepted" : outcome === "rejected" ? "Rejected" : outcome}
          </Badge>
        )}
      </div>

      {/* The conflict, side by side */}
      <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-md border border-border bg-background p-3">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Newer
          </p>
          <p className="text-sm font-medium text-foreground">{proposal.new_decision.title}</p>
          <p className="tabular mt-0.5 text-[11px] text-muted-foreground">
            {proposal.new_decision.id}
          </p>
        </div>
        <div className="flex items-center justify-center">
          <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground sm:rotate-0" aria-hidden />
        </div>
        <div className="rounded-md border border-border bg-background p-3">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Older
          </p>
          <p className="text-sm font-medium text-foreground">{proposal.old_decision.title}</p>
          <p className="tabular mt-0.5 text-[11px] text-muted-foreground">
            {proposal.old_decision.id}
          </p>
        </div>
      </div>

      <p className="text-sm leading-6 text-foreground">{proposal.reason}</p>

      <blockquote className="flex gap-2 rounded-md border-l-2 border-proposal/50 bg-proposal/5 px-3 py-2 text-sm italic text-muted-foreground">
        <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-proposal" aria-hidden />
        <span>{proposal.evidence_quote}</span>
      </blockquote>

      {outcome === "accepted" && result && (
        <div className="flex flex-col gap-2 rounded-md border border-active/30 bg-active/5 p-3">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-active">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Applied — {result.affected.length} nodes marked, {result.tasks.length} tasks drafted
          </p>
          <ul className="flex flex-col gap-1.5">
            {result.affected.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-xs">
                <StatusBadge status="stale" />
                <span className="truncate text-foreground">{a.title}</span>
                <span className="ml-auto shrink-0 text-muted-foreground">
                  {a.owners.length ? a.owners.map((o) => o.name).join(", ") : "unowned — needs routing"}
                </span>
              </li>
            ))}
          </ul>
          {result.tasks.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Drafted update tasks ({result.tasks.length})
              </summary>
              <ul className="mt-1.5 flex flex-col gap-1">
                {result.tasks.map((t) => (
                  <li key={t.node_id} className="text-muted-foreground">
                    <span className="text-foreground">{t.task_title}</span> — {t.suggested_action}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowImpact((v) => !v)}
          aria-expanded={showImpact}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", showImpact && "rotate-180")} aria-hidden />
          Preview impact ({proposal.affected.length} nodes)
        </button>

        {!outcome && (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => decide("reject")} disabled={busy !== null}>
              <X className="h-3.5 w-3.5" aria-hidden />
              {busy === "reject" ? "Rejecting…" : "Reject"}
            </Button>
            <Button size="sm" onClick={() => decide("accept")} disabled={busy !== null}>
              <Check className="h-3.5 w-3.5" aria-hidden />
              {busy === "accept" ? "Applying…" : "Accept"}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {showImpact && (
        <div className="flex flex-col gap-2">
          <GraphView subgraph={proposal.impact} heightClass="h-[240px]" />
          <p className="text-xs text-muted-foreground">
            Opened {fmtDate(proposal.created_at)}. Accepting marks every node in this slice stale and
            drafts an update task for each owner.
          </p>
        </div>
      )}
    </article>
  );
}
