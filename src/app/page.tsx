"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";

const AGENTS = [
  { id: "inv", short: "IA", name: "Investment Analyst", model: "Opus 5", status: "ready" },
  { id: "prop", short: "PA", name: "Property Analyst", model: "Sonnet 5", status: "idle" },
];

const THREADS = [
  { t: "Weekly IC brief — 08 Sep", m: "now · 1 AMBER", active: true },
  { t: "Nvidia / MediaTek convertible", m: "2h ago" },
  { t: "AUD hedging window scan", m: "yesterday" },
  { t: "Screening: private credit fund II", m: "Fri" },
];

export default function EverlinWorkspace() {
  const [agent, setAgent] = useState("inv");
  const [icGrade, setIcGrade] = useState(false);
  const { messages, sendMessage, status } = useChat();

  const onSubmit = (msg: PromptInputMessage) => {
    if (!msg.text?.trim()) return;
    // IC-grade toggle routes to Opus in the route handler (spec §31.1 model routing).
    sendMessage({ text: msg.text }, { body: { mode: icGrade ? "ic" : "routine" } });
  };

  const activeAgent = AGENTS.find((a) => a.id === agent);

  return (
    <div className="grid h-dvh grid-cols-[216px_minmax(360px,1fr)_minmax(380px,1.1fr)] max-lg:grid-cols-[216px_1fr] max-md:grid-cols-1 bg-background text-foreground">
      {/* RAIL */}
      <aside className="flex flex-col border-r bg-primary text-primary-foreground min-h-0 max-md:hidden">
        <div className="px-6 py-5 border-b border-white/10">
          <div className="font-heading text-lg font-bold tracking-wide">EVERLIN</div>
          <div className="text-xs italic text-accent">Enduring Legacy</div>
        </div>
        <div className="p-3 border-b border-white/10 flex flex-col gap-1">
          <div className="px-2 pb-1 text-[10px] uppercase tracking-widest opacity-60">Agents</div>
          {AGENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAgent(a.id)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 min-h-12 text-left transition ${
                agent === a.id ? "bg-black/20 shadow-[inset_3px_0_0_var(--accent)]" : "hover:bg-white/5"
              }`}
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent font-heading text-sm font-bold text-accent-foreground">
                {a.short}
              </span>
              <span className="leading-tight">
                <span className="block text-sm">{a.name}</span>
                <span className="text-[10px] text-accent">
                  {a.status === "ready" ? "● ready" : "idle"} · {a.model}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          <div className="px-2 py-2 text-[10px] uppercase tracking-widest opacity-60">Threads</div>
          {THREADS.map((th, i) => (
            <button
              key={i}
              className={`flex w-full flex-col rounded-md px-3 py-2 min-h-10 text-left ${
                th.active ? "bg-black/20" : "hover:bg-white/5"
              }`}
            >
              <span className="text-[13px] leading-tight">{th.t}</span>
              <span className="text-[10px] opacity-60">{th.m}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-white/10 px-6 py-3 text-xs text-accent">
          <span className="block font-semibold text-primary-foreground">Jordan</span>
          Principal · IC
        </div>
      </aside>

      {/* CONVERSATION — the driver */}
      <section className="flex flex-col min-h-0 border-r bg-background">
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent font-heading text-xs font-bold text-accent-foreground">
            {activeAgent?.short}
          </span>
          <span className="font-heading text-[15px] font-semibold">{activeAgent?.name}</span>
          <button
            onClick={() => setIcGrade((v) => !v)}
            className={`ml-auto rounded-md border px-2.5 py-1 font-mono text-[10px] ${
              icGrade ? "border-accent bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
            title="IC-grade routes to Opus; routine routes to Sonnet (spec §31.1)"
          >
            {icGrade ? "IC-GRADE · OPUS" : "ROUTINE · SONNET"}
          </button>
        </header>

        <Conversation className="flex-1 min-h-0">
          <ConversationContent>
            {messages.length === 0 && (
              <ConversationEmptyState
                title="Brief the Investment Analyst"
                description="Ask for this week's IC brief, a screening lean, or challenge a call. Every figure is sourced or marked not-obtained."
              />
            )}
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) =>
                    part.type === "text" ? (
                      <MessageResponse key={`${message.id}-${i}`}>{part.text}</MessageResponse>
                    ) : null
                  )}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t p-4">
          <PromptInput onSubmit={onSubmit}>
            <PromptInputBody>
              <PromptInputTextarea placeholder="Reply to the Investment Analyst… (⏎ send, ⇧⏎ newline)" />
            </PromptInputBody>
            <PromptInputFooter>
              <span className="px-1 text-[11px] text-muted-foreground">
                Challenge a call and it holds unless you bring new evidence.
              </span>
              <PromptInputSubmit status={status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </section>

      {/* ARTIFACT CANVAS — static reference for now; agent output streams here next */}
      <section className="flex flex-col min-h-0 bg-card max-lg:hidden">
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Artifact · Weekly IC Briefing
          </span>
          <span className="font-mono text-[10px] text-accent">EVL-WEEKLY-08092026</span>
          <div className="ml-auto flex gap-2">
            <button className="rounded-md border px-3 py-1.5 text-[12.5px]">Edit</button>
            <button className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-foreground">
              Export PDF
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <h1 className="font-heading text-2xl font-bold leading-tight">
            Payrolls Blowout Revives September Hike Bets
          </h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Everlin Family Office · Week ending Fri 05 Sep 2026 · Investment lens · IC only
          </p>
          <div className="mt-5 flex justify-between rounded-sm bg-primary px-3 py-1.5 text-[11px] uppercase tracking-widest text-primary-foreground">
            <span>Market Pulse</span>
            <span className="text-accent">Investment Analyst</span>
          </div>
          <p className="mt-3 font-heading text-base font-semibold leading-snug">
            August payrolls +162k vs ~55k consensus revived September-hike odds to ~65%.
          </p>
          <p className="mt-3 font-mono text-[10.5px] text-emerald-700 dark:text-emerald-400">
            ✓ 6/6 figures sourced · AUD/USD cross-checked 2 sources ·{" "}
            <span className="italic text-muted-foreground">FOMC decision not obtained, not estimated</span>
          </p>
          <p className="mt-4 text-[13px] text-muted-foreground">
            Artifact is static in this build. Next: stream the agent&apos;s generated brief into this
            canvas as a structured artifact with live source attribution.
          </p>
        </div>
      </section>
    </div>
  );
}
