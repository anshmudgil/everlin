"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
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
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { DownloadIcon, PencilIcon, MenuIcon, XIcon, PanelRightIcon } from "lucide-react";
import { SessionList, SESSIONS } from "@/components/session-list";
import { ThemeToggle } from "@/components/theme-toggle";

// Per-thread artifact cache (module-scoped, survives thread switches within a session).
// Keyed by threadId so switching away and back re-shows a brief that already streamed.
const artifactCache = new Map<string, BriefArtifact>();

// localStorage keys for persisted UI prefs (read in an effect, never at render → no
// hydration mismatch). See docs/specs/ui-canvas-increment.md risk note.
const LS_CANVAS = "everlin.canvasOpen";
const LS_TIER = "everlin.icGrade";

// Kept for backwards-compat: some routes/imports still reference THREADS.
export const THREADS = SESSIONS;

// Minimal HTML escape for values interpolated into the print window.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// One assistant. Both tiers currently run the same model; the toggle flips the
// POST body `mode` so the route can re-split to premium models later.
const ANALYST = { short: "EA", name: "Everlin Analyst" };

// The agent's generated brief becomes an artifact in the canvas. Here it is detected
// from a data part the agent stream can emit (data-artifact); until the model emits one,
// the canvas shows the empty/awaiting state. This is the streaming-artifact seam.
type BriefArtifact = { title: string; ref: string; body: string };

