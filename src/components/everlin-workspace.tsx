"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
} from "@/components/ai-elements/artifact";
import { DownloadIcon, PencilIcon } from "lucide-react";

const AGENTS = [
  { id: "inv", short: "IA", name: "Investment Analyst", model: "Qwen3.7 Flash", status: "ready" },
  { id: "prop", short: "PA", name: "Property Analyst", model: "Qwen3.7 Flash", status: "idle" },
];

export const THREADS = [
  { id: "weekly-08sep", t: "Weekly IC brief — 08 Sep", m: "now · 1 AMBER" },
  { id: "nvda-mediatek", t: "Nvidia / MediaTek convertible", m: "2h ago" },
  { id: "aud-hedge", t: "AUD hedging window scan", m: "yesterday" },
  { id: "pc-fund-ii", t: "Screening: private credit fund II", m: "Fri" },
];

// The agent's generated brief becomes an artifact in the canvas. Here it is detected
// from a data part the agent stream can emit (data-artifact); until the model emits one,
// the canvas shows the empty/awaiting state. This is the streaming-artifact seam.
type BriefArtifact = { title: string; ref: string; body: string };

function extractArtifact(messages: ReturnType<typeof useChat>["messages"]): BriefArtifact | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    for (const part of messages[i].parts) {
      // AI SDK data parts arrive as type `data-<name>`; the route can stream `data-artifact`.
      if (part.type === "data-artifact" && "data" in part) {
        return part.data as BriefArtifact;
      }
    }
  }
  return null;
}

export function EverlinWorkspace({ threadId }: { threadId: string }) {
  const [agent, setAgent] = useState("inv");
  const [icGrade, setIcGrade] = useState(false);
  // key useChat by thread so switching threads is a distinct conversation
  const { messages, sendMessage, status } = useChat({ id: threadId });

  const activeAgent = AGENTS.find((a) => a.id === agent);
  const artifact = extractArtifact(messages);
  const thread = THREADS.find((x) => x.id === threadId);

  const onSubmit = (msg: PromptInputMessage) => {
    if (!msg.text?.trim()) return;
    sendMessage({ text: msg.text }, { body: { mode: icGrade ? "ic" : "routine" } });
  };

  return (
    <div className="grid h-dvh grid-cols-[236px_minmax(420px,1fr)_minmax(380px,0.95fr)] max-lg:grid-cols-[236px_1fr] max-md:grid-cols-1 bg-background text-foreground">
      {/* RAIL — lighter, chat-first */}
      <aside className="flex flex-col border-r bg-primary text-primary-foreground min-h-0 max-md:hidden">
        <div className="px-6 py-5">
          <div className="font-heading text-lg font-bold tracking-wide">EVERLIN</div>
          <div className="text-xs italic text-accent">Enduring Legacy</div>
        </div>
        <div className="px-4 pb-3 flex flex-col gap-1">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAgent(a.id)}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2 min-h-11 text-left transition ${
                agent === a.id ? "bg-black/20" : "hover:bg-white/5 opacity-80"
              }`}
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-accent font-heading text-xs font-bold text-accent-foreground">
                {a.short}
              </span>
              <span className="leading-tight">
                <span className="block text-[13px]">{a.name}</span>
                <span className="text-[10px] text-accent">
                  {a.status === "ready" ? "● ready" : "idle"} · {a.model}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-3 pt-2 min-h-0 border-t border-white/10">
          <div className="px-2 py-2 text-[10px] uppercase tracking-widest opacity-50">Threads</div>
          {THREADS.map((th) => (
            <Link
              key={th.id}
              href={`/t/${th.id}`}
              className={`flex w-full flex-col rounded-md px-3 py-2 min-h-10 ${
                th.id === threadId ? "bg-black/20" : "hover:bg-white/5"
              }`}
            >
              <span className="text-[13px] leading-tight">{th.t}</span>
              <span className="text-[10px] opacity-50">{th.m}</span>
            </Link>
          ))}
        </div>
        <div className="border-t border-white/10 px-6 py-3 text-xs text-accent">
          <span className="block font-semibold text-primary-foreground">Jordan</span>
          Principal · IC
        </div>
      </aside>

      {/* CONVERSATION — the hero */}
      <section className="flex flex-col min-h-0 border-r bg-background">
        <header className="flex items-center gap-3 border-b px-5 py-3">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent font-heading text-[11px] font-bold text-accent-foreground">
            {activeAgent?.short}
          </span>
          <span className="font-heading text-[15px] font-semibold">{activeAgent?.name}</span>
          {thread && <span className="text-xs text-muted-foreground">· {thread.t}</span>}
          <button
            onClick={() => setIcGrade((v) => !v)}
            className={`ml-auto rounded-md border px-2.5 py-1 font-mono text-[10px] ${
              icGrade ? "border-accent bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
            title="IC-grade vs routine tier (both on Qwen3.7 Flash for now; re-split to premium models later)"
          >
            {icGrade ? "IC-GRADE" : "ROUTINE"}
          </button>
        </header>

        <Conversation className="flex-1 min-h-0">
          <ConversationContent className="mx-auto w-full max-w-2xl">
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
          <div className="mx-auto w-full max-w-2xl">
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
        </div>
      </section>

      {/* ARTIFACT CANVAS — streams the agent's brief when emitted */}
      <section className="flex flex-col min-h-0 bg-card max-lg:hidden">
        <Artifact className="flex h-full flex-col rounded-none border-0">
          <ArtifactHeader>
            <div>
              <ArtifactTitle>{artifact?.title ?? "Weekly IC Briefing"}</ArtifactTitle>
              <ArtifactDescription>{artifact?.ref ?? "EVL-WEEKLY-08092026"}</ArtifactDescription>
            </div>
            <ArtifactActions>
              <ArtifactAction icon={PencilIcon} tooltip="Edit" label="Edit" />
              <ArtifactAction icon={DownloadIcon} tooltip="Export PDF" label="Export PDF" />
            </ArtifactActions>
          </ArtifactHeader>
          <ArtifactContent className="flex-1 overflow-y-auto">
            {artifact ? (
              <MessageResponse>{artifact.body}</MessageResponse>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p className="font-heading text-base font-semibold text-foreground">
                  No artifact yet.
                </p>
                <p className="mt-2">
                  Ask the agent to build the weekly brief. When it produces a structured
                  document, it streams into this canvas — every figure sourced or marked
                  not-obtained, never estimated.
                </p>
              </div>
            )}
          </ArtifactContent>
        </Artifact>
      </section>
    </div>
  );
}
