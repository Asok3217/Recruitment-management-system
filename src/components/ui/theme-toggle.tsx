"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="h-10 w-10 rounded-full border border-border"
        aria-label="Change theme"
      />
    );
  }

  const isDark =
    theme === "dark" ||
    (theme === "system" && resolvedTheme === "dark");

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="
        inline-flex h-10 w-10 items-center justify-center
        rounded-full border border-border
        bg-background
        text-foreground
        shadow-sm
        transition
        hover:bg-muted
        focus:outline-none
        focus:ring-2
        focus:ring-ring
      "
      aria-label={
        isDark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}