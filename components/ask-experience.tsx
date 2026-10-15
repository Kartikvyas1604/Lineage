"use client";

import { AgentTrace } from "@/components/agent-trace";
import { AnswerPanel } from "@/components/answer-panel";
import { GraphView } from "@/components/graph-view";
import { PathStepper } from "@/components/path-stepper";
import { SourcePanel } from "@/components/source-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Legend } from "@/components/ui/status-badge";
import { askStream } from "@/lib/api";
import { demoSubgraph } from "@/lib/demo-data";
import type { AskResponse, GraphNode, TraceStep } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowRight, Search, Sparkles, Waypoints } from "lucide-react";
import { useRef, useState } from "react";

const EXAMPLES = [
  "Why do we use Redis for sessions?",
  "What breaks if we change how sessions are stored?",
  "Who owns the payments API?",
  "Are we sure about audit log retention?",
  "What went stale this week?",
];

const EMPTY = demoSubgraph();

export function AskExperience() {
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamSteps, setStreamSteps] = useState<TraceStep[]>([]);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  async function run(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    const id = ++runId.current;
    setSubmitted(trimmed);
    setQuestion("");
    setLoading(true);
    setStreamSteps([]);
    setResponse(null);
    setSelected(null);
    setError(null);
    try {
      const res = await askStream({ question: trimmed }, (step) => {
        if (runId.current === id) setStreamSteps((prev) => [...prev, step]);
      });
      if (runId.current === id) {
        setResponse(res);
        setStreamSteps(res.trace);
        const first = res.citations[0];
        if (first) {
          const node = res.path.nodes.find((n) => n.id === first.node_id) ?? null;
          setSelected(node);
        }
      }
    } catch (e) {
      if (runId.current === id) setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      if (runId.current === id) setLoading(false);
    }
  }

  const pathEdgeIds = response
    ? response.steps
        .map(
          (s) =>
            response.path.edges.find(
              (e) =>
                (e.source === s.from_id && e.target === s.to_id) ||
                (e.source === s.to_id && e.target === s.from_id),
            )?.id,
        )
        .filter((x): x is string => Boolean(x))
    : [];

  const showHero = !response && !loading && !error;
  const graph = response?.path ?? EMPTY;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      {showHero && (
        <div className="flex flex-col gap-3 pt-4 sm:pt-10">
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <Waypoints className="h-3.5 w-3.5" aria-hidden />
            Company knowledge graph · every answer shows its path
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Ask your company why.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Lineage answers why a decision was made, what it broke, and who to ask — by walking the
            graph of decisions, docs, tickets and people. If there&apos;s no path, it says so.
          </p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(question);
        }}
        className="flex w-full max-w-3xl items-center gap-2"
        role="search"
      >
        <label htmlFor="ask" className="sr-only">
          Ask a question about your company&apos;s decisions
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id="ask"
            name="ask"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Why do we use Redis for sessions?"
            autoComplete="off"
            enterKeyHint="search"
            aria-busy={loading}
            className="h-12 pl-9 text-base"
          />
        </div>
        <Button type="submit" size="lg" disabled={loading || !question.trim()} className="h-12">
          {loading ? "Thinking…" : "Ask"}
          {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
        </Button>
      </form>

      {showHero && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => run(ex)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {ex}
            </button>
          ))}
        </div>
      )}

      {submitted && !showHero && (
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground">{submitted}</span>
        </p>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {response ? `Answer ready with ${response.citations.length} sources.` : loading ? "Searching the graph." : ""}
      </div>

      {(response || loading || streamSteps.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-5">
            {response ? (
              <AnswerPanel response={response} onAsk={run} />
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
                <div className="h-5 w-40 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                <div className="h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              </div>
            )}

            {response && response.steps.length > 0 && (
              <section className="rounded-lg border border-border bg-card p-4">
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  The path this came from
                </h2>
                <PathStepper steps={response.steps} />
              </section>
            )}

            <AgentTrace steps={streamSteps} active={loading} />
          </div>

          <div className="flex flex-col gap-4 lg:col-span-7">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Evidence graph
              </h2>
              <Legend />
            </div>
            <GraphView
              subgraph={graph}
              pathEdgeIds={pathEdgeIds}
              selectedId={selected?.id ?? null}
              onSelectNode={setSelected}
            />
            <SourcePanel node={selected} subgraph={graph} onSelect={setSelected} />
          </div>
        </div>
      )}

      {showHero && (
        <div className="mt-2 flex flex-col gap-3 border-t border-border pt-6">
          <h2 className="text-sm font-medium text-foreground">How it works</h2>
          <div className={cn("grid gap-4 sm:grid-cols-3")}>
            {[
              {
                t: "Grounded, not guessed",
                d: "Every answer is a walk over the decision graph. No path, no answer.",
              },
              {
                t: "Staleness propagates",
                d: "When a decision is superseded, everything downstream is marked stale with a reason.",
              },
              {
                t: "Risks surface",
                d: "Bus factor and offboarding impact are computed from who actually touched what.",
              },
            ].map((x) => (
              <div key={x.t} className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-medium text-foreground">{x.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
