"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { PlusIcon } from "lucide-react";

// Sessions are the sidebar's primary content. `SESSIONS` is the canonical list;
// `THREADS` is kept as an alias so existing imports / `/t/[id]` routing keep working.
export const SESSIONS = [
  { id: "weekly-08sep", t: "Weekly IC brief — 08 Sep", m: "now · 1 AMBER" },
  { id: "nvda-mediatek", t: "Nvidia / MediaTek convertible", m: "2h ago" },
  { id: "aud-hedge", t: "AUD hedging window scan", m: "yesterday" },
  { id: "pc-fund-ii", t: "Screening: private credit fund II", m: "Fri" },
];

export const THREADS = SESSIONS;

export function SessionList({ activeId }: { activeId: string }) {
  const router = useRouter();

  // Start a fresh chat with the core agent. Reuses the same /t/[id] surface. The
  // id must be generated on CLICK, not at render: computing Date.now() during
  // render makes the server and client produce different hrefs and triggers a
  // hydration mismatch. Navigating from the click handler keeps SSR output
  // deterministic.
  function openNewChat() {
    router.push(`/t/session-${Date.now().toString(36)}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={openNewChat}
          aria-label="New chat with the core agent"
          title="New chat with the core agent"
          className="group flex min-h-10 w-full items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-[13px] font-medium text-sidebar-foreground/90 transition-colors hover:border-[var(--sidebar-accent)]/60 hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sidebar-accent)]"
        >
          <PlusIcon className="size-4 text-[var(--sidebar-accent)]" />
          New chat
        </button>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="px-2 py-2 text-[10px] uppercase tracking-widest text-sidebar-foreground/45">
          Sessions
        </div>
        <ul className="flex flex-col gap-0.5">
          {SESSIONS.map((s) => {
            const active = s.id === activeId;
            return (
              <li key={s.id}>
                <motion.div
                  whileHover={{ x: 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  style={{ willChange: "transform" }}
                >
                  <Link
                    href={`/t/${s.id}`}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex min-h-10 w-full flex-col rounded-md px-3 py-2 transition-colors ${
                      active
                        ? "bg-[var(--sidebar-accent)]/15 text-sidebar-foreground"
                        : "text-sidebar-foreground/80 hover:bg-white/6 hover:text-sidebar-foreground"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--sidebar-accent)]" />
                    )}
                    <span className="text-[13px] leading-tight">{s.t}</span>
                    <span className="text-[10px] text-sidebar-foreground/45 tabular-nums">
                      {s.m}
                    </span>
                  </Link>
                </motion.div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
