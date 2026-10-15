/**
 * Synthetic demo dataset — "Northstar Pay" (fictional payments company).
 *
 * This mirrors scripts/generate_synthetic.py from docs/Agent.md §9 closely
 * enough that the UI behaves exactly as it will against the real backend:
 * the same node ids, labels, relationship types and the same planted
 * scenarios (S1–S10). It exists so the frontend is launchable before the
 * FastAPI service lands; lib/api.ts switches to the real API via
 * NEXT_PUBLIC_API_BASE.
 *
 * All data is synthetic. No real people, companies or documents.
 */

import type {
  AffectedNode,
  BusFactorRow,
  GraphEdge,
  GraphNode,
  Person,
  Proposal,
  Stats,
  Subgraph,
} from "./types";

export const NOW = 1791504000; // 2026-10-14T00:00:00Z, frozen demo "now"
const DAY = 86400;

const t = (iso: string) => Math.floor(new Date(`${iso}T00:00:00Z`).getTime() / 1000);

/* ------------------------------------------------------------------ people */

export const people: Person[] = [
  { id: "person:priya-nair", name: "Priya Nair", email: "priya@northstar.pay", role: "Staff Engineer, Platform", active: false, left_at: t("2026-09-30") },
  { id: "person:marcus-lee", name: "Marcus Lee", email: "marcus@northstar.pay", role: "Director of Engineering", active: true },
  { id: "person:sofia-almeida", name: "Sofia Almeida", email: "sofia@northstar.pay", role: "Senior Engineer, Platform", active: true },
  { id: "person:dan-okafor", name: "Dan Okafor", email: "dan@northstar.pay", role: "Site Reliability Engineer", active: true },
  { id: "person:yuki-tanaka", name: "Yuki Tanaka", email: "yuki@northstar.pay", role: "Engineer, Payments", active: true },
  { id: "person:ana-rojas", name: "Ana Rojas", email: "ana@northstar.pay", role: "Compliance Lead", active: true },
  { id: "person:ben-carter", name: "Ben Carter", email: "ben@northstar.pay", role: "Engineer, Data", active: true },
  { id: "person:elena-petrova", name: "Elena Petrova", email: "elena@northstar.pay", role: "Engineering Manager, Platform", active: true },
  { id: "person:jordan-wu", name: "Jordan Wu", email: "jordan@northstar.pay", role: "Engineer (joined 2026-09)", active: true },
];

export const teams = [
  { id: "team:platform", name: "Platform" },
  { id: "team:payments", name: "Payments" },
  { id: "team:data", name: "Data" },
  { id: "team:compliance", name: "Compliance" },
  { id: "team:sre", name: "SRE" },
];

export const systems = [
  { id: "system:session-store", name: "Session Store", criticality: 5, description: "Stores authenticated user sessions for web and mobile." },
  { id: "system:auth-service", name: "Auth Service", criticality: 5, description: "Issues and validates tokens and sessions." },
  { id: "system:payments-api", name: "Payments API", criticality: 5, description: "Core payment authorisation and capture." },
  { id: "system:ledger", name: "Ledger", criticality: 5, description: "Double-entry accounting source of truth." },
  { id: "system:rate-limiter", name: "Rate Limiter", criticality: 4, description: "Per-key request throttling at the edge." },
  { id: "system:fx-rates-sync", name: "FX Rates Sync", criticality: 3, description: "Pulls FX rates every 5 minutes." },
  { id: "system:notification-service", name: "Notification Service", criticality: 3, description: "Email, push and webhook delivery." },
  { id: "system:search-service", name: "Search Service", criticality: 2, description: "Merchant and transaction search." },
  { id: "system:data-warehouse", name: "Data Warehouse", criticality: 4, description: "Analytics and reporting." },
  { id: "system:feature-flags", name: "Feature Flags", criticality: 3, description: "Runtime flag evaluation." },
  { id: "system:kafka-bus", name: "Kafka Bus", criticality: 5, description: "Event backbone between services." },
  { id: "system:audit-logging", name: "Audit Logging", criticality: 5, description: "Immutable audit trail for compliance." },
];

