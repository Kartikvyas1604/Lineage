import { cn } from "@/lib/utils";
import Link from "next/link";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("h-6 w-6", className)}
    >
      <path
        d="M9.35 12.1V19M13.55 23.2H19.45"
        stroke="currentColor"
        strokeWidth="2.6"
      />
      <circle cx="9.35" cy="8.4" r="2.7" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="23.15" cy="23.2" r="2.7" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="9.35" cy="23.2" r="3.2" stroke="currentColor" strokeWidth="2.6" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-1 text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <LogoMark className="h-5 w-5 shrink-0" />
      <span className="font-display text-lg font-semibold tracking-tight">Lineage</span>
      <span className="sr-only">— home</span>
    </Link>
  );
}
