import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { KnowledgeStatus } from "@/lib/types";
import { AlertTriangle, Archive, CircleCheck, CircleDashed, Sparkles } from "lucide-react";

const config: Record<
  KnowledgeStatus,
  { tone: NonNullable<BadgeProps["tone"]>; label: string; Icon: typeof CircleCheck }
> = {
  active: { tone: "active", label: "Current", Icon: CircleCheck },
  stale: { tone: "stale", label: "Stale", Icon: AlertTriangle },
  superseded: { tone: "superseded", label: "Superseded", Icon: Archive },
  archived: { tone: "neutral", label: "Archived", Icon: CircleDashed },
};

/** Status is always icon + color + word — never color alone. */
export function StatusBadge({ status }: { status: KnowledgeStatus }) {
  const { tone, label, Icon } = config[status];
  return (
    <Badge tone={tone}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </Badge>
  );
}

export function StatusDot({ tone }: { tone: BadgeProps["tone"] }) {
  const color =
    tone === "active"
      ? "bg-active"
      : tone === "stale"
        ? "bg-stale"
        : tone === "proposal"
          ? "bg-proposal"
          : tone === "risk"
            ? "bg-risk"
            : "bg-superseded";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden />;
}

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <CircleCheck className="h-3 w-3 text-active" aria-hidden /> Current
      </span>
      <span className="inline-flex items-center gap-1.5">
        <AlertTriangle className="h-3 w-3 text-stale" aria-hidden /> Stale
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Archive className="h-3 w-3 text-superseded" aria-hidden /> Superseded
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-proposal" aria-hidden /> Proposal
      </span>
    </div>
  );
}