/* --------------------------------------------------------------- decisions */

interface DemoDecision {
  id: string;
  title: string;
  summary: string;
  rationale?: string;
  status: "active" | "stale" | "superseded" | "archived";
  decided_at: number;
  decided_by: string[];
  systems: string[];
  pagerank: number;
}

export const decisions: DemoDecision[] = [
  {
    id: "decision:D-001",
    title: "Use Redis for session storage",
    summary: "Sessions are stored in Redis with a 30-day sliding TTL. Auth Service is the only writer.",
    rationale: "Sub-millisecond reads at p99 during checkout spikes, plus native TTL expiry. Postgres row-level sessions added 40ms to authenticated requests under load testing.",
    status: "superseded",
    decided_at: t("2024-03-12"),
    decided_by: ["person:priya-nair", "person:marcus-lee"],
    systems: ["system:session-store", "system:auth-service"],
    pagerank: 0.61,
  },
  {
    id: "decision:D-031",
    title: "Move sessions from Redis to Postgres",
    summary: "Session state moves to a dedicated Postgres table with Postgres-backed expiry. Redis is retired for sessions once migration completes.",
    rationale: "One stateful dependency instead of two, and sessions survive cache eviction. Redis remains for rate limiting only.",
    status: "active",
    decided_at: t("2026-10-06"),
    decided_by: ["person:sofia-almeida", "person:elena-petrova"],
    systems: ["system:session-store", "system:auth-service"],
    pagerank: 0.18,
  },
  {
    id: "decision:D-008",
    title: "Use Redis for caching FX rates",
    summary: "FX rate lookups are cached in Redis for 60 seconds.",
    rationale: "Upstream provider costs per call and has a 5-minute resolution anyway.",
    status: "active",
    decided_at: t("2025-01-20"),
    decided_by: ["person:ben-carter"],
    systems: ["system:fx-rates-sync"],
    pagerank: 0.12,
  },
  {
    id: "decision:D-014",
    title: "Retain audit logs for 7 years",
    summary: "All audit records are retained for 7 years to satisfy financial record-keeping rules.",
    rationale: "Regulatory requirement for payment processors in our operating regions.",
    status: "active",
    decided_at: t("2024-06-02"),
    decided_by: ["person:ana-rojas"],
    systems: ["system:audit-logging"],
    pagerank: 0.44,
  },
  {
    id: "decision:D-021",
    title: "Retain audit logs for 1 year",
    summary: "Audit logs are pruned after 1 year to control storage cost.",
    rationale: "Cost review showed audit storage growing 4TB/year.",
    status: "active",
    decided_at: t("2025-11-15"),
    decided_by: ["person:ben-carter"],
    systems: ["system:audit-logging", "system:data-warehouse"],
    pagerank: 0.31,
  },
  {
    id: "decision:D-004",
    title: "Payments use idempotency keys",
    summary: "Every payment mutation requires a client-supplied idempotency key, stored for 24 hours.",
    rationale: "After the 2023 double-charge incident, we require idempotency on all money-moving endpoints.",
    status: "active",
    decided_at: t("2023-08-19"),
    decided_by: ["person:yuki-tanaka", "person:marcus-lee"],
    systems: ["system:payments-api", "system:ledger"],
    pagerank: 0.72,
  },
  {
    id: "decision:D-002",
    title: "Rate limits enforced at the edge",
    summary: "Per-API-key rate limiting happens in the gateway, not in each service.",
    rationale: "Central enforcement means one config to change and no per-service drift.",
    status: "active",
    decided_at: t("2023-05-30"),
    decided_by: ["person:priya-nair"],
    systems: ["system:rate-limiter"],
    pagerank: 0.28,
  },
  {
    id: "decision:D-017",
    title: "Kafka is the only service-to-service event bus",
    summary: "Services publish domain events to Kafka; no direct service-to-service HTTP for async work.",
    rationale: "Decouples deploys and gives one place to observe event flow.",
    status: "active",
    decided_at: t("2024-10-08"),
    decided_by: ["person:dan-okafor", "person:marcus-lee"],
    systems: ["system:kafka-bus"],
    pagerank: 0.35,
  },
  {
    id: "decision:D-009",
    title: "Feature flags evaluated server-side",
    summary: "Flag evaluation happens in the service, never in the client bundle.",
    rationale: "Keeps flag logic out of shipped assets and avoids leaking experiment names.",
    status: "active",
    decided_at: t("2025-02-11"),
    decided_by: ["person:sofia-almeida"],
    systems: ["system:feature-flags"],
    pagerank: 0.09,
  },
];

