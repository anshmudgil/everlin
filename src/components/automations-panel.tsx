"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AUTOMATION_STATUS_LABEL,
  AUTOMATIONS,
  type Automation,
  type AutomationStatus,
} from "@/lib/everlin/automations";
import { PlayIcon, ArrowUpRightIcon } from "lucide-react";

const STATUS_CLASS: Record<AutomationStatus, string> = {
  ok: "escalation-green",
  scheduled: "escalation-amber",
  paused: "text-muted-foreground",
  failed: "escalation-red",
};

const RAIL_STATUS_CLASS: Record<AutomationStatus, string> = {
  ok: "text-emerald-300",
  scheduled: "text-[var(--sidebar-accent)]",
  paused: "text-sidebar-foreground/45",
  failed: "text-red-300",
};

export function AutomationsRailList({
  selectedId,
  onSelect,
  onRun,
  onOpen,
}: {
  selectedId: string | null;
  onSelect: (a: Automation) => void;
  onRun: (a: Automation) => void;
  onOpen: (a: Automation) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="px-2 py-2 text-[10px] uppercase tracking-widest text-sidebar-foreground/45">
          Automations
        </div>
        <ul className="flex flex-col gap-0.5">
          {AUTOMATIONS.map((a) => {
            const active = a.id === selectedId;
            return (
              <li key={a.id}>
                <div
                  className={`relative rounded-md px-3 py-2 transition-colors ${
                    active
                      ? "bg-[var(--sidebar-accent)]/15 text-sidebar-foreground"
                      : "text-sidebar-foreground/80 hover:bg-white/6 hover:text-sidebar-foreground"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--sidebar-accent)]" />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(a)}
                    className="w-full text-left"
                  >
                    <span className="block text-[13px] leading-tight">{a.title}</span>
                    <span className={`block text-[10px] tabular-nums ${RAIL_STATUS_CLASS[a.status]}`}>
                      {AUTOMATION_STATUS_LABEL[a.status]} · {a.lastRunAt}
                    </span>
                  </button>
                  <div className="mt-1.5 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onRun(a)}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--sidebar-accent)] hover:bg-white/10"
                    >
                      Run
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpen(a)}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/70 hover:bg-white/10 hover:text-sidebar-foreground"
                    >
                      Open
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function AutomationsBoard({
  selectedId,
  onSelect,
  onRun,
  onOpen,
}: {
  selectedId: string | null;
  onSelect: (a: Automation) => void;
  onRun: (a: Automation) => void;
  onOpen: (a: Automation) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-5 py-5">
        <div>
          <h2 className="text-base font-semibold">Scheduled work</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fixture runs for the prototype. Run sends the skill into chat; Open loads the prompt so you can edit first.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {AUTOMATIONS.map((a) => {
            const selected = a.id === selectedId;
            return (
              <li key={a.id}>
                <article
                  className={`rounded-xl border bg-card p-4 shadow-xs transition-colors ${
                    selected ? "border-accent" : "border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(a)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold">{a.title}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">{a.cadence}</p>
                      </div>
                      <span className={`text-[11px] font-medium ${STATUS_CLASS[a.status]}`}>
                        {AUTOMATION_STATUS_LABEL[a.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                      Last run {a.lastRunAt}
                      {a.lastRunNote ? ` · ${a.lastRunNote}` : ""}
                    </p>
                    <Badge variant="outline" className="mt-2 font-normal">
                      {a.skillId}
                    </Badge>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => onRun(a)}>
                      <PlayIcon className="size-3.5" />
                      Run
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onOpen(a)}>
                      <ArrowUpRightIcon className="size-3.5" />
                      Open in chat
                    </Button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
