# Spec — UI increment: conditional canvas + PDF + Inter + streaming/state

**Status:** approved (decisions locked 2026-09-10). Build now.
**Base:** commits c9ba0a1 + 9feb1ce + 289cb31 (clean, green).
**Out of scope this increment:** LangGraph brief orchestration + WorldMonitor data (next session,
own specs). This is the FRONTEND slice only.

## Decisions (locked)
- **Font:** Inter everywhere. Remove Fraunces (serif) + IBM Plex Mono roles; all text = Inter.
- **PDF:** in-canvas = styled, smooth-scroll HTML doc view. Export-PDF button downloads a real PDF.
- **Canvas:** hidden by default (2-col, chat-focused). Pops out (3-col, animated) when a brief
  artifact streams in OR the user clicks a toggle. Closable back to hidden.

## Changes
### 1. Conditional canvas (everlin-workspace.tsx)
- Add `canvasOpen` state. Derived-open = `!!artifact || canvasManuallyOpen`.
- Grid template switches: closed → `[248px_1fr]` (2-col); open → the current 3-col.
- Animate the canvas column in/out (motion width/opacity or an AnimatePresence panel) — GPU
  transform, no layout thrash.
- A toggle button in the conversation header ("Show brief" / "Hide brief") flips manual open.
- When a brief artifact arrives, auto-open (set derived-open true). User can still close it.

### 2. Styled doc view + Export-PDF (canvas body)
- Replace the plain `<MessageResponse>{artifact.body}` with a styled, scrollable document
  component (readable measure, heading styles, tabular-nums figures). Smooth scroll.
- Wire the existing Export-PDF button: generate a real PDF from the brief and trigger download.
  Use a client PDF lib (react-to-print/print-to-pdf, or @react-pdf/renderer). Verify a file
  actually downloads.

### 3. Inter everywhere (layout.tsx + globals.css + components)
- layout.tsx: drop Fraunces + IBM_Plex_Mono imports/vars; keep only Inter as `--font-sans`
  (and point `--font-serif`/`--font-mono` at Inter, or remove their usages).
- Replace `font-serif` / `font-mono` classNames in components (workspace title, brand, doc-ids,
  ROUTINE badge) with Inter/default. tabular-nums stays for figures.

### 4. State + cache (light, this increment)
- Persist the manual canvas-open preference + IC/routine toggle to localStorage (survives reload).
- Cache the last artifact per thread so switching threads and back doesn't lose the brief
  (in-memory map keyed by threadId; the canvas reads from it).

### 5. Streaming polish
- Show a streaming indicator in the canvas while a brief is being produced (status !== ready).
- Smooth-append streamed artifact body (no jarring reflow).
- (Queue: the AI SDK already serialises a turn; a real request queue belongs with the LangGraph
  brief job — deferred to that spec. Note it, don't fake it here.)

## Acceptance criteria (verify in the real browser)
1. Fresh load, no brief → canvas HIDDEN, layout is 2-col chat-focused. Screenshot.
2. Click the canvas toggle → canvas animates open (3-col); click again → animates closed. Screenshot both.
3. Ask for a brief → when the artifact streams, canvas auto-opens with the styled doc. Screenshot.
4. Export-PDF → a real .pdf file downloads (confirm file exists + opens). State the file.
5. All visible text is Inter — no serif titles, no mono doc-ids. Screenshot; confirm computed font-family.
6. Reload → manual canvas + IC/routine prefs persist (localStorage). 
7. Switch thread away and back → the brief artifact is still shown (per-thread cache).
8. Streaming a brief shows an in-canvas progress indicator. 
9. typecheck + lint clean; no console errors (esp. no new hydration mismatch — localStorage reads
   must be effect-guarded, not render-time).

## Risks / notes
- localStorage at render → hydration mismatch (the bug we just fixed). Read it in useEffect, not render.
- Export-PDF lib adds a dependency — justify it; verify it works, don't assume.
- Streaming a "PDF" live is awkward; that's why in-canvas is HTML doc, PDF is export-only. Correct call.
