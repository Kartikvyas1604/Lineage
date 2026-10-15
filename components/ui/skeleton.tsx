import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/** Motion-safe shimmer. Hidden entirely under prefers-reduced-motion. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-muted motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
