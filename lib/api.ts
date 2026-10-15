/**
 * API client for Lineage.
 *
 * Two backends, one interface:
 *   - DEMO  (NEXT_PUBLIC_API_BASE unset): runs the agent's read-only logic
 *     against lib/demo-data.ts so the product is fully usable offline.
 *   - LIVE  (NEXT_PUBLIC_API_BASE set): talks to the FastAPI service defined
 *     in docs/Agent.md. Same function signatures, same return shapes.
 *
 * Nothing in this file (or any component) writes to the demo dataset — the
 * only mutations are the proposal decisions and ingest, which in LIVE mode
 * hit the backend and in DEMO mode return a computed preview.
 */

import {
  activeContributors,
  allNodes,
  busFactorRows,
  decisions,
  demoSubgraph,
  dependentsOf,
  edges,
  nodeById,
  ownersOf,
  people,
  personById,
  proposals as demoProposals,
  stats as demoStats,
  subgraphFor,
  systems,
  systemsTouchedBy,
} from "./demo-data";
import type {
  AskRequest,
  AskResponse,
  AtRiskSystem,
  BusFactorRow,
  Citation,
  Confidence,
  GraphNode,
  IngestReport,
  OffboardingResult,
  PathStep,
  Proposal,
  ProposalDecisionResult,
  Stats,
  Subgraph,
  Successor,
  TraceStep,
  UpdateTask,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
export const isLive = Boolean(API_BASE);

async function live<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path}`);
  return (await res.json()) as T;
}

/* ------------------------------------------------------------------ stats */

export async function getStats(): Promise<Stats> {
  if (isLive) return live<Stats>("/stats");
  return demoStats;
}

/* --------------------------------------------------------------- the agent */

const STOP = new Set([
  "why", "do", "we", "use", "for", "the", "a", "an", "is", "are", "what",
  "who", "how", "does", "and", "of", "to", "in", "on", "our", "us", "with",
  "from", "be", "was", "were", "it", "this", "that", "which", "when", "did",
  "know", "knows", "about", "any", "can", "you", "me", "tell", "going", "on",
  "if", "should", "would", "could", "there", "their",
]);

/** Very small normaliser so questions and graph text meet in the middle. */
const SYNONYMS: Record<string, string> = {
  retention: "retain",
  retained: "retain",
  retains: "retain",
  deleting: "delete",
  removed: "remove",
  moving: "move",
  stored: "store",
  storage: "store",
  stores: "store",
  logs: "log",
  sessions: "session",
  systems: "system",
  people: "person",
};

function norm(w: string): string {
  if (SYNONYMS[w]) return SYNONYMS[w];
  if (w.length > 3 && w.endsWith("s")) return w.slice(0, -1);
  return w;
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(norm);
}

function scoreDecision(question: string, d: (typeof decisions)[number]): number {
  const q = tokens(question);
  const hayWords = tokens(`${d.title} ${d.summary} ${d.rationale ?? ""}`);
  const hay = hayWords.join(" ");
  const haySet = new Set(hayWords);
  let score = 0;
  for (const w of q) {
    if (haySet.has(w)) score += 1;
    // Prefix fallback only for long words, so short tokens can't match inside
    // unrelated words (e.g. "if" inside "config").
    else if (w.length >= 6 && hay.includes(w.slice(0, w.length - 2))) score += 0.4;
  }
  const statusBoost = d.status === "active" ? 1.15 : 1;
  return score * statusBoost;
}

function bfs(startId: string, depth: number): { nodes: Set<string>; edges: typeof edges } {
  const seen = new Set([startId]);
  let frontier = [startId];
  const used: typeof edges = [];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const edge of edges) {
      const a = frontier.includes(edge.source);
      const b = frontier.includes(edge.target);
      if (!a && !b) continue;
      const other = a ? edge.target : edge.source;
      if (!used.find((u) => u.id === edge.id)) used.push(edge);
      if (!seen.has(other)) {
        seen.add(other);
        next.push(other);
      }
    }
    frontier = next;
  }
  return { nodes: seen, edges: used };
}

function subgraphFrom(set: Set<string>, used: typeof edges): Subgraph {
  return {
    nodes: allNodes.filter((n) => set.has(n.id)),
    edges: used.filter((edge) => set.has(edge.source) && set.has(edge.target)),
  };
}

/** The ordered "why → who → where it landed" chain for a decision. */
function whyChain(d: (typeof decisions)[number]): PathStep[] {
  const steps: PathStep[] = [];
  const rels: Array<{ type: string; dir: "out" | "in"; label: string }> = [
    { type: "DISCUSSED_IN", dir: "out", label: "discussed in" },
    { type: "DECIDED", dir: "in", label: "decided by" },
    { type: "DECIDED_IN", dir: "out", label: "written up in" },
    { type: "IMPLEMENTS", dir: "in", label: "implemented by" },
  ];
  for (const { type, dir, label } of rels) {
    const hit = edges.find(
      (edge) =>
        edge.type === type && (dir === "out" ? edge.source === d.id : edge.target === d.id),
    );
    if (!hit) continue;
    const fromId = dir === "out" ? hit.source : hit.target;
    const toId = dir === "out" ? hit.target : hit.source;
    const from = nodeById(fromId);
    const to = nodeById(toId);
    if (!from || !to) continue;
    steps.push({
      from_id: from.id,
      from_title: from.title,
      rel: label,
      to_id: to.id,
      to_title: to.title,
      source_url: to.source_url ?? null,
    });
  }
  return steps;
}

function citationsFor(d: (typeof decisions)[number], set: Set<string>): Citation[] {
  const prefer = ["Thread", "Doc", "PR", "Ticket"];
  return allNodes
    .filter((n) => set.has(n.id) && n.id !== d.id && prefer.includes(n.label))
    .sort((a, b) => prefer.indexOf(a.label) - prefer.indexOf(b.label))
    .slice(0, 6)
    .map((n) => ({
      node_id: n.id,
      label: n.label,
      title: n.title,
      source_url: n.source_url ?? null,
    }));
}

function traceFor(
  d: (typeof decisions)[number],
  dependents: GraphNode[],
  mode: "llm" | "rules",
): TraceStep[] {
  const t = (tool: string, cypher: string, summary: string, ms: number): TraceStep => ({
    tool,
    args: {},
    ok: true,
    duration_ms: ms,
    cypher: [cypher],
    summary,
  });
  return [
    t("search_decisions", "SEARCH_DECISIONS", `Matched ${d.id} and ${Math.max(dependents.length, 1)} neighbours`, 41),
    t("why_decision", "WHY_DECISION", `Traced provenance for ${d.id}`, 33),
    t("impact_of", "IMPACT_OF", `${dependents.length} downstream node${dependents.length === 1 ? "" : "s"}`, 58),
    t("who_knows", "WHO_KNOWS", "Ranked people by direct and adjacent work", 27),
    {
      tool: "synthesize_answer",
      args: { mode },
      ok: true,
      duration_ms: 610,
      cypher: [],
      summary: mode === "llm" ? "Answer grounded in retrieved path" : "Templated answer from path (rules mode)",
    },
  ];
}

function followUpsFor(d: (typeof decisions)[number], dependents: GraphNode[]): string[] {
  const out = [`What breaks if ${d.id} changes?`];
  const owner = ownersOf(d.id)[0];
  if (owner) out.push(`Who else knows why we chose ${d.title.split(" ").slice(0, 3).join(" ")}?`);
  if (dependents.length) out.push(`Which of the ${dependents.length} dependents are still current?`);
  out.push("Show me everything that went stale this month");
  return out.slice(0, 3);
}

interface Relation {
  kind: "supersedes" | "contradicts";
  status: "pending" | "accepted" | "rejected";
  other_id: string;
  other_title: string;
  /** Whether the decision in hand is the older side of the relation. */
  is_old: boolean;
}

/** The supersession/contradiction this decision is part of, if any. */
function relationFor(d: (typeof decisions)[number]): Relation | undefined {
  const p = demoProposals.find(
    (x) =>
      x.status !== "rejected" &&
      (x.new_decision.id === d.id || x.old_decision.id === d.id),
  );
  if (!p) return undefined;
  const isOld = p.old_decision.id === d.id;
  const other = isOld ? p.new_decision : p.old_decision;
  return {
    kind: p.kind,
    status: p.status,
    other_id: other.id,
    other_title: other.title,
    is_old: isOld,
  };
}

function answerFor(
  d: (typeof decisions)[number],
  dependents: GraphNode[],
  relation: Relation | undefined,
): string {
  const decided = d.decided_by
    .map((id) => personById(id)?.name)
    .filter(Boolean)
    .join(" and ");
  const when = new Date(d.decided_at * 1000).toISOString().slice(0, 10);
  const bits: string[] = [];
  bits.push(d.summary);
  if (d.rationale) bits.push(`Why: ${d.rationale}`);
  bits.push(`Decided ${when}${decided ? ` by ${decided}` : ""}.`);

  if (relation?.kind === "supersedes" && relation.is_old) {
    bits.push(
      `This was superseded by ${relation.other_id} (“${relation.other_title}”) — everything downstream of it is now stale.`,
    );
  } else if (relation?.kind === "supersedes" && !relation.is_old) {
    bits.push(`This supersedes ${relation.other_id} (“${relation.other_title}”).`);
  } else if (relation?.kind === "contradicts") {
    bits.push(
      `Heads up: it conflicts with ${relation.other_id} (“${relation.other_title}”) on the same system — there is a ${relation.status} review for that.`,
    );
  }

  if (dependents.length) {
    bits.push(
      `${dependents.length} node${dependents.length === 1 ? "" : "s"} depend on this decision${
        d.status === "superseded" ? " and are now stale" : ""
      }.`,
    );
  }
  return bits.join(" ");
}

/** "Who owns / maintains X?" → the owning team, contributors and governing decisions. */
function ownershipAnswer(question: string): AskResponse | null {
  const lower = question.toLowerCase();
  const wants = /(owns?|leads?|maintains?|responsible|who should i ask|who do i ask|on call|oncall)/.test(
    lower,
  );
  if (!wants) return null;
  const q = tokens(question);
  const system =
    systems.find((s) => lower.includes(s.name.toLowerCase())) ??
    systems.find((s) => q.some((w) => s.name.toLowerCase().split(" ").includes(w)));
  if (!system) return null;

  const teamId = edges.find(
    (e) => e.type === "OWNS" && e.target === system.id && e.source.startsWith("team:"),
  )?.source;
  const team = allNodes.find((n) => n.id === teamId);
  const contributors = edges
    .filter((e) => e.type === "CONTRIBUTED_TO" && e.target === system.id)
    .map((e) => nodeById(e.source))
    .filter((n): n is GraphNode => Boolean(n));
  const governing = edges
    .filter((e) => e.type === "AFFECTS" && e.target === system.id)
    .map((e) => decisions.find((d) => d.id === e.source))
    .filter((d): d is (typeof decisions)[number] => Boolean(d));

  const ids = new Set<string>([
    system.id,
    ...(team ? [team.id] : []),
    ...contributors.map((c) => c.id),
    ...governing.map((d) => d.id),
  ]);

  const names = contributors.map((c) => c.title).join(", ");
  const parts: string[] = [];
  parts.push(team ? `${system.name} is owned by the ${team.title} team.` : `${system.name} has no owning team on file.`);
  if (names) parts.push(`People who've worked on it: ${names}.`);
  if (governing.length) {
    parts.push(`It's governed by ${governing.map((d) => `${d.id} (${d.title})`).join(", ")}.`);
  }
  parts.push(`Criticality ${system.criticality}/5.`);

  return {
    answer: parts.join(" "),
    citations: governing
      .map((d) => nodeById(d.id))
      .filter((n): n is GraphNode => Boolean(n))
      .slice(0, 6)
      .map((n) => ({ node_id: n.id, label: n.label, title: n.title, source_url: n.source_url ?? null })),
    path: subgraphFrom(ids, edges),
    steps: [
      ...(team
        ? [{ from_id: team.id, from_title: team.title, rel: "owns", to_id: system.id, to_title: system.name, source_url: null }]
        : []),
      ...contributors.slice(0, 4).map((c) => ({
        from_id: c.id,
        from_title: c.title,
        rel: "works on",
        to_id: system.id,
        to_title: system.name,
        source_url: null,
      })),
    ],
    trace: [
      { tool: "search_decisions", args: {}, ok: true, duration_ms: 22, cypher: ["SEARCH_DECISIONS"], summary: `Matched system ${system.id}` },
      { tool: "who_knows", args: {}, ok: true, duration_ms: 39, cypher: ["WHO_KNOWS"], summary: `${contributors.length} contributors, 1 owning team` },
    ],
    confidence: contributors.length ? "high" : "low",
    mode: "rules",
    follow_ups: [
      `What breaks if ${system.name} changes?`,
      team ? `What else does ${team.title} own?` : `Who touches ${system.name}?`,
      "What went stale this month?",
    ],
  };
}