/* -------------------------------------------------------- knowledge nodes  */

export const docs: GraphNode[] = [
  { id: "doc:ADR-014", label: "Doc", kind: "adr", title: "ADR-014: Redis for session storage", status: "stale", source_url: "https://docs.northstar.pay/adr/014", stale_reason: "Depends on superseded decision decision:D-001", stale_cause: "decision:D-001" },
  { id: "doc:ADR-031", label: "Doc", kind: "adr", title: "ADR-031: Postgres session store", status: "active", source_url: "https://docs.northstar.pay/adr/031" },
  { id: "doc:ADR-004", label: "Doc", kind: "adr", title: "ADR-004: Idempotency keys for payments", status: "active", source_url: "https://docs.northstar.pay/adr/004" },
  { id: "doc:ADR-017", label: "Doc", kind: "adr", title: "ADR-017: Kafka as the event bus", status: "active", source_url: "https://docs.northstar.pay/adr/017" },
  { id: "doc:RB-007", label: "Doc", kind: "runbook", title: "RB-007: Session store failover", status: "stale", source_url: "https://docs.northstar.pay/runbooks/007", stale_reason: "Depends on superseded decision decision:D-001", stale_cause: "decision:D-001" },
  { id: "doc:RB-012", label: "Doc", kind: "runbook", title: "RB-012: Restoring session data from backup", status: "stale", source_url: "https://docs.northstar.pay/runbooks/012", stale_reason: "Depends on superseded decision decision:D-001", stale_cause: "decision:D-001" },
  { id: "doc:RB-003", label: "Doc", kind: "runbook", title: "RB-003: Kafka consumer lag triage", status: "active", source_url: "https://docs.northstar.pay/runbooks/003" },
  { id: "doc:ONB-002", label: "Doc", kind: "onboarding", title: "Onboarding: how auth works here", status: "stale", source_url: "https://docs.northstar.pay/onboarding/auth", stale_reason: "Depends on superseded decision decision:D-001", stale_cause: "decision:D-001" },
  { id: "doc:PM-006", label: "Doc", kind: "postmortem", title: "PM-006: 2023 double-charge postmortem", status: "active", source_url: "https://docs.northstar.pay/postmortems/006" },
  { id: "doc:RB-021", label: "Doc", kind: "runbook", title: "RB-021: Rotating FX provider credentials", status: "active", source_url: "https://docs.northstar.pay/runbooks/021" },
];

export const tickets: GraphNode[] = [
  { id: "ticket:PAY-231", label: "Ticket", kind: "done", title: "PAY-231: Roll out Redis session store", status: "active" },
  { id: "ticket:PAY-402", label: "Ticket", kind: "stale", title: "PAY-402: Increase session TTL to 45 days", status: "stale", stale_reason: "Depends on superseded decision decision:D-001", stale_cause: "decision:D-001" },
  { id: "ticket:PLAT-118", label: "Ticket", kind: "open", title: "PLAT-118: Session TTL alerting on Redis", status: "stale", stale_reason: "Depends on superseded decision decision:D-001", stale_cause: "decision:D-001" },
  { id: "ticket:PLAT-140", label: "Ticket", kind: "in_progress", title: "PLAT-140: Backfill sessions into Postgres", status: "active" },
  { id: "ticket:PLAT-119", label: "Ticket", kind: "open", title: "PLAT-119: Deprecate Redis session client", status: "stale", stale_reason: "Depends on superseded decision decision:D-001", stale_cause: "decision:D-001" },
  { id: "ticket:PAY-088", label: "Ticket", kind: "done", title: "PAY-088: Add idempotency key validation", status: "active" },
  { id: "ticket:SRE-055", label: "Ticket", kind: "open", title: "SRE-055: Kafka consumer lag dashboard", status: "active" },
];

