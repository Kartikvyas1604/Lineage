"use client";

import { Button } from "@/components/ui/button";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "lineage-theme";
const EVENT = "lineage-theme-change";

function isTheme(v: string | null): v is Theme {
  return v === "light" || v === "dark" || v === "system";
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
    mq.removeEventListener("change", cb);
  };
}

function getSnapshot(): Theme {
  const saved = localStorage.getItem(KEY);
  return isTheme(saved) ? saved : "dark";
}

function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  window.dispatchEvent(new Event(EVENT));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "dark" as Theme);

  useEffect(() => {
    const dark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, [theme]);

  function cycle() {
    setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark");
  }

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label = `Theme: ${theme}. Activate to change.`;

  return (
    <Button variant="ghost" size="icon" onClick={cycle} aria-label={label} title={label}>
      <Icon className="h-4 w-4" aria-hidden />
    </Button>
  );
}