/** "What went stale?" → the stale frontier and the decisions that caused it. */
function stalenessAnswer(question: string): AskResponse | null {
  if (!/(stale|outdated|out of date|what changed|gone wrong|drift|rotted)/.test(question.toLowerCase())) {
    return null;
  }
  const stale = allNodes.filter((n) => n.status === "stale");
  if (stale.length === 0) return null;

  const byCause = new Map<string, GraphNode[]>();
  for (const n of stale) {
    const cause = n.stale_cause ?? "unknown";
    const list = byCause.get(cause) ?? [];
    list.push(n);
    byCause.set(cause, list);
  }

  const causeBits: string[] = [];
  const ids = new Set<string>(stale.map((n) => n.id));
  const steps: PathStep[] = [];
  for (const [causeId, nodes] of byCause) {
    const cause = nodeById(causeId);
    ids.add(causeId);
    if (cause) {
      const decision = decisions.find((d) => d.id === causeId);
      const rel = decision ? relationFor(decision) : undefined;
      causeBits.push(
        `${nodes.length} from ${causeId} (“${cause.title}”)${rel?.other_id ? `, superseded by ${rel.other_id}` : ""}`,
      );
      steps.push({
        from_id: causeId,
        from_title: cause.title,
        rel: "left stale",
        to_id: nodes[0].id,
        to_title: nodes[0].title,
        source_url: nodes[0].source_url ?? null,
      });
    }
  }

  const names = stale.slice(0, 5).map((n) => n.title);
  return {
    answer:
      `${stale.length} node${stale.length === 1 ? "" : "s"} in the graph are stale. ` +
      `They trace back to: ${causeBits.join("; ")}. ` +
      `Affected: ${names.join(", ")}${stale.length > names.length ? `, and ${stale.length - names.length} more` : ""}.`,
    citations: stale
      .filter((n) => n.source_url)
      .slice(0, 6)
      .map((n) => ({ node_id: n.id, label: n.label, title: n.title, source_url: n.source_url ?? null })),
    path: subgraphFrom(ids, edges),
    steps,
    trace: [
      { tool: "search_decisions", args: {}, ok: true, duration_ms: 31, cypher: ["SEARCH_DECISIONS"], summary: `Found ${stale.length} stale nodes` },
      { tool: "impact_of", args: {}, ok: true, duration_ms: 47, cypher: ["IMPACT_OF"], summary: `Grouped by ${byCause.size} cause` },
    ],
    confidence: "high",
    mode: "rules",
    follow_ups: [
      "What breaks if we change how sessions are stored?",
      "Who owns the audit log?",
      "Why do we use Redis for sessions?",
    ],
  };
}