export const prs: GraphNode[] = [
  { id: "pr:payments-api#88", label: "PR", title: "payments-api#88: redis session backing store", status: "active", source_url: "https://github.com/northstar/payments-api/pull/88" },
  { id: "pr:payments-api#51", label: "PR", title: "payments-api#51: idempotency key middleware", status: "active", source_url: "https://github.com/northstar/payments-api/pull/51" },
  { id: "pr:auth-service#203", label: "PR", title: "auth-service#203: remove Redis session reads", status: "active", source_url: "https://github.com/northstar/auth-service/pull/203" },
  { id: "pr:payments-api#96", label: "PR", title: "payments-api#96: session migration hooks", status: "stale", stale_reason: "Depends on superseded decision decision:D-001", stale_cause: "decision:D-001", source_url: "https://github.com/northstar/payments-api/pull/96" },
];

export const threads: GraphNode[] = [
  { id: "thread:eng-platform-1710000000", label: "Thread", title: "#eng-platform — Redis vs Postgres for sessions", status: "active", source_url: "https://slack.northstar.pay/archives/eng-platform/p1710000000000" },
  { id: "thread:eng-platform-1759700000", label: "Thread", title: "#eng-platform — moving sessions to Postgres", status: "active", source_url: "https://slack.northstar.pay/archives/eng-platform/p1759700000000" },
  { id: "thread:eng-sre-1741000000", label: "Thread", title: "#eng-sre — Kafka consumer lag spike", status: "active", source_url: "https://slack.northstar.pay/archives/eng-sre/p1741000000000" },
  { id: "thread:eng-compliance-1730000000", label: "Thread", title: "#eng-compliance — audit retention debate", status: "active", source_url: "https://slack.northstar.pay/archives/eng-compliance/p1730000000000" },
];

export const allNodes: GraphNode[] = [
  ...decisions.map((d) => ({
    id: d.id,
    label: "Decision" as const,
    title: d.title,
    status: d.status,
    kind: "decision",
  })),
  ...docs,
  ...tickets,
  ...prs,
  ...threads,
  ...systems.map((s) => ({ id: s.id, label: "System" as const, title: s.name, criticality: s.criticality })),
  ...people.map((p) => ({ id: p.id, label: "Person" as const, title: p.name })),
  ...teams.map((tm) => ({ id: tm.id, label: "Team" as const, title: tm.name })),
];

/* ------------------------------------------------------------------ edges  */

const e = (source: string, target: string, type: string, order?: number): GraphEdge => ({
  id: `${source}|${type}|${target}`,
  source,
  target,
  type,
  order,
});

