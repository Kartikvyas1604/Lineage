"use client";

import { cn } from "@/lib/utils";
import type { GraphEdge, GraphNode, Subgraph } from "@/lib/types";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Core } from "cytoscape";

type Cy = Core;

const LABEL_TEXT: Record<string, string> = {
  Decision: "Decision",
  System: "System",
  Person: "Person",
  Team: "Team",
  Doc: "Doc",
  Ticket: "Ticket",
  PR: "PR",
  Thread: "Thread",
};

function readVars() {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    card: v("--card"),
    fg: v("--foreground"),
    primary: v("--primary"),
    border: v("--border"),
    active: v("--active"),
    stale: v("--stale"),
    superseded: v("--superseded"),
    proposal: v("--proposal"),
    risk: v("--risk"),
  };
}

export interface GraphViewProps {
  subgraph: Subgraph;
  /** Edge ids in traversal order — animated one hop at a time. */
  pathEdgeIds?: string[];
  selectedId?: string | null;
  onSelectNode?: (node: GraphNode | null) => void;
  className?: string;
  heightClass?: string;
}

export function GraphView({
  subgraph,
  pathEdgeIds = [],
  selectedId,
  onSelectNode,
  className,
  heightClass = "h-[380px] sm:h-[460px]",
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Cy | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const elements = useMemo(() => {
    const nodeEls = subgraph.nodes.map((n: GraphNode) => ({
      data: {
        id: n.id,
        label: n.title.length > 34 ? `${n.title.slice(0, 32)}…` : n.title,
        full: n.title,
        kind: n.label,
        status: n.status ?? "active",
        criticality: n.criticality ?? 0,
      },
    }));
    const edgeEls = subgraph.edges.map((e: GraphEdge) => ({
      data: { id: e.id, source: e.source, target: e.target, type: e.type },
    }));
    return [...nodeEls, ...edgeEls];
  }, [subgraph]);

  const pathKey = pathEdgeIds.join(",");

  // Build / rebuild the graph
  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;

    (async () => {
      const [cytoscapeMod, fcoseMod] = await Promise.all([
        import("cytoscape"),
        import("cytoscape-fcose"),
      ]);
      const cytoscape = cytoscapeMod.default;
      const fcose = fcoseMod.default;
      if (cancelled) return;
      // register layout once per module instance
      const g = globalThis as unknown as { __lineageFcose?: boolean };
      if (!g.__lineageFcose) {
        cytoscape.use(fcose);
        g.__lineageFcose = true;
      }

      const c = readVars();
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      const cy: Cy = cytoscape({
        container: el,
        elements,
        wheelSensitivity: 0.2,
        minZoom: 0.3,
        maxZoom: 2.5,
        style: [
          {
            selector: "node",
            style: {
              "background-color": c.card,
              "border-width": 1.5,
              "border-color": c.border,
              color: c.fg,
              label: "data(label)",
              "font-size": 8,
              "font-family": "var(--font-inter), system-ui",
              "text-valign": "bottom",
              "text-margin-y": 4,
              "text-max-width": "96px",
              "text-wrap": "wrap",
              width: 22,
              height: 22,
            },
          },
          {
            selector: 'node[kind="Decision"]',
            style: { shape: "round-rectangle", width: 46, height: 26, "font-size": 9 },
          },
          { selector: 'node[kind="System"]', style: { shape: "diamond", width: 30, height: 30 } },
          { selector: 'node[kind="Person"]', style: { shape: "ellipse", width: 24, height: 24 } },
          { selector: 'node[kind="Team"]', style: { shape: "hexagon", width: 26, height: 26 } },
          { selector: 'node[kind="Doc"]', style: { shape: "rectangle", width: 30, height: 20 } },
          { selector: 'node[kind="Ticket"]', style: { shape: "round-rectangle", width: 28, height: 18 } },
          { selector: 'node[kind="PR"]', style: { shape: "tag", width: 30, height: 20 } },
          { selector: 'node[kind="Thread"]', style: { shape: "ellipse", width: 26, height: 20 } },
          { selector: 'node[status="stale"]', style: { "border-color": c.stale, "border-width": 2.5 } },
          { selector: 'node[status="superseded"]', style: { "border-color": c.superseded, "border-style": "dashed", opacity: 0.65 } },
          { selector: 'node[status="active"]', style: { "border-color": c.active } },
          {
            selector: "edge",
            style: {
              width: 1.2,
              "line-color": c.border,
              "target-arrow-color": c.border,
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              "arrow-scale": 0.7,
              opacity: 0.7,
            },
          },
          { selector: ".dim", style: { opacity: 0.18 } },
          {
            selector: ".traversed",
            style: { "line-color": c.primary, "target-arrow-color": c.primary, width: 2.2, opacity: 1 },
          },
          {
            selector: "node.traversed",
            style: { "border-color": c.primary, "border-width": 3 },
          },
          {
            selector: "node:selected",
            style: { "border-color": c.primary, "border-width": 3, "overlay-opacity": 0 },
          },
        ],
        layout: reduced
          ? { name: "grid", padding: 20, avoidOverlap: true, avoidOverlapPadding: 8 }
          : {
              name: "fcose",
              quality: "default",
              animate: true,
              animationDuration: 500,
              randomize: true,
              nodeSeparation: 90,
              idealEdgeLength: 70,
              padding: 24,
            } as unknown as cytoscape.LayoutOptions,
      });

      cy.on("tap", "node", (evt) => {
        const id = evt.target.id();
        const node = subgraph.nodes.find((n) => n.id === id) ?? null;
        onSelectNode?.(node);
      });
      cy.on("tap", (evt) => {
        if (evt.target === cy) onSelectNode?.(null);
      });

      cyRef.current = cy;
      // Size after first paint so the container has dimensions.
      requestAnimationFrame(() => cy.resize());
    })();

    return () => {
      cancelled = true;
      cyRef.current?.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements]);

  // Re-theme without rebuilding when the color scheme flips.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const cy = cyRef.current;
      if (!cy) return;
      const c = readVars();
      cy.style()
        .selector("node")
        .style({ "border-color": c.border, color: c.fg, "background-color": c.card })
        .selector('node[status="stale"]')
        .style({ "border-color": c.stale })
        .selector('node[status="superseded"]')
        .style({ "border-color": c.superseded })
        .selector('node[status="active"]')
        .style({ "border-color": c.active })
        .selector("edge")
        .style({ "line-color": c.border, "target-arrow-color": c.border })
        .selector(".traversed")
        .style({ "line-color": c.primary, "target-arrow-color": c.primary })
        .update();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Animate the path hop by hop.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    cy.elements().removeClass("traversed dim");
    if (!pathEdgeIds.length) return;

    cy.edges().addClass("dim");
    cy.nodes().addClass("dim");
    const timers: ReturnType<typeof setTimeout>[] = [];
    const reveal = (i: number) => {
      const edge = cy.getElementById(pathEdgeIds[i]);
      if (edge.empty()) return;
      edge.removeClass("dim").addClass("traversed");
      edge.source().removeClass("dim").addClass("traversed");
      edge.target().removeClass("dim").addClass("traversed");
    };
    if (reduced) {
      pathEdgeIds.forEach((_, i) => reveal(i));
    } else {
      pathEdgeIds.forEach((_, i) => timers.push(setTimeout(() => reveal(i), i * 220)));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey]);

  const fit = () => cyRef.current?.fit(undefined, 32);
  const zoom = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };
  const relayout = () => cyRef.current?.layout({ name: "fcose", animate: true, randomize: true } as never).run();

  return (
    <div className={cn("relative", className)}>
      <div
        ref={containerRef}
        role="img"
        aria-label={`Knowledge graph: ${subgraph.nodes.length} nodes, ${subgraph.edges.length} relationships.`}
        className={cn("w-full rounded-lg border border-border bg-card", heightClass)}
      />
      <div className="absolute bottom-3 left-3 flex items-center gap-0.5 rounded-md border border-border bg-popover/90 p-0.5 backdrop-blur">
        <button
          type="button"
          onClick={() => zoom(1.25)}
          aria-label="Zoom in"
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => zoom(0.8)}
          aria-label="Zoom out"
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={fit}
          aria-label="Fit to view"
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Maximize2 className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={relayout}
          className="inline-flex h-9 items-center rounded-sm px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Re-layout
        </button>
      </div>

      <div className="absolute right-3 top-3">
        <button
          type="button"
          onClick={() => setListOpen((v) => !v)}
          aria-expanded={listOpen}
          className="inline-flex h-9 items-center rounded-md border border-border bg-popover/90 px-2.5 text-xs font-medium text-muted-foreground backdrop-blur hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {listOpen ? "Hide list" : "List view"}
        </button>
      </div>

      {listOpen && (
        <div className="absolute right-3 top-14 z-10 max-h-[60%] w-72 overflow-auto rounded-md border border-border bg-popover p-2 shadow-lg">
          <p className="px-1 pb-1 text-xs text-muted-foreground">
            Keyboard-accessible node list
          </p>
          <ul className="flex flex-col">
            {subgraph.nodes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onSelectNode?.(n)}
                  aria-current={selectedId === n.id ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedId === n.id && "bg-accent",
                  )}
                >
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    {LABEL_TEXT[n.label] ?? n.label}
                  </span>
                  <span className="truncate">{n.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
