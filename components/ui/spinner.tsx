import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

export function Spinner({ className, label, ...props }: ComponentProps<"span"> & { label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)} {...props}>
      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
      {label ? <span>{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}