export const edges: GraphEdge[] = [
  // S1 — the headline why-chain for D-001
  e("decision:D-001", "thread:eng-platform-1710000000", "DISCUSSED_IN", 1),
  e("person:priya-nair", "decision:D-001", "DECIDED", 2),
  e("person:marcus-lee", "decision:D-001", "DECIDED", 3),
  e("decision:D-001", "doc:ADR-014", "DECIDED_IN", 4),
  e("ticket:PAY-231", "decision:D-001", "IMPLEMENTS", 5),
  e("pr:payments-api#88", "decision:D-001", "IMPLEMENTS", 6),
  e("decision:D-001", "system:session-store", "AFFECTS"),
  e("decision:D-001", "system:auth-service", "AFFECTS"),
  e("person:priya-nair", "system:session-store", "CONTRIBUTED_TO"),
  e("person:marcus-lee", "doc:ADR-014", "AUTHORED"),

  // S2 — the 7 nodes that depend on D-001 (blast radius)
  e("doc:RB-007", "decision:D-001", "DEPENDS_ON"),
  e("doc:RB-012", "decision:D-001", "DEPENDS_ON"),
  e("doc:ONB-002", "decision:D-001", "DEPENDS_ON"),
  e("ticket:PAY-402", "decision:D-001", "DEPENDS_ON"),
  e("ticket:PLAT-118", "decision:D-001", "DEPENDS_ON"),
  e("ticket:PLAT-119", "decision:D-001", "DEPENDS_ON"),
  e("pr:payments-api#96", "decision:D-001", "DEPENDS_ON"),
  e("doc:ADR-014", "decision:D-001", "REFERENCES"),

  // New decision + its own provenance
  e("decision:D-031", "thread:eng-platform-1759700000", "DISCUSSED_IN", 1),
  e("decision:D-031", "doc:ADR-031", "DECIDED_IN", 2),
  e("person:sofia-almeida", "decision:D-031", "DECIDED"),
  e("person:elena-petrova", "decision:D-031", "DECIDED"),
  e("decision:D-031", "system:session-store", "AFFECTS"),
  e("ticket:PLAT-140", "decision:D-031", "IMPLEMENTS"),
  e("pr:auth-service#203", "decision:D-031", "IMPLEMENTS"),

  // S4 — the live contradiction (7yr vs 1yr audit retention)
  e("decision:D-014", "system:audit-logging", "AFFECTS"),
  e("decision:D-021", "system:audit-logging", "AFFECTS"),
  e("decision:D-021", "system:data-warehouse", "AFFECTS"),
  e("person:ana-rojas", "decision:D-014", "DECIDED"),
  e("person:ben-carter", "decision:D-021", "DECIDED"),
  e("decision:D-014", "thread:eng-compliance-1730000000", "DISCUSSED_IN"),

  // S6 — deep chain: idempotency keys (Decision -> Postmortem -> Ticket -> PR)
  e("person:yuki-tanaka", "decision:D-004", "DECIDED"),
  e("person:marcus-lee", "decision:D-004", "DECIDED"),
  e("decision:D-004", "doc:ADR-004", "DECIDED_IN"),
  e("decision:D-004", "system:payments-api", "AFFECTS"),
  e("decision:D-004", "system:ledger", "AFFECTS"),
  e("doc:PM-006", "decision:D-004", "REFERENCES"),
  e("ticket:PAY-088", "decision:D-004", "IMPLEMENTS"),
  e("pr:payments-api#51", "decision:D-004", "IMPLEMENTS"),
  e("person:yuki-tanaka", "doc:PM-006", "AUTHORED"),

  // Other live decisions
  e("person:priya-nair", "decision:D-002", "DECIDED"),
  e("decision:D-002", "system:rate-limiter", "AFFECTS"),
  e("person:dan-okafor", "decision:D-017", "DECIDED"),
  e("decision:D-017", "system:kafka-bus", "AFFECTS"),
  e("person:sofia-almeida", "decision:D-009", "DECIDED"),
  e("decision:D-009", "system:feature-flags", "AFFECTS"),
  e("doc:RB-003", "system:kafka-bus", "DESCRIBES"),
  e("person:dan-okafor", "doc:RB-003", "AUTHORED"),
  e("thread:eng-sre-1741000000", "system:kafka-bus", "REFERENCES"),
  e("person:ben-carter", "decision:D-008", "DECIDED"),
  e("decision:D-008", "system:fx-rates-sync", "AFFECTS"),
  e("doc:RB-021", "system:fx-rates-sync", "DESCRIBES"),

  // S3 — bus factor: only Priya touched these in 12 months
  e("person:priya-nair", "system:rate-limiter", "CONTRIBUTED_TO"),
  e("person:priya-nair", "system:fx-rates-sync", "CONTRIBUTED_TO"),

  // S5 — orphan: runbook owned only by a person who left
  e("person:priya-nair", "doc:RB-021", "OWNS"),

  // Org
  e("person:priya-nair", "team:platform", "MEMBER_OF"),
  e("person:sofia-almeida", "team:platform", "MEMBER_OF"),
  e("person:elena-petrova", "team:platform", "MEMBER_OF"),
  e("person:jordan-wu", "team:platform", "MEMBER_OF"),
  e("person:marcus-lee", "team:platform", "MEMBER_OF"),
  e("person:dan-okafor", "team:sre", "MEMBER_OF"),
  e("person:yuki-tanaka", "team:payments", "MEMBER_OF"),
  e("person:ben-carter", "team:data", "MEMBER_OF"),
  e("person:ana-rojas", "team:compliance", "MEMBER_OF"),
  e("person:elena-petrova", "person:marcus-lee", "REPORTS_TO"),
  e("person:sofia-almeida", "person:elena-petrova", "REPORTS_TO"),
  e("person:dan-okafor", "person:elena-petrova", "REPORTS_TO"),
  e("person:jordan-wu", "person:elena-petrova", "REPORTS_TO"),
  e("person:yuki-tanaka", "person:elena-petrova", "REPORTS_TO"),
  e("team:platform", "system:session-store", "OWNS"),
  e("team:platform", "system:auth-service", "OWNS"),
  e("team:payments", "system:payments-api", "OWNS"),
  e("team:data", "system:data-warehouse", "OWNS"),
  e("team:sre", "system:kafka-bus", "OWNS"),
  e("team:compliance", "system:audit-logging", "OWNS"),
  e("person:sofia-almeida", "system:session-store", "CONTRIBUTED_TO"),
  e("person:dan-okafor", "system:kafka-bus", "CONTRIBUTED_TO"),
  e("person:yuki-tanaka", "system:payments-api", "CONTRIBUTED_TO"),
  e("person:ben-carter", "system:data-warehouse", "CONTRIBUTED_TO"),
  e("person:ana-rojas", "system:audit-logging", "CONTRIBUTED_TO"),
  e("person:sofia-almeida", "system:auth-service", "CONTRIBUTED_TO"),
];

