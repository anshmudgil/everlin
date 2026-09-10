"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "motion/react";
import { MoonIcon, SunIcon } from "lucide-react";

// Sidebar-footer theme toggle. Sun/moon cross-fade animates ONLY opacity + a
// small rotate (transform) so it stays on the compositor — no layout, no paint.
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes resolves the theme on the client; render a stable shell until
  // mounted to avoid a hydration mismatch on the icon.
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={
        "relative flex size-9 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-white/10 hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sidebar-accent)] " +
        (className ?? "")
      }
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={mounted ? (isDark ? "moon" : "sun") : "placeholder"}
          initial={{ opacity: 0, rotate: -35 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 35 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute flex items-center justify-center"
          style={{ willChange: "transform, opacity" }}
        >
          {mounted && isDark ? (
            <MoonIcon className="size-[18px]" />
          ) : (
            <SunIcon className="size-[18px]" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
