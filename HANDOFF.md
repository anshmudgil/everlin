# Everlin — Session Handoff (2026-09-08)

## What this project is
Everlin Family Office AI agent platform. Consulting build against a 42-section RFP
(`~/Desktop/_Archive/Everlin/Everlin AI Agent Brief v3 CM.docx`, + 4 example morning
briefs as golden references). Two agents (Investment + Property) + shared intelligence
layer. Fixes: hallucination, inconsistent reasoning, weak data viz. Full plan +
tickets in `~/Documents/Repos/.claude/prds/everlin-agents.md` and
`.claude/epics/everlin-phase1/`. "Multi-tenant" = multi-STAFF (RBAC by role), NOT multi-org.

## Where the code is
`~/Documents/Repos/everlin` — Next.js 16 + React 19 + Tailwind 4 + shadcn (radix/nova)
+ Vercel AI Elements + AI SDK (`ai@7`, `@ai-sdk/react@4`). Git repo, latest SHA 067a47b.

## What works (verified live, not assumed)
- **Chat**: `/api/chat` streams via **Vercel AI Gateway**, model **`alibaba/qwen3.7-flash`**
  (cheapest non-Anthropic chat model; routine/ic toggle both point here — re-split to
  premium is one line in `route.ts` MODELS).
- **Agent-native UI**: `app/t/[id]` thread routing, root redirects to `/t/weekly-08sep`.
  Rail (agent switcher + threads) | conversation (hero) | artifact canvas.
  `components/everlin-workspace.tsx` is the shared workspace.
- **E2 retrieval + attribution (anti-hallucination core)**: `lib/data-sources.ts` —
  SEC EDGAR (`getCompanyFinancial`, us-gaap concepts, US-listed only) + US Treasury
  (`getTreasuryRate`). Every figure is a `Fact{value,source,sourceUrl,asOf}` or explicit
  not-obtained. Verified: agent retrieves NVDA FY2026 revenue $215.938B [SEC EDGAR],
  Treasury 3.788% [US Treasury], cites sources, refuses to fabricate.
- Behaviour standards (spec §6) live in the system prompt — agent holds position,
  labels opinion vs fact, escalates GREEN/AMBER/RED, marks not-obtained.

## Deployed
- Prod (public, OLDER build, no E2): https://everlin.vercel.app
- Latest preview (E2 retrieval, Deployment-Protection gated — opens for logged-in Vercel user):
  https://everlin-9lr5ceq73-ansh-velocity.vercel.app
- Vercel project: ansh-velocity/everlin. `vercel deploy` = preview, `--prod` = production.

## Open / next work (priority order)
1. **AU data source** — EDGAR is US-only; Everlin is AU-focused. Agent says "not obtained"
   for CBA/BHP etc. Need ASX/CoreLogic/RBA retrieval for real coverage. Biggest gap.
2. **Artifact-publish tool** — agent should stream a full structured brief into the canvas
   (the `data-artifact` seam is wired client-side in everlin-workspace.tsx `extractArtifact`;
   route needs a tool that emits `writer.write({type:'data-artifact',...})` via
   `createUIMessageStream`).
3. **Property agent** — currently UI-only; needs its own route/prompt + property data.
4. **Promote E2 to prod** so everlin.vercel.app serves the retrieval build.
5. Model quality: qwen-flash leaks its reasoning into output; premium re-split or a
   "no meta-commentary" prompt nudge.

## ⚠ SECURITY — MUST DO
Three secrets were pasted into the chat transcript and are exposed — ROTATE:
1. AI Gateway key `vck_...` (in `.env.local`, gitignored)
2. Vercel token `vcp_...`
3. `VERCEL_OIDC_TOKEN` (auto-written to `.env.local` on link; re-link rotates)
`.env.local` is gitignored — verified no key is in any tracked file (`git grep vck_` clean).

## Next-session opening prompt (paste one)

### Recommended — spec-first + matt's research (AU data has ToS landmines)
```
Read HANDOFF.md first. Next task: wire an Australian market-data source so the
Investment Analyst retrieves real ASX/AU figures (EDGAR is US-only, so it says
"not obtained" for CBA/BHP etc.).

Use matt's research skill to scope the AU data landscape before coding: which
sources (ASX, RBA, ABS, CoreLogic, realestate.com.au), free vs licensed, ToS
limits, auth. Then write a short spec with acceptance criteria (repo has no spec/
yet; the process contract wants spec -> plan -> increments -> verify), get my
approval on the plan, then build it as a new Fact-returning tool in
lib/data-sources.ts following the existing EDGAR pattern. Verify with a real live
tool call (same as the EDGAR/Treasury tests). Then /ship.
```

### Fast variant — skip spec, just add the tool
```
Read HANDOFF.md. Add an AU data tool to lib/data-sources.ts: RBA cash rate + a
free ASX price source, returning Fact{value,source,sourceUrl,asOf} like the EDGAR
tool. Wire as getAuMarketData in route.ts. Verify with a live tool call. Commit.
```

### gstack interview variant — let it prioritise with me first
```
Read HANDOFF.md, then run /office-hours to interview me on what to build next
across the open work (AU data source, artifact-publish tool, Property agent,
promote-to-prod). Then spec + build the top pick.
```

FIRST THING EITHER WAY: rotate the exposed secrets (see Security section above).

## Conventions / gotchas
- Verify AI SDK APIs against `node_modules/ai/docs/`, never memory (v7 changed hooks/route).
- Next 16 injected its own `AGENTS.md` (breaking-changes notice) — dynamic route params are
  Promise on server; this app uses client `useParams()` so it's sync.
- ai-elements generated 3 type errors vs ai@7 (`LanguageModelUsage` drift) — already fixed
  in `context.tsx`/`agent.tsx`.
- Commit hook blocks `Co-Authored-By` trailers (CLAUDE.md #2078) — don't add them.
- Canonical repo rule is ~/Projects; Ansh explicitly put this in ~/Documents/Repos.
