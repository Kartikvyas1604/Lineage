/**
 * Wire types for the Lineage frontend.
 *
 * These mirror the backend contracts in docs/Agent.md §5 (graph model) and
 * §7.4 (AskResponse). The frontend never invents fields — if the backend
 * changes, this file changes first and the compiler finds the rest.
 */

export type NodeLabel =
  | "Person"
  | "Team"
  | "System"
  | "Decision"
  | "Doc"
  | "Ticket"
  | "PR"
  | "Thread"
  | "Proposal";

export type KnowledgeStatus = "active" | "stale" | "superseded" | "archived";

export type Confidence = "high" | "medium" | "low" | "none";

export type AgentMode = "llm" | "rules";

/** A single node in the evidence subgraph. */
export interface GraphNode {
  id: string;
  label: NodeLabel;
  title: string;
  status?: KnowledgeStatus;
  kind?: string;
  source_url?: string | null;
  /** Systems only (1–5). Drives bus-factor ordering. */
  criticality?: number;
  /** Reason a node went stale (set by staleness propagation). */
  stale_reason?: string | null;
  stale_cause?: string | null;
}

/** A single edge in the evidence subgraph. */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  /** Position in a chain — used to animate the path in order. */
  order?: number;
}

export interface Subgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Citation {
  node_id: string;
  label: string;
  title: string;
  source_url?: string | null;
}

/** One human-readable hop: "Decision D-001 —DISCUSSED_IN→ Thread …". */
export interface PathStep {
  from_id: string;
  from_title: string;
  rel: string;
  to_id: string;
  to_title: string;
  source_url?: string | null;
}

/** One tool call in the agent trace. */
export interface TraceStep {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  duration_ms: number;
  /** Names of the Cypher constants used — surfaced by "Show Cypher". */
  cypher: string[];
  summary: string;
}

export interface AskRequest {
  question: string;
  tenant?: string;
  asker_id?: string | null;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  path: Subgraph;
  steps: PathStep[];
  trace: TraceStep[];
  confidence: Confidence;
  mode: AgentMode;
  follow_ups: string[];
}

export interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  left_at?: number | null;
}

export interface Proposal {
  id: string;
  kind: "supersedes" | "contradicts";
  status: "pending" | "accepted" | "rejected";
  confidence: number;
  reason: string;
  evidence_quote: string;
  created_at: number;
  resolved_at?: number | null;
  new_decision: GraphNode;
  old_decision: GraphNode;
  /** Blast radius if accepted (read-only preview). */
  impact: Subgraph;
  affected: AffectedNode[];
}

export interface AffectedNode {
  id: string;
  label: NodeLabel;
  title: string;
  status: KnowledgeStatus;
  hops: number;
  owners: Person[];
}

export interface UpdateTask {
  node_id: string;
  owner_ids: string[];
  task_title: string;
  suggested_action: string;
}

export interface ProposalDecisionResult {
  proposal_id: string;
  applied: boolean;
  affected: AffectedNode[];
  tasks: UpdateTask[];
}

export interface BusFactorRow {
  system_id: string;
  system: string;
  criticality: number;
  person_id: string;
  person: string;
  total: number;
}

export interface Successor {
  id: string;
  name: string;
  score: number;
  components: {
    direct: number;
    adjacent: number;
    same_team: number;
  };
  via: string[];
}

export interface AtRiskSystem {
  system_id: string;
  system: string;
  criticality: number;
  weight: number;
  remaining: Person[];
  successors: Successor[];
}

export interface OffboardingResult {
  person: Person;
  at_risk_systems: AtRiskSystem[];
  owned_nodes: GraphNode[];
}

export interface Stats {
  counts: Record<string, number>;
  stale: number;
  pending_proposals: number;
}

export interface IngestReport {
  node_id: string;
  decisions_created: number;
  references_created: number;
  proposals_created: number;
  warnings: string[];
}
