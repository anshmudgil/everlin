"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useChat } from "@ai-sdk/react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FileUIPart } from "ai";
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
  PromptInputProvider,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputButton,
  usePromptInputController,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
} from "@/components/ai-elements/attachments";
import {
  Suggestion,
  Suggestions,
} from "@/components/ai-elements/suggestion";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
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
import {
  DownloadIcon,
  PencilIcon,
  MenuIcon,
  XIcon,
  PanelRightIcon,
  PaperclipIcon,
  SparklesIcon,
  WrenchIcon,
} from "lucide-react";
import { SessionList, SESSIONS } from "@/components/session-list";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  AutomationsBoard,
  AutomationsRailList,
} from "@/components/automations-panel";
import { getAutomation, type Automation } from "@/lib/everlin/automations";
import {
  SKILL_CHIPS,
  SKILL_COMMANDS,
  filterSkillCommands,
  type SkillCommand,
} from "@/lib/everlin/skill-commands";

// Per-thread artifact cache (module-scoped, survives thread switches within a session).
// Keyed by threadId so switching away and back re-shows a brief that already streamed.
const artifactCache = new Map<string, BriefArtifact>();

// localStorage keys for persisted UI prefs (read in an effect, never at render → no
// hydration mismatch). See docs/specs/ui-canvas-increment.md risk note.
const LS_CANVAS = "everlin.canvasOpen";

export type RailTab = "sessions" | "automations";

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

function RailTabs({
  value,
  onChange,
}: {
  value: RailTab;
  onChange: (tab: RailTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Workspace sections"
      className="mx-3 mb-1 grid grid-cols-2 gap-1 rounded-md bg-black/20 p-1"
    >
      {(["sessions", "automations"] as const).map((tab) => {
        const selected = value === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab)}
            className={`rounded px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors ${
              selected
                ? "bg-[var(--sidebar-accent)]/20 text-[var(--sidebar-accent)]"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
            }`}
          >
            {tab === "sessions" ? "Sessions" : "Automations"}
          </button>
        );
      })}
    </div>
  );
}

function SidebarInner({
  threadId,
  railTab,
  onRailTab,
  selectedAutomationId,
  onSelectAutomation,
  onRunAutomation,
  onOpenAutomation,
}: {
  threadId: string;
  railTab: RailTab;
  onRailTab: (tab: RailTab) => void;
  selectedAutomationId: string | null;
  onSelectAutomation: (a: Automation) => void;
  onRunAutomation: (a: Automation) => void;
  onOpenAutomation: (a: Automation) => void;
}) {
  return (
    <>
      <SidebarBrand />
      <RailTabs value={railTab} onChange={onRailTab} />
      {railTab === "sessions" ? (
        <SessionList activeId={threadId} />
      ) : (
        <AutomationsRailList
          selectedId={selectedAutomationId}
          onSelect={onSelectAutomation}
          onRun={onRunAutomation}
          onOpen={onOpenAutomation}
        />
      )}
      <SidebarFooter />
    </>
  );
}

// Paperclip attach button + selected-file chips. Lives inside PromptInputProvider
// so it can read/mutate the shared attachments context. Files added here flow into
// PromptInput's onSubmit as FileUIPart[] (blob→data URL conversion is handled there).
function AttachControls() {
  const attachments = usePromptInputAttachments();
  return (
    <>
      {attachments.files.length > 0 && (
        <Attachments variant="inline" className="px-1 pb-2">
          {attachments.files.map((file) => (
            <Attachment
              key={file.id}
              data={file}
              onRemove={() => attachments.remove(file.id)}
            >
              <AttachmentPreview />
              <AttachmentInfo />
              <AttachmentRemove />
            </Attachment>
          ))}
        </Attachments>
      )}
      <PromptInputButton
        onClick={() => attachments.openFileDialog()}
        tooltip="Attach a file"
        aria-label="Attach a file"
      >
        <PaperclipIcon className="size-4" />
      </PromptInputButton>
    </>
  );
}

