/**
 * Fixture automations for the agent-native shell prototype.
 * No durable scheduler yet — status and last-run are static so the UI
 * is demoable without a store. Run / Open jump into chat with a skill prompt.
 */
import { SKILL_COMMANDS, type SkillCommand } from "@/lib/everlin/skill-commands";

export type AutomationStatus = "ok" | "scheduled" | "paused" | "failed";

export type Automation = {
  id: string;
  title: string;
  cadence: string;
  skillId: string;
  status: AutomationStatus;
  lastRunAt: string;
  lastRunNote: string;
  prompt: string;
};

function promptFor(cmd: string): string {
  const found: SkillCommand | undefined = SKILL_COMMANDS.find((c) => c.cmd === cmd);
  return found?.prompt ?? cmd;
}

export const AUTOMATIONS: Automation[] = [
  {
    id: "daily-ic-brief",
    title: "Daily IC Brief",
    cadence: "Weekdays 07:00 AEST",
    skillId: "everlin-morning-brief",
    status: "ok",
    lastRunAt: "16 Sep 2026 · 07:02 AEST",
    lastRunNote: "GREEN · RBA cash sourced",
    prompt: promptFor("/brief"),
  },
  {
    id: "weekly-ic-brief",
    title: "Weekly IC Brief",
    cadence: "Mondays 08:00 AEST",
    skillId: "everlin-weekly-ic-brief",
    status: "scheduled",
    lastRunAt: "8 Sep 2026 · 08:04 AEST",
    lastRunNote: "AMBER · fee load flagged",
    prompt: promptFor("/weekly"),
  },
  {
    id: "evidence-pack-freeze",
    title: "Evidence pack freeze",
    cadence: "Fridays 16:00 AEST",
    skillId: "everlin-reconciliation-pack",
    status: "ok",
    lastRunAt: "12 Sep 2026 · 16:01 AEST",
    lastRunNote: "Draft pack · not signed off",
    prompt: promptFor("/recon"),
  },
  {
    id: "fx-hedge-scan",
    title: "AUD hedging window scan",
    cadence: "Daily 06:30 AEST",
    skillId: "everlin-morning-brief",
    status: "paused",
    lastRunAt: "5 Sep 2026 · 06:31 AEST",
    lastRunNote: "Paused · waiting on overlay policy",
    prompt:
      "Run the AUD hedging window scan as part of today’s Daily IC Brief. Call planSkills, then retrieve RBA cash and any available macro figures. Do not estimate unobtained FX levels.",
  },
];

export function getAutomation(id: string): Automation | undefined {
  return AUTOMATIONS.find((a) => a.id === id);
}

export const AUTOMATION_STATUS_LABEL: Record<AutomationStatus, string> = {
  ok: "Last run OK",
  scheduled: "Scheduled",
  paused: "Paused",
  failed: "Failed",
};
