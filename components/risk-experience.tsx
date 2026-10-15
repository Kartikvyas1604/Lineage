"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getBusFactor, listPeople, offboard } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { BusFactorRow, OffboardingResult, Person } from "@/lib/types";
import { AlertTriangle, Check, ShieldAlert, UserMinus, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

function Criticality({ level }: { level: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={`Criticality ${level} of 5`}
      aria-label={`Criticality ${level} of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i < level ? (level >= 5 ? "bg-risk" : "bg-stale") : "bg-border",
          )}
        />
      ))}
    </span>
  );
}

export function RiskExperience() {
  const [rows, setRows] = useState<BusFactorRow[] | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<OffboardingResult | null>(null);
  const [loadingOff, setLoadingOff] = useState(false);
  const [assigned, setAssigned] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    Promise.all([getBusFactor(), listPeople()]).then(([b, p]) => {
      if (!alive) return;
      setRows(b);
      setPeople(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function simulate(personId: string) {
    setSelected(personId);
    setLoadingOff(true);
    setAssigned({});
    try {
      const r = await offboard(personId);
      setResult(r);
    } finally {
      setLoadingOff(false);
    }
  }

  const departed = people.filter((p) => !p.active);
  const singleContributorSystems = rows ?? [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Risk</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Where knowledge is concentrated in one person, and what leaves with them. Both views are
          computed from who actually touched each system in the graph — not from an org chart.
        </p>
      </header>

      {departed.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-risk/30 bg-risk/5 p-4"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-risk" aria-hidden />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              {departed.map((p) => p.name).join(", ")} {departed.length === 1 ? "has" : "have"} left
              the company.
            </p>
            <p className="text-muted-foreground">
              {singleContributorSystems.filter((r) => departed.some((d) => d.id === r.person_id)).length}{" "}
              systems below now have a bus factor of one on someone who is no longer here. Run the
              offboarding check to draft successors.
            </p>
          </div>
        </div>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="bus-factor-heading">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="bus-factor-heading" className="text-sm font-medium text-foreground">
            Bus factor of one
          </h2>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-2.5 font-medium">System</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Criticality</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Only contributor</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Contributors</th>
              </tr>
            </thead>
            <tbody>
              {!rows
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3" colSpan={4}>
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                : rows.map((r) => {
                    const person = people.find((p) => p.id === r.person_id);
                    const left = person && !person.active;
                    return (
                      <tr key={r.system_id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">{r.system}</td>
                        <td className="px-4 py-3">
                          <Criticality level={r.criticality} />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => simulate(r.person_id)}
                            className="inline-flex items-center gap-1.5 rounded text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {r.person}
                            {left && (
                              <Badge tone="risk" title="Has left the company">
                                left
                              </Badge>
                            )}
                          </button>
                        </td>
                        <td className="tabular px-4 py-3 text-right text-muted-foreground">
                          {r.total}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="offboard-heading">
        <div className="flex items-center gap-2">
          <UserMinus className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 id="offboard-heading" className="text-sm font-medium text-foreground">
            Offboarding simulator
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Pick a person to see what leaves with them and who is best placed to take it over.
        </p>
        <div className="flex flex-wrap gap-2">
          {people.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => simulate(p.id)}
              aria-pressed={selected === p.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected === p.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:bg-accent",
              )}
            >
              <UserRound className="h-3.5 w-3.5" aria-hidden />
              {p.name}
              {!p.active && <span className="text-xs opacity-80">(left)</span>}
            </button>
          ))}
        </div>

        {loadingOff && <Skeleton className="h-32 w-full" />}

        {result && !loadingOff && (
          <div className="flex flex-col gap-4">
            {result.at_risk_systems.length === 0 ? (
              <div className="rounded-lg border border-active/30 bg-active/5 p-4 text-sm">
                <p className="inline-flex items-center gap-2 font-medium text-active">
                  <Check className="h-4 w-4" aria-hidden />
                  {result.person.name} is not a single point of failure.
                </p>
                <p className="mt-1 text-muted-foreground">
                  Every system they touch has at least one other active contributor.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{result.person.name}</span> is the
                  only active contributor on {result.at_risk_systems.length} system
                  {result.at_risk_systems.length === 1 ? "" : "s"}.
                </p>
                {result.at_risk_systems.map((sys) => (
                  <div key={sys.system_id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground">{sys.system}</h3>
                      <Criticality level={sys.criticality} />
                      <Badge tone={sys.criticality >= 5 ? "risk" : "stale"}>
                        weight {sys.weight}
                      </Badge>
                      <span className="ml-auto tabular text-xs text-muted-foreground">
                        {sys.remaining.length} active contributor{sys.remaining.length === 1 ? "" : "s"} left
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {sys.successors.map((s) => {
                        const isAssigned = assigned[sys.system_id] === s.id;
                        return (
                          <div
                            key={s.id}
                            className="flex flex-col gap-2 rounded-md border border-border bg-background p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium text-foreground">{s.name}</span>
                              <span className="tabular text-xs text-muted-foreground">{s.score.toFixed(1)}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.min(100, (s.score / 6) * 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">{s.via.join(" · ")}</p>
                            <Button
                              size="sm"
                              variant={isAssigned ? "secondary" : "outline"}
                              onClick={() =>
                                setAssigned((prev) => ({ ...prev, [sys.system_id]: s.id }))
                              }
                              disabled={isAssigned}
                              aria-live="polite"
                            >
                              {isAssigned ? (
                                <>
                                  <Check className="h-3.5 w-3.5" aria-hidden /> Handover drafted
                                </>
                              ) : (
                                "Assign as successor"
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
