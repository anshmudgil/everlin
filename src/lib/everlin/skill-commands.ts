/**
 * Client-safe skill catalog for the agent-native composer.
 * Slash commands, chips, and the skills picker all read from here so they
 * stay aligned with the built-in `SKILLS` registry (router.ts) without
 * importing the Node-only proposal store.
 */

export type SkillCommand = {
  cmd: string;
  skillId: string;
  label: string;
  /** Prompt the composer fills / the chat sends. Mentions planSkills so the agent uses the existing seam. */
  prompt: string;
};

export const SKILL_COMMANDS: SkillCommand[] = [
  {
    cmd: "/brief",
    skillId: "everlin-morning-brief",
    label: "Daily IC Brief",
    prompt:
      "Run today’s Daily IC Brief. Call planSkills with this request, then generateDailyBrief so the brief streams into the canvas.",
  },
  {
    cmd: "/weekly",
    skillId: "everlin-weekly-ic-brief",
    label: "Weekly IC Brief",
    prompt:
      "Run this week’s Weekly IC Brief. Call planSkills first, then assemble the weekly IC pack using retrieval and calc tools. Stream a structured brief to the canvas if you can.",
  },
  {
    cmd: "/recon",
    skillId: "everlin-reconciliation-pack",
    label: "Evidence pack freeze",
    prompt:
      "Run the evidence pack freeze. Call planSkills for everlin-reconciliation-pack and assemble a reconciliation evidence pack (draft only — do not sign off).",
  },
  {
    cmd: "/screen",
    skillId: "everlin-investment-screener",
    label: "Investment screen",
    prompt:
      "Screen this inbound deal at a high level. Call planSkills for everlin-investment-screener, then follow that skill.",
  },
  {
    cmd: "/diligence",
    skillId: "everlin-manager-diligence",
    label: "Manager diligence",
    prompt:
      "Run manager diligence. Call planSkills for everlin-manager-diligence and foreground fees, liquidity, and risk using the calc tools.",
  },
  {
    cmd: "/digest",
    skillId: "everlin-document-digest",
    label: "Document digest",
    prompt:
      "Make this document legible. Call planSkills for everlin-document-digest and list questions for counsel. Draft only.",
  },
  {
    cmd: "/prep",
    skillId: "everlin-meeting-prep",
    label: "Meeting prep",
    prompt:
      "Prep me for the next IC / counterparty meeting. Call planSkills for everlin-meeting-prep.",
  },
  {
    cmd: "/cash",
    skillId: "everlin-morning-brief",
    label: "RBA cash rate",
    prompt:
      "What is the current RBA cash rate? Use getAuCashRate and cite the source. Do not estimate.",
  },
  {
    cmd: "/propose",
    skillId: "everlin-resolver",
    label: "Propose a skill",
    prompt:
      "This request is a capability gap: I need a monthly property pulse brief. Call planSkills first; if it is UNROUTED, call proposeSkill so the proposal lands in the review queue (do not claim it is usable until approved).",
  },
];

function command(cmd: string): SkillCommand {
  const found = SKILL_COMMANDS.find((c) => c.cmd === cmd);
  if (!found) throw new Error(`missing skill command ${cmd}`);
  return found;
}

/** Chips shown on the empty conversation — short, demoable in one click. */
export const SKILL_CHIPS: SkillCommand[] = [
  command("/brief"),
  command("/weekly"),
  command("/cash"),
  command("/recon"),
];

export function filterSkillCommands(filter: string): SkillCommand[] {
  const q = filter.trim().toLowerCase();
  if (!q) return SKILL_COMMANDS;
  return SKILL_COMMANDS.filter(
    (c) =>
      c.cmd.slice(1).toLowerCase().startsWith(q) ||
      c.label.toLowerCase().includes(q) ||
      c.skillId.toLowerCase().includes(q),
  );
}