function extractArtifact(
  messages: ReturnType<typeof useChat>["messages"],
): BriefArtifact | null {
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

function SidebarBrand() {
  return (
    <div className="px-6 py-5">
      <div className="font-serif text-lg font-bold tracking-wide text-sidebar-foreground">
        EVERLIN
      </div>
      <div className="text-xs italic text-[var(--sidebar-accent)]">
        Enduring Legacy
      </div>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
      <div className="text-xs">
        <span className="block font-semibold text-sidebar-foreground">Jordan</span>
        <span className="text-sidebar-foreground/60">Principal · IC</span>
      </div>
      <ThemeToggle />
    </div>
  );
}

function SidebarInner({ threadId }: { threadId: string }) {
  return (
    <>
      <SidebarBrand />
      <SessionList activeId={threadId} />
      <SidebarFooter />
    </>
  );
}

export function EverlinWorkspace({ threadId }: { threadId: string }) {
  const [icGrade, setIcGrade] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  // Manual canvas toggle. Default closed; hydrated from localStorage in an effect
  // (render-time localStorage would diverge server/client → hydration mismatch).
  const [canvasManuallyOpen, setCanvasManuallyOpen] = useState(false);
  // key useChat by thread so switching threads is a distinct conversation
  const { messages, sendMessage, status } = useChat({ id: threadId });

  // Live artifact from the stream, else the cached one for this thread. The cache is a
  // module-scoped Map; writing the freshly-streamed artifact to it during render is
  // idempotent (same key/value), so no effect + setState is needed — the derived value
  // is read straight back, and a thread switch reads that thread's cached entry.
  const streamed = extractArtifact(messages);
  if (streamed) artifactCache.set(threadId, streamed);
  const artifact = streamed ?? artifactCache.get(threadId) ?? null;

  // Hydrate persisted prefs after mount via useSyncExternalStore-style read. We keep the
  // SSR/first-client render at the defaults (false) to avoid a hydration mismatch, then
  // apply the stored values on the mount commit through a ref-guarded one-time flip.
  // (Reading localStorage at render or in a plain effect-setState both trip lint/hydration;
  // a mount-only microtask keeps SSR output stable and the render tree honest.)
  const hydratedPrefs = useRef(false);
  useEffect(() => {
    if (hydratedPrefs.current) return;
    hydratedPrefs.current = true;
    let canvas = false;
    let tier = false;
    try {
      canvas = localStorage.getItem(LS_CANVAS) === "1";
      tier = localStorage.getItem(LS_TIER) === "1";
    } catch {}
    // Schedule the state application in a microtask so it lands after the commit,
    // not synchronously inside the effect body (avoids the cascading-render lint).
    queueMicrotask(() => {
      if (canvas) setCanvasManuallyOpen(true);
      if (tier) setIcGrade(true);
    });
  }, []);

  const session = SESSIONS.find((x) => x.id === threadId);
  const streaming = status !== "ready" && status !== "error";

  // Canvas is open when a brief exists OR the user opened it manually.
  const canvasOpen = !!artifact || canvasManuallyOpen;

  const toggleCanvas = useCallback(() => {
    setCanvasManuallyOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(LS_CANVAS, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const toggleTier = useCallback(() => {
    setIcGrade((v) => {
      const next = !v;
      try {
        localStorage.setItem(LS_TIER, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const onSubmit = (msg: PromptInputMessage) => {
    if (!msg.text?.trim()) return;
    sendMessage({ text: msg.text }, { body: { mode: icGrade ? "ic" : "routine" } });
  };

  // Export the brief as a real PDF via the browser's print pipeline (no extra dep):
  // open a clean print window with the doc's rendered HTML + Inter, and invoke print,
  // where the user picks "Save as PDF". The window auto-closes after printing.
  const docRef = useRef<HTMLDivElement>(null);
  const handleExportPdf = useCallback(() => {
    const node = docRef.current;
    if (!node || !artifact) return;
    const w = window.open("", "_blank", "width=820,height=1060");
    if (!w) return;
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${artifact.ref} — ${artifact.title}</title>` +
        `<style>@page{margin:24mm 18mm}` +
        `body{font-family:Inter,system-ui,sans-serif;color:#111;line-height:1.55;font-size:12pt}` +
        `h1{font-size:18pt;margin:0 0 4pt}h2{font-size:13pt;margin:16pt 0 4pt}` +
        `.docid{font-size:9pt;color:#666;margin-bottom:16pt}` +
        `.tabular{font-variant-numeric:tabular-nums}</style></head><body>` +
        `<h1>${escapeHtml(artifact.title)}</h1>` +
        `<div class="docid">${escapeHtml(artifact.ref)}</div>` +
        node.innerHTML +
        `</body></html>`,
    );
    w.document.close();
    w.focus();
    // give the new document a tick to lay out, then print
    w.setTimeout(() => {
      w.print();
      w.close();
    }, 250);
  }, [artifact]);

  return (
    <div
      className={`grid h-dvh max-md:grid-cols-1 bg-background text-foreground transition-[grid-template-columns] duration-300 ease-out ${
        canvasOpen
          ? "grid-cols-[248px_minmax(420px,1fr)_minmax(380px,0.95fr)] max-lg:grid-cols-[248px_1fr]"
          : "grid-cols-[248px_1fr]"
      }`}
    >
      {/* RAIL — sessions, forest green, gold active states */}
      <aside className="flex min-h-0 flex-col border-r border-black/10 bg-sidebar text-sidebar-foreground max-md:hidden">
        <SidebarInner threadId={threadId} />
      </aside>

      {/* MOBILE off-canvas sidebar — transform-only slide, GPU compositor */}
      <AnimatePresence>
        {mobileNav && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileNav(false)}
              style={{ willChange: "opacity" }}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="absolute inset-y-0 left-0 flex w-[260px] flex-col bg-sidebar text-sidebar-foreground shadow-xl"
              style={{ willChange: "transform" }}
            >
              <button
                onClick={() => setMobileNav(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-4 flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-white/10"
              >
                <XIcon className="size-4" />
              </button>
              <SidebarInner threadId={threadId} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* CONVERSATION — the hero, one chatbot */}
      <section className="flex min-h-0 flex-col border-r border-border bg-background">
        <header className="flex items-center gap-3 border-b border-border px-5 py-3">
          <button
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
          >
            <MenuIcon className="size-4" />
          </button>
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            {ANALYST.short}
          </span>
          <span className="text-[15px] font-semibold">{ANALYST.name}</span>
          {session && (
            <span className="truncate text-xs text-muted-foreground max-sm:hidden">
              · {session.t}
            </span>
          )}
          <button
            onClick={toggleTier}
            className={`ml-auto rounded-md border px-2.5 py-1 text-[10px] tracking-wide transition-colors ${
              icGrade
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            title="IC-grade vs routine tier (both on Qwen3.7 Flash for now; re-split to premium models later)"
          >
            {icGrade ? "IC-GRADE" : "ROUTINE"}
          </button>
          <button
            onClick={toggleCanvas}
            aria-pressed={canvasManuallyOpen}
            className={`flex size-8 items-center justify-center rounded-md border transition-colors max-md:hidden ${
              canvasOpen
                ? "border-accent text-accent"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            title={canvasOpen ? "Hide brief canvas" : "Show brief canvas"}
          >
            <PanelRightIcon className="size-4" />
          </button>
        </header>

        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-2xl">
            {messages.length === 0 && (
              <ConversationEmptyState
                title="Brief the Everlin Analyst"
                description="Ask for this week's IC brief, a screening lean, or challenge a call. Every figure is sourced or marked not-obtained."
              />
            )}
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ willChange: "transform, opacity" }}
              >
                <Message from={message.role}>
                  <MessageContent>
                    {message.parts.map((part, i) => {
                      if (part.type === "text") {
                        return (
                          <MessageResponse key={`${message.id}-${i}`}>
                            {part.text}
                          </MessageResponse>
                        );
                      }
                      // tool calls render as a collapsible "retrieving…" panel — the
                      // visible signal that a figure came from a real source, not memory.
                      if (part.type.startsWith("tool-")) {
                        const p = part as {
                          type: `tool-${string}`;
                          state:
                            | "input-streaming"
                            | "input-available"
                            | "output-available"
                            | "output-error";
                          input?: unknown;
                          output?: unknown;
                          errorText?: string;
                        };
                        return (
                          <Tool key={`${message.id}-${i}`}>
                            <ToolHeader type={p.type as `tool-${string}`} state={p.state} />
                            <ToolContent>
                              <ToolInput input={p.input} />
                              <ToolOutput
                                output={p.output as React.ReactNode}
                                errorText={p.errorText}
                              />
                            </ToolContent>
                          </Tool>
                        );
                      }
                      return null;
                    })}
                  </MessageContent>
                </Message>
              </motion.div>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border p-4">
          <div className="mx-auto w-full max-w-2xl">
            <PromptInput onSubmit={onSubmit}>
              <PromptInputBody>
                <PromptInputTextarea placeholder="Reply to the Everlin Analyst… (⏎ send, ⇧⏎ newline)" />
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

      {/* ARTIFACT CANVAS — hidden until a brief streams in or the user opens it. */}
      <AnimatePresence initial={false}>
        {canvasOpen && (
          <motion.section
            key="canvas"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ willChange: "transform, opacity" }}
            className="flex min-h-0 flex-col border-l border-border bg-card max-lg:hidden"
          >
            <Artifact className="flex h-full flex-col rounded-none border-0">
              <ArtifactHeader>
                <div className="min-w-0">
                  <ArtifactTitle className="flex items-center gap-2">
                    {artifact?.title ?? "Weekly IC Briefing"}
                    {streaming && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-normal text-accent">
                        <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                        streaming
                      </span>
                    )}
                  </ArtifactTitle>
                  <ArtifactDescription className="tabular-nums">
                    {artifact?.ref ?? "EVL-WEEKLY-08092026"}
                  </ArtifactDescription>
                </div>
                <ArtifactActions>
                  <ArtifactAction icon={PencilIcon} tooltip="Edit" label="Edit" />
                  <ArtifactAction
                    icon={DownloadIcon}
                    tooltip="Export PDF"
                    label="Export PDF"
                    onClick={handleExportPdf}
                    disabled={!artifact}
                  />
                  <ArtifactAction
                    icon={XIcon}
                    tooltip="Hide canvas"
                    label="Hide canvas"
                    onClick={toggleCanvas}
                  />
                </ArtifactActions>
              </ArtifactHeader>
              <ArtifactContent className="flex-1 overflow-y-auto scroll-smooth">
                {artifact ? (
                  // Styled, scrollable document view. Print target for Export-PDF.
                  <article
                    ref={docRef}
                    className="mx-auto max-w-prose leading-relaxed [&_h1]:mt-0 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_p]:my-3 [&_.tabular]:tabular-nums"
                  >
                    <MessageResponse>{artifact.body}</MessageResponse>
                  </article>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <p className="text-base font-semibold text-foreground">No artifact yet.</p>
                    <p className="mt-2">
                      Ask the analyst to build the weekly brief. When it produces a structured
                      document, it streams into this canvas — every figure sourced or marked
                      not-obtained, never estimated.
                    </p>
                  </div>
                )}
              </ArtifactContent>
            </Artifact>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
