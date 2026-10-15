"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getStats, isLive } from "@/lib/api";
import type { Stats } from "@/lib/types";
import { AlertTriangle, Database, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="tabular text-sm font-medium text-foreground">{value.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function StatsStrip() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    getStats().then((s) => alive && setStats(s));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 sm:px-6">
        {stats ? (
          <>
            <Stat value={stats.counts.Decision ?? 0} label="decisions" />
            <Stat value={stats.counts.Doc ?? 0} label="docs" />
            <Stat value={stats.counts.System ?? 0} label="systems" />
            <Stat value={stats.counts.Person ?? 0} label="people" />
            <span className="h-4 w-px bg-border" aria-hidden />
            <Link
              href="/risk"
              className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-stale hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {stats.stale} stale
            </Link>
            <Link
              href="/review"
              className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-proposal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {stats.pending_proposals} to review
            </Link>
          </>
        ) : (
          <>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
          </>
        )}
        <span className="ml-auto">
          <Badge tone="outline" title={isLive ? "Connected to the API" : "Running on bundled demo data"}>
            <Database className="h-3 w-3" aria-hidden />
            {isLive ? "Live graph" : "Demo data"}
          </Badge>
        </span>
      </div>
    </div>
  );
}
