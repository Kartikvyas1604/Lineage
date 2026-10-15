"use client";

import { cn } from "@/lib/utils";
import { GitBranch, ListChecks, ShieldAlert, Waypoints } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Ask", icon: Waypoints },
  { href: "/review", label: "Review", icon: ListChecks },
  { href: "/risk", label: "Risk", icon: ShieldAlert },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex items-center gap-0.5">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-md px-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <GitBranch className="h-5 w-5 text-primary" aria-hidden />
      <span className="font-display text-lg font-semibold tracking-tight">Lineage</span>
      <span className="sr-only">— home</span>
    </Link>
  );
}
