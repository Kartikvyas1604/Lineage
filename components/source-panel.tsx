"use client";

import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import type { GraphNode, Subgraph } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ExternalLink, MousePointerClick } from "lucide-react";
import { useState } from "react";

function cypherFor(node: GraphNode): string {
  switch (node.label) {
    case "Decision":
      return `MATCH (d:Decision {id: '${node.id}'})\nOPTIONAL MATCH (d)-[r]-(n)\nRETURN d, r, n`;
    case "Person":
      return `MATCH (p:Person {id: '${node.id}'})-[r]-(n)\nRETURN p, r, n\nORDER BY type(r)`;
    case "System":
      return `MATCH (s:System {id: '${node.id}'})<-[r]-(n)\nRETURN s, r, n`;
    default:
      return `MATCH (n {id: '${node.id}'})-[r]-\nRETURN n, r`;
  }
}

export function SourcePanel({
  node,
  subgraph,
  onSelect,
  className,
}: {
  node: GraphNode | null;
  subgraph: Subgraph;
  onSelect: (node: GraphNode) => void;
  className?: string;
}) {
  const [showCypher, setShowCypher] = useState(false);

  if (!node) {
    return (
      <div
        className={cn(
          "flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center",
          className,
        )}
      >
        <MousePointerClick className="h-5 w-5 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Select a node in the graph to see its record, source and the exact Cypher.
        </p>
      </div>
    );
  }

  const neighbours = subgraph.edges
    .filter((e) => e.source === node.id || e.target === node.id)
    .map((e) => {
      const otherId = e.source === node.id ? e.target : e.source;
      const other = subgraph.nodes.find((n) => n.id === otherId);
      return other ? { rel: e.type, node: other, dir: e.source === node.id ? "out" : "in" } : null;
    })
    .filter((x): x is { rel: string; node: GraphNode; dir: "out" | "in" } => Boolean(x));

  return (
    <div className={cn("flex flex-col gap-4 rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge tone="outline">{node.label}</Badge>
          {node.status && <StatusBadge status={node.status} />}
          {node.label === "System" && node.criticality ? (
            <Badge tone="risk" title={`Criticality ${node.criticality} of 5`}>
              criticality {node.criticality}/5
            </Badge>
          ) : null}
        </div>
        <h3 className="text-base font-medium leading-snug">{node.title}</h3>
        <p className="tabular text-xs text-muted-foreground">{node.id}</p>
        {node.stale_reason && (
          <p className="rounded-md border border-stale/30 bg-stale/10 px-2.5 py-1.5 text-xs text-stale">
            {node.stale_reason}
            {node.stale_cause && (
              <>
                {" "}
                — caused by <span className="tabular">{node.stale_cause}</span>
              </>
            )}
          </p>
        )}
      </div>

      {node.source_url && (
        <a
          href={node.source_url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-sm text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open source
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      )}

      <Separator />

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Relationships ({neighbours.length})
        </p>
        <ul className="flex flex-col gap-1">
          {neighbours.map(({ rel, node: other, dir }) => (
            <li key={`${rel}-${other.id}`}>
              <button
                type="button"
                onClick={() => onSelect(other)}
                className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="tabular shrink-0 text-[10px] uppercase text-muted-foreground">
                  {dir === "out" ? "→" : "←"} {rel}
                </span>
                <span className="truncate text-foreground">{other.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowCypher((v) => !v)}
            aria-expanded={showCypher}
            className="rounded text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showCypher ? "Hide Cypher" : "Show Cypher"}
          </button>
          {showCypher && <CopyButton value={cypherFor(node)} label="Copy" />}
        </div>
        {showCypher && (
          <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
            <code className="tabular text-foreground">{cypherFor(node)}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