/* ------------------------------------------------------ derived + helpers */

export function nodeById(id: string): GraphNode | undefined {
  return allNodes.find((n) => n.id === id);
}

export function personById(id: string): Person | undefined {
  return people.find((p) => p.id === id);
}

export function decisionById(id: string) {
  return decisions.find((d) => d.id === id);
}

/** Nodes that point at `decisionId` via DEPENDS_ON | IMPLEMENTS | REFERENCES. */
export function dependentsOf(decisionId: string): GraphNode[] {
  const ids = edges
    .filter(
      (edge) =>
        ["DEPENDS_ON", "IMPLEMENTS", "REFERENCES"].includes(edge.type) &&
        edge.target === decisionId,
    )
    .map((edge) => edge.source);
  return ids.map(nodeById).filter((n): n is GraphNode => Boolean(n) && n!.id !== decisionId);
}

export function ownersOf(nodeId: string): Person[] {
  const ownerIds = edges
    .filter((edge) => ["OWNS", "AUTHORED", "DECIDED"].includes(edge.type) && edge.target === nodeId)
    .map((edge) => edge.source);
  return people.filter((p) => ownerIds.includes(p.id) && p.active);
}

export function busFactorRows(): BusFactorRow[] {
  const rows: BusFactorRow[] = [];
  for (const s of systems) {
    const contributors = edges
      .filter((edge) => edge.type === "CONTRIBUTED_TO" && edge.target === s.id)
      .map((edge) => personById(edge.source))
      .filter((p): p is Person => Boolean(p));
    if (contributors.length !== 1) continue;
    rows.push({
      system_id: s.id,
      system: s.name,
      criticality: s.criticality,
      person_id: contributors[0].id,
      person: contributors[0].name,
      total: 1,
    });
  }
  return rows.sort((a, b) => b.criticality - a.criticality || a.system.localeCompare(b.system));
}

/** Systems owned or contributed-to by one person, for the offboarding sim. */
export function systemsTouchedBy(personId: string): typeof systems {
  const ids = edges
    .filter(
      (edge) =>
        edge.source === personId &&
        edge.type === "CONTRIBUTED_TO" &&
        edge.target.startsWith("system:"),
    )
    .map((edge) => edge.target);
  return systems.filter((s) => ids.includes(s.id));
}

export function activeContributors(systemId: string): Person[] {
  return edges
    .filter((edge) => edge.type === "CONTRIBUTED_TO" && edge.target === systemId)
    .map((edge) => personById(edge.source))
    .filter((p): p is Person => Boolean(p) && p!.active);
}

