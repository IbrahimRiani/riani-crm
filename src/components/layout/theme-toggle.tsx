"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, type ThemeChoice } from "@/lib/theme/theme";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    try {
      if (localStorage.getItem("ibra-crm-theme") === null) {
        applyTheme(mq.matches ? "dark" : "light");
      }
    } catch {
      // sin localStorage: no se persiste
    }
    onChange();
  };
  const onManualChange = () => onChange();
  mq.addEventListener("change", onSystemChange);
  window.addEventListener("ibra-theme-change", onManualChange);
  return () => {
    mq.removeEventListener("change", onSystemChange);
    window.removeEventListener("ibra-theme-change", onManualChange);
  };
}

function getSnapshot(): ThemeChoice {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): ThemeChoice {
  return "light";
}

export function ThemeToggle({ label = true }: { label?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: ThemeChoice = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    window.dispatchEvent(new Event("ibra-theme-change"));
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {label && (theme === "dark" ? "Modo claro" : "Modo noche")}
    </button>
  );
}
