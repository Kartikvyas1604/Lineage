"use client";

import { cn } from "@/lib/utils";
import { useId, useRef, type ComponentProps, type ReactNode } from "react";

export interface TabItem {
  value: string;
  label: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  /** Shared id base so the consumer can render matching tabpanels. */
  idBase?: string;
  className?: string;
  "aria-label"?: string;
}

/** Accessible tab list: roving tabindex + arrow/Home/End keys. */
export function Tabs({ items, value, onValueChange, idBase, className, ...rest }: TabsProps & ComponentProps<"div">) {
  const generated = useId();
  const baseId = idBase ?? generated;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    let next = index;
    if (dir) next = (index + dir + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    onValueChange(items[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={rest["aria-label"]}
      className={cn("inline-flex items-center gap-1 rounded-md bg-muted p-1", className)}
    >
      {items.map((item, i) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${baseId}-tab-${item.value}`}
            aria-selected={selected}
            aria-controls={`${baseId}-panel-${item.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