function noPathAnswer(question: string): AskResponse {  return {
    answer:
      `I can't ground an answer to “${question}” in the graph — no decision, doc, ticket or thread connects the terms you used. ` +
      `Rather than guess, I'd need one of: a relevant doc ingested, a linked decision, or a thread where it was discussed.`,
    citations: [],
    path: { nodes: [], edges: [] },
    steps: [],
    trace: [
      { tool: "search_decisions", args: {}, ok: true, duration_ms: 28, cypher: ["SEARCH_DECISIONS"], summary: "No match above threshold" },
      { tool: "vector_search", args: {}, ok: true, duration_ms: 55, cypher: ["VECTOR_SEARCH"], summary: "No semantically close nodes" },
    ],
    confidence: "none",
    mode: isLive ? "llm" : "rules",
    follow_ups: ["Why do we use Redis for sessions?", "What depends on the audit log?", "Who owns the payments API?"],
  };
}

export async function ask(req: AskRequest): Promise<AskResponse> {
  if (isLive) {
    return live<AskResponse>("/ask", { method: "POST", body: JSON.stringify(req) });
  }
  const question = req.question.trim();
  if (question.length < 3) return noPathAnswer(question);

  const ownership = ownershipAnswer(question);
  if (ownership) return ownership;

  const staleness = stalenessAnswer(question);
  if (staleness) return staleness;

  const ranked = decisions
    .map((d) => ({ d, score: scoreDecision(question, d) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  if (!top || top.score < 1) {
    // "who ..." fallback over people
    const q = tokens(question);
    const person = people.find((p) => q.some((w) => p.name.toLowerCase().includes(w)));
    if (person && (question.toLowerCase().includes("who") || question.toLowerCase().includes("know"))) {
      const touched = systemsTouchedBy(person.id);
      const owned = allNodes.filter((n) =>
        edges.some((edge) => edge.source === person.id && ["OWNS", "AUTHORED", "DECIDED"].includes(edge.type) && edge.target === n.id),
      );
      const set = new Set([person.id, ...touched.map((s) => s.id), ...owned.map((n) => n.id)]);
      return {
        answer:
          `${person.name} (${person.role})${person.active ? "" : " has left the company"} appears on ${touched.length} system${touched.length === 1 ? "" : "s"} and ${owned.length} document${owned.length === 1 ? "" : "s"} in the graph. ` +
          `${touched.filter((s) => activeContributors(s.id).length <= 1).length} of those systems have no other active contributor.`,
        citations: owned.slice(0, 6).map((n) => ({ node_id: n.id, label: n.label, title: n.title, source_url: n.source_url ?? null })),
        path: subgraphFrom(set, edges),
        steps: owned.slice(0, 4).map((n) => ({ from_id: person.id, from_title: person.name, rel: "owns", to_id: n.id, to_title: n.title, source_url: n.source_url ?? null })),
        trace: [
          { tool: "who_knows", args: { person: person.name }, ok: true, duration_ms: 44, cypher: ["WHO_KNOWS"], summary: `${touched.length} systems, ${owned.length} docs` },
          { tool: "impact_of", args: {}, ok: true, duration_ms: 30, cypher: ["IMPACT_OF"], summary: "Isolated single-contributor systems" },
        ],
        confidence: "medium",
        mode: "rules",
        follow_ups: [`What breaks if ${person.name} leaves?`, "Which systems have a bus factor of one?", "What did they decide?"],
      };
    }
    return noPathAnswer(question);
  }

  const d = top.d;
  const dependents = dependentsOf(d.id);
  const { nodes: set1 } = bfs(d.id, 2);

  const relation = relationFor(d);

  const confidence: Confidence =
    top.score >= 3 && (d.rationale ?? "").length > 0
      ? "high"
      : top.score >= 1.5
        ? "medium"
        : "low";

  return {
    answer: answerFor(d, dependents, relation),
    citations: citationsFor(d, set1),
    path: demoSubgraph(),
    steps: whyChain(d),
    trace: traceFor(d, dependents, "rules"),
    confidence,
    mode: isLive ? "llm" : "rules",
    follow_ups: followUpsFor(d, dependents),
  };
}

/**
 * Streams the agent trace. In LIVE mode this consumes SSE; in DEMO mode it
 * replays the computed trace so the UI timeline behaves identically.
 */
export async function askStream(
  req: AskRequest,
  onStep: (step: TraceStep, index: number) => void,
): Promise<AskResponse> {
  if (isLive) {
    const res = await fetch(`${API_BASE}/ask/stream`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok || !res.body) return ask(req);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let final: AskResponse | null = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const line = chunk.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        const evt = JSON.parse(line.slice(5).trim());
        if (evt.type === "step") onStep(evt.step as TraceStep, evt.index as number);
        if (evt.type === "final") final = evt.response as AskResponse;
      }
    }
    if (final) return final;
  }
  const response = await ask(req);
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  for (let i = 0; i < response.trace.length; i++) {
    onStep(response.trace[i], i);
    if (!reduce) await new Promise((r) => setTimeout(r, 160));
  }
  return response;
}

/* ------------------------------------------------------------- proposals */

export async function listProposals(): Promise<Proposal[]> {
  if (isLive) return live<Proposal[]>("/proposals");
  return demoProposals;
}

export async function decideProposal(
  id: string,
  action: "accept" | "reject",
): Promise<ProposalDecisionResult> {
  if (isLive) {
    return live<ProposalDecisionResult>(`/proposals/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
    });
  }
  const proposal = demoProposals.find((p) => p.id === id);
  if (!proposal) throw new Error(`Unknown proposal ${id}`);
  if (action === "reject") {
    return { proposal_id: id, applied: false, affected: [], tasks: [] };
  }
  const tasks: UpdateTask[] = proposal.affected.map((a) => ({
    node_id: a.id,
    owner_ids: a.owners.map((o) => o.id),
    task_title: `Update ${a.title} after ${proposal.new_decision.id} replaces ${proposal.old_decision.id}`,
    suggested_action:
      a.owners.length === 0
        ? "No owner on file — route to the owning team before this is forgotten."
        : `Assignee should confirm whether “${a.title}” still applies.`,
  }));
  return { proposal_id: id, applied: true, affected: proposal.affected, tasks };
}

/* ------------------------------------------------------------------ ingest */

export async function ingest(text: string, source = "paste"): Promise<IngestReport> {
  if (isLive) {
    return live<IngestReport>("/ingest", {
      method: "POST",
      body: JSON.stringify({ text, source }),
    });
  }
  const decisionish = /(we (decided|chose|agreed)|decision|decided to|adr)/i.test(text);
  const refs = (text.match(/\b[A-Z]{2,5}-\d{1,4}\b/g) ?? []).length;
  return {
    node_id: `doc:PASTE-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    decisions_created: decisionish ? 1 : 0,
    references_created: refs,
    proposals_created: decisionish ? 1 : 0,
    warnings: decisionish
      ? []
      : ["No decision-like statement detected — ingested as a document with references only."],
  };
}

/* -------------------------------------------------------------------- risk */

export async function getBusFactor(): Promise<BusFactorRow[]> {
  if (isLive) return live<BusFactorRow[]>("/risk/bus-factor");
  return busFactorRows();
}

function successorsFor(systemId: string, departingId: string): Successor[] {
  const system = systems.find((s) => s.id === systemId);
  const teamId = edges.find(
    (edge) => edge.type === "OWNS" && edge.target === systemId && edge.source.startsWith("team:"),
  )?.source;
  return people
    .filter((p) => p.active && p.id !== departingId)
    .map((p) => {
      const direct = edges.filter(
        (edge) => edge.source === p.id && edge.target === systemId && edge.type === "CONTRIBUTED_TO",
      ).length;
      const adjacent = edges.filter(
        (edge) =>
          edge.source === p.id &&
          edge.type !== "MEMBER_OF" &&
          edge.target.startsWith("system:") &&
          edge.target !== systemId,
      ).length;
      const sameTeam =
        teamId &&
        edges.some((edge) => edge.source === p.id && edge.target === teamId && edge.type === "MEMBER_OF")
          ? 1
          : 0;
      const via: string[] = [];
      if (direct) via.push("worked on this system");
      if (sameTeam) via.push("on the owning team");
      if (adjacent) via.push(`${adjacent} adjacent systems`);
      return {
        id: p.id,
        name: p.name,
        score: Number((direct * 2 + adjacent * 0.3 + sameTeam * 1.5).toFixed(2)),
        components: { direct, adjacent, same_team: sameTeam },
        via: via.length ? via : system ? ["in the company graph"] : [],
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export async function offboard(personId: string): Promise<OffboardingResult> {
  if (isLive) return live<OffboardingResult>(`/risk/offboard/${encodeURIComponent(personId)}`);
  const person = personById(personId);
  if (!person) throw new Error(`Unknown person ${personId}`);
  const touched = systemsTouchedBy(personId);
  const at_risk: AtRiskSystem[] = touched
    .filter((s) => activeContributors(s.id).length <= 1)
    .map((s) => ({
      system_id: s.id,
      system: s.name,
      criticality: s.criticality,
      weight: s.criticality,
      remaining: activeContributors(s.id),
      successors: successorsFor(s.id, personId),
    }))
    .sort((a, b) => b.criticality - a.criticality);
  const owned = allNodes.filter((n) =>
    edges.some((edge) => edge.source === personId && ["OWNS", "AUTHORED"].includes(edge.type) && edge.target === n.id),
  );
  return { person, at_risk_systems: at_risk, owned_nodes: owned };
}

/* ------------------------------------------------------------------- misc */

export async function listPeople() {
  if (isLive) return live<typeof people>("/people");
  return people;
}

export { subgraphFor };
