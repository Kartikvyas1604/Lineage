"use client";

import { ProposalCard } from "@/components/proposal-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { decideProposal, ingest, listProposals } from "@/lib/api";
import type { IngestReport, Proposal, ProposalDecisionResult } from "@/lib/types";
import { AlertTriangle, CheckCircle2, Inbox, Upload } from "lucide-react";
import { useEffect, useState } from "react";

const SAMPLES = [
  "We decided to move session storage from Redis to a dedicated Postgres table (ADR-031). Redis stays for rate limiting only.",
  "Pasted: weekly platform sync notes. Discussed Kafka consumer lag, no decisions this week.",
];

export function ReviewExperience() {
  const [tab, setTab] = useState("pending");
  const [proposals, setProposals] = useState<Proposal[] | null>(null);

  useEffect(() => {
    let alive = true;
    listProposals().then((p) => alive && setProposals(p));
    return () => {
      alive = false;
    };
  }, []);

  async function handleDecide(id: string, action: "accept" | "reject"): Promise<ProposalDecisionResult> {
    const res = await decideProposal(id, action);
    setProposals(
      (prev) =>
        prev?.map((p) =>
          p.id === id ? { ...p, status: action === "accept" ? "accepted" : "rejected" } : p,
        ) ?? null,
    );
    return res;
  }

  const pending = proposals?.filter((p) => p.status === "pending") ?? [];
  const resolved = proposals?.filter((p) => p.status !== "pending") ?? [];
  const shown = tab === "pending" ? pending : resolved;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Review queue</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Every time the graph notices a decision that was superseded or contradicted, it proposes a
          fix. Nothing changes in the graph until a human accepts it — accept to mark the old
          decision superseded and mark everything downstream stale, with a reason attached.
        </p>
      </header>

      <IngestPanel />

      <div className="flex items-center justify-between gap-2">
        <Tabs
          items={[
            { value: "pending", label: `Pending${pending.length ? ` (${pending.length})` : ""}` },
            { value: "resolved", label: "Resolved" },
          ]}
          value={tab}
          onValueChange={setTab}
          idBase="proposals"
          aria-label="Proposal status"
        />
      </div>

      <div
        role="tabpanel"
        id={`proposals-panel-${tab}`}
        aria-labelledby={`proposals-tab-${tab}`}
        tabIndex={0}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {!proposals ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-14 text-center">
            <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              {tab === "pending" ? "Nothing to review" : "No resolved proposals yet"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {tab === "pending"
                ? "The graph is consistent. New supersessions and contradictions will show up here."
                : "Accept or reject a proposal and it will move here."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {shown.map((p) => (
              <ProposalCard key={p.id} proposal={p} onDecide={handleDecide} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IngestPanel() {
  const [text, setText] = useState("");
  const [report, setReport] = useState<IngestReport | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const r = await ingest(text);
      setReport(r);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Upload className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-medium text-foreground">Add knowledge</h2>
        <span className="text-xs text-muted-foreground">paste a note, thread or doc summary</span>
      </div>
      <label htmlFor="ingest" className="sr-only">
        Text to ingest into the knowledge graph
      </label>
      <Textarea
        id="ingest"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="We decided to …"
        className="min-h-20"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={submit} disabled={busy || !text.trim()}>
          {busy ? "Reading…" : "Ingest"}
        </Button>
        <button
          type="button"
          onClick={() => setText(SAMPLES[0])}
          className="rounded text-xs text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Use a sample
        </button>
        <button
          type="button"
          onClick={() => setText(SAMPLES[1])}
          className="rounded text-xs text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Use a non-decision
        </button>
      </div>

      {report && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="outline">
              <span className="tabular">{report.node_id}</span>
            </Badge>
            <span className="text-muted-foreground">
              {report.decisions_created} decision{report.decisions_created === 1 ? "" : "s"} ·{" "}
              {report.references_created} reference{report.references_created === 1 ? "" : "s"} ·{" "}
              {report.proposals_created} proposal{report.proposals_created === 1 ? "" : "s"}
            </span>
          </div>
          {report.warnings.length > 0 ? (
            <p className="inline-flex items-start gap-1.5 text-xs text-stale">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {report.warnings.join(" ")}
            </p>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-xs text-active">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Ingested as a linked decision. Check the review queue above.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