/** Meta-graph slice containing just the given node ids and the edges among them. */
export function subgraphFor(ids: string[]): Subgraph {
  const set = new Set(ids);
  const nodes = allNodes.filter((n) => set.has(n.id));
  const subEdges = edges.filter((edge) => set.has(edge.source) && set.has(edge.target));
  return { nodes, edges: subEdges };
}

function affectedFrom(ids: string[], hops = 1): AffectedNode[] {
  return ids
    .map(nodeById)
    .filter((n): n is GraphNode => Boolean(n))
    .map((n) => ({
      id: n.id,
      label: n.label,
      title: n.title,
      status: n.status ?? "active",
      hops,
      owners: ownersOf(n.id),
    }));
}

const supersededBy31Ids = [
  "decision:D-031",
  "decision:D-001",
  "doc:ADR-014",
  "doc:ADR-031",
  "doc:RB-007",
  "doc:RB-012",
  "doc:ONB-002",
  "ticket:PAY-402",
  "ticket:PLAT-118",
  "ticket:PLAT-119",
  "pr:payments-api#96",
];

const contradictionIds = [
  "decision:D-014",
  "decision:D-021",
  "system:audit-logging",
  "system:data-warehouse",
  "thread:eng-compliance-1730000000",
];

export const proposals: Proposal[] = [
  {
    id: "proposal:supersede-D-001-by-D-031",
    kind: "supersedes",
    status: "pending",
    confidence: 0.87,
    reason:
      "A later decision (D-031, 2026-10-06) replaces the session store named by D-001 (Redis → Postgres). The two cannot both be current.",
    evidence_quote:
      "“One stateful dependency instead of two, and sessions survive cache eviction.” — ADR-031, 2026-10-06",
    created_at: NOW - 2 * DAY,
    new_decision: nodeById("decision:D-031")!,
    old_decision: nodeById("decision:D-001")!,
    impact: subgraphFor(supersededBy31Ids),
    affected: affectedFrom(
      [
        "doc:ADR-014",
        "doc:RB-007",
        "doc:RB-012",
        "doc:ONB-002",
        "ticket:PAY-402",
        "ticket:PLAT-118",
        "ticket:PLAT-119",
        "pr:payments-api#96",
      ],
      1,
    ),
  },
  {
    id: "proposal:contradiction-D-014-D-021",
    kind: "contradicts",
    status: "pending",
    confidence: 0.71,
    reason:
      "D-014 (7-year audit retention, 2024-06-02) and D-021 (1-year audit retention, 2025-11-15) set different values for the same policy on the same system with no recorded supersession.",
    evidence_quote:
      "“Audit logs are pruned after 1 year to control storage cost.” — D-021, 2025-11-15",
    created_at: NOW - 6 * DAY,
    new_decision: nodeById("decision:D-021")!,
    old_decision: nodeById("decision:D-014")!,
    impact: subgraphFor(contradictionIds),
    affected: affectedFrom(["system:audit-logging", "system:data-warehouse"], 1),
  },
  {
    id: "proposal:supersede-D-081-by-D-090",
    kind: "supersedes",
    status: "accepted",
    confidence: 0.92,
    reason: "D-090 replaced D-081 as the reverse-proxy config source of truth.",
    evidence_quote: "“Caddy is retired. nginx owns TLS termination from 2026-08.” — D-090",
    created_at: NOW - 40 * DAY,
    resolved_at: NOW - 38 * DAY,
    new_decision: {
      id: "decision:D-090",
      label: "Decision",
      title: "nginx owns TLS termination",
      status: "active",
    },
    old_decision: {
      id: "decision:D-081",
      label: "Decision",
      title: "Caddy owns TLS termination",
      status: "superseded",
    },
    impact: { nodes: [], edges: [] },
    affected: [],
  },
];

export const pendingProposals = proposals.filter((p) => p.status === "pending");

export const stats: Stats = {
  counts: { Decision: decisions.length, Doc: docs.length, Ticket: tickets.length, PR: prs.length, Thread: threads.length, System: systems.length, Person: people.length },
  stale: allNodes.filter((n) => n.status === "stale").length,
  pending_proposals: 2,
};

export const demoSubgraph = (): Subgraph => ({ nodes: allNodes, edges });
