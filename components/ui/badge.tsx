import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type Tone = "neutral" | "outline" | "active" | "stale" | "superseded" | "proposal" | "risk";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-foreground",
  outline: "border border-border text-muted-foreground",
  active: "bg-active/15 text-active",
  stale: "bg-stale/15 text-stale",
  superseded: "bg-superseded/15 text-superseded",
  proposal: "bg-proposal/15 text-proposal",
  risk: "bg-risk/15 text-risk",
};

export interface BadgeProps extends ComponentProps<"span"> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