// The full chat composer: controlled textarea (via PromptInputProvider), a "/"
// slash-command menu shown when the input starts with "/", a skills picker, a
// file-attach button, and the submit button.
function Composer({
  status,
  onSubmit,
  draftPrompt,
  onDraftConsumed,
}: {
  status: ReturnType<typeof useChat>["status"];
  onSubmit: (msg: PromptInputMessage) => void;
  draftPrompt: string | null;
  onDraftConsumed: () => void;
}) {
  const controller = usePromptInputController();
  const value = controller.textInput.value;
  const [skillsOpen, setSkillsOpen] = useState(false);

  // Show the command menu only when the user types "/" at the start of the input.
  // Trailing filter after the slash narrows the list (e.g. "/we" → Weekly).
  const slashOpen = value.startsWith("/");
  const filter = slashOpen ? value.slice(1).toLowerCase() : "";
  const filtered = slashOpen ? filterSkillCommands(filter) : SKILL_COMMANDS;
  const showMenu = (slashOpen && filtered.length > 0) || skillsOpen;
  const list = skillsOpen && !slashOpen ? SKILL_COMMANDS : filtered;

  const setInput = controller.textInput.setInput;

  const pickCommand = (c: SkillCommand) => {
    // Fill the real skill prompt (not just "/brief ") so sending it hits planSkills.
    setInput(c.prompt);
    setSkillsOpen(false);
  };

  useEffect(() => {
    if (!draftPrompt) return;
    setInput(draftPrompt);
    onDraftConsumed();
  }, [draftPrompt, onDraftConsumed, setInput]);

  return (
    <Popover
      open={showMenu}
      onOpenChange={(open) => {
        if (!open) setSkillsOpen(false);
      }}
    >
      <PopoverAnchor asChild>
        <PromptInput onSubmit={onSubmit} multiple>
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Message the assistant…  (⏎ send, / skills)"
              onKeyDown={(e) => {
                // Esc closes the slash menu by clearing the leading slash.
                if (e.key === "Escape" && slashOpen) {
                  e.preventDefault();
                  controller.textInput.setInput("");
                }
                if (e.key === "Escape" && skillsOpen) {
                  e.preventDefault();
                  setSkillsOpen(false);
                }
              }}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <AttachControls />
            <PromptInputButton
              onClick={() => setSkillsOpen((v) => !v)}
              tooltip="Skills"
              aria-label="Open skills"
              aria-expanded={skillsOpen}
              className={skillsOpen ? "text-accent" : undefined}
            >
              <SparklesIcon className="size-4" />
            </PromptInputButton>
            <PromptInputSubmit status={status} />
          </PromptInputFooter>
        </PromptInput>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        side="top"
        className="w-80 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList className="max-h-80">
            <CommandGroup heading="Skills">
              {list.map((c) => (
                <CommandItem
                  key={c.cmd}
                  value={c.cmd}
                  onSelect={() => pickCommand(c)}
                >
                  <span className="font-medium">{c.cmd}</span>
                  <span className="ml-2 text-muted-foreground">{c.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function EverlinWorkspace({ threadId }: { threadId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileNav, setMobileNav] = useState(false);
  const [railTab, setRailTab] = useState<RailTab>("sessions");
  const [selectedAutomationId, setSelectedAutomationId] = useState<string | null>(
    null,
  );
  const [draftPrompt, setDraftPrompt] = useState<string | null>(null);
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
    try {
      canvas = localStorage.getItem(LS_CANVAS) === "1";
    } catch {}
    // Schedule the state application in a microtask so it lands after the commit,
    // not synchronously inside the effect body (avoids the cascading-render lint).
    queueMicrotask(() => {
      if (canvas) setCanvasManuallyOpen(true);
    });
  }, []);

  const runConsumed = useRef(false);
  useEffect(() => {
    const view = searchParams.get("view");
    const run = searchParams.get("run");
    if (view === "automations" && !run) {
      queueMicrotask(() => setRailTab("automations"));
    }
    if (!run || runConsumed.current) return;
    const auto = getAutomation(run);
    if (!auto) return;
    runConsumed.current = true;
    queueMicrotask(() => {
      setRailTab("sessions");
      setSelectedAutomationId(auto.id);
      sendMessage({ text: auto.prompt });
      router.replace(`/t/${threadId}`, { scroll: false });
    });
  }, [searchParams, threadId, router, sendMessage]);

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

  const onSubmit = (msg: PromptInputMessage) => {
    if (!msg.text?.trim() && (!msg.files || msg.files.length === 0)) return;
    // AI SDK v7: sendMessage accepts { text, files } where files is FileUIPart[].
    // PromptInput has already converted attachment blob URLs to data URLs, so the
    // file parts are self-contained and travel with the message to the route.
    setRailTab("sessions");
    sendMessage({
      text: msg.text ?? "",
      files: msg.files as FileUIPart[] | undefined,
    });
  };

  const consumeDraft = useCallback(() => setDraftPrompt(null), []);

  const selectAutomation = useCallback((a: Automation) => {
    setSelectedAutomationId(a.id);
    setRailTab("automations");
  }, []);

  const runAutomation = useCallback(
    (a: Automation) => {
      // Fresh thread so a demo Run doesn't append onto an existing session.
      router.push(`/t/session-${Date.now().toString(36)}?run=${a.id}`);
    },
    [router],
  );

  const openAutomation = useCallback((a: Automation) => {
    setSelectedAutomationId(a.id);
    setDraftPrompt(a.prompt);
    setRailTab("sessions");
    setMobileNav(false);
  }, []);

  const sendSkill = useCallback(
    (prompt: string) => {
      setRailTab("sessions");
      sendMessage({ text: prompt });
    },
    [sendMessage],
  );

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

  const sidebarProps = {
    threadId,
    railTab,
    onRailTab: setRailTab,
    selectedAutomationId,
    onSelectAutomation: selectAutomation,
    onRunAutomation: runAutomation,
    onOpenAutomation: openAutomation,
  };

  return (
    <div
      className={`grid h-dvh max-md:grid-cols-1 bg-background text-foreground transition-[grid-template-columns] duration-300 ease-out ${
        canvasOpen
          ? "grid-cols-[248px_minmax(420px,1fr)_minmax(380px,0.95fr)] max-lg:grid-cols-[248px_1fr]"
          : "grid-cols-[248px_1fr]"
      }`}
    >
      {/* RAIL — sessions + automations, forest green, gold active states */}
      <aside className="flex min-h-0 flex-col border-r border-black/10 bg-sidebar text-sidebar-foreground max-md:hidden">
        <SidebarInner {...sidebarProps} />
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
              <SidebarInner {...sidebarProps} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* CONVERSATION — the hero, one chatbot; Automations tab swaps the list in-place */}
      <section className="flex min-h-0 flex-col border-r border-border bg-background">
        <header className="flex items-center gap-3 border-b border-border px-5 py-3">
          <button
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
          >
            <MenuIcon className="size-4" />
          </button>
          <span className="text-[15px] font-semibold">
            {railTab === "automations" ? "Automations" : "Assistant"}
          </span>
          {railTab === "sessions" && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <WrenchIcon className="size-3" />
              tools
              <SparklesIcon className="size-3" />
              skills
            </span>
          )}
          <button
            onClick={toggleCanvas}
            aria-pressed={canvasManuallyOpen}
            className={`ml-auto flex size-8 items-center justify-center rounded-md border transition-colors max-md:hidden ${
              canvasOpen
                ? "border-accent text-accent"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            title={canvasOpen ? "Hide brief canvas" : "Show brief canvas"}
          >
            <PanelRightIcon className="size-4" />
          </button>
        </header>

        {railTab === "automations" ? (
          <AutomationsBoard
            selectedId={selectedAutomationId}
            onSelect={selectAutomation}
            onRun={runAutomation}
            onOpen={openAutomation}
          />
        ) : (
          <Conversation className="min-h-0 flex-1">
            <ConversationContent className="mx-auto w-full max-w-2xl">
              {messages.length === 0 && (
                <ConversationEmptyState>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h3 className="font-medium text-sm">How can I help?</h3>
                      <p className="text-muted-foreground text-sm">
                        Ask anything, type / for skills, or pick a chip. Tool calls show in the thread.
                      </p>
                    </div>
                    <Suggestions className="justify-center px-1">
                      {SKILL_CHIPS.map((c) => (
                        <Suggestion
                          key={c.cmd}
                          suggestion={c.prompt}
                          onClick={(prompt) => sendSkill(prompt)}
                        >
                          {c.label}
                        </Suggestion>
                      ))}
                    </Suggestions>
                  </div>
                </ConversationEmptyState>
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
                            <Tool key={`${message.id}-${i}`} defaultOpen>
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
        )}

        <div className="border-t border-border p-4">
          <div className="mx-auto w-full max-w-2xl">
            <PromptInputProvider>
              <Composer
                status={status}
                onSubmit={onSubmit}
                draftPrompt={draftPrompt}
                onDraftConsumed={consumeDraft}
              />
            </PromptInputProvider>
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
