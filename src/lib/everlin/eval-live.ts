/**
 * Live gateway eval (Track B): proves the model actually invokes the
 * plan -> calc -> narrate loop end to end against the real AI Gateway.
 *
 * Run against a running dev server:
 *   BASE=http://localhost:3141 npx tsx src/lib/everlin/eval-live.ts
 *
 * Asserts, from the real /api/chat SSE stream, that for a fee-bearing deal
 * prompt the model:
 *   1. called planSkills (routed the request), and
 *   2. called a deterministic fee calculator (calcFeeDrag or calcFeeDecomposition), and
 *   3. that calculator returned a calcKey (the number is traceable, not guessed).
 * Exits non-zero if the loop did not happen.
 */
const BASE = process.env.BASE ?? "http://localhost:3141";

const PROMPT =
  "Screen this inbound deal: a private equity fund charging 4% management and " +
  "40% carry (carry annual-equivalent ~2.5%), plus 0.3% admin. What's the all-in " +
  "fee load and does it breach our ceiling? Plan the skills first, then compute — " +
  "do not estimate the fee yourself.";

type ToolSeen = { name: string; hasCalcKey: boolean; output?: unknown };

async function main() {
  const body = {
    messages: [{ id: "1", role: "user", parts: [{ type: "text", text: PROMPT }] }],
    mode: "ic",
  };

  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    console.error(`FAIL: /api/chat returned HTTP ${res.status}`);
    process.exit(1);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  const tools: ToolSeen[] = [];

  // The AI SDK UI-message stream is SSE lines of `data: {json}`. We scan every
  // JSON chunk for tool-call names and any embedded calcKey.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
  }

  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("data:")) continue;
    const payload = t.slice(5).trim();
    if (payload === "[DONE]" || !payload) continue;
    let obj: unknown;
    try { obj = JSON.parse(payload); } catch { continue; }
    const s = JSON.stringify(obj);
    // Real AI SDK v7 UI-stream shape: tool frames carry a `toolName` field
    // (tool-input-start / tool-input-available / tool-output-available).
    const m = s.match(/"toolName"\s*:\s*"([a-zA-Z]+)"/);
    if (m) {
      const name = m[1];
      const hasCalcKey = /"calcKey"\s*:\s*"[A-Z0-9][A-Z0-9\-_]{2,}"/.test(s);
      tools.push({ name, hasCalcKey });
    }
  }

  const names = [...new Set(tools.map((t) => t.name))];
  const planned = names.includes("planSkills");
  const calcName = ["calcFeeDrag", "calcFeeDecomposition"].find((n) => names.includes(n));
  const calcKeyReturned = tools.some(
    (t) => (t.name === "calcFeeDrag" || t.name === "calcFeeDecomposition") && t.hasCalcKey,
  );
  // calcKey may arrive in a separate output frame; also scan the whole stream.
  const calcKeyAnywhere = /"calcKey"\s*:\s*"(?:FEE_DRAG|FEE_DECOMP)-[0-9A-F]{8}"/.test(raw);

  console.log("tools invoked:", names.length ? names.join(", ") : "(none)");
  console.log(`  planSkills called:            ${planned}`);
  console.log(`  fee calculator called:        ${calcName ?? false}`);
  console.log(`  calcKey returned by tool:     ${calcKeyReturned || calcKeyAnywhere}`);

  const ok = planned && !!calcName && (calcKeyReturned || calcKeyAnywhere);
  if (!ok) {
    console.error(
      "\nFAIL: the plan -> calc -> narrate loop did not fully occur.\n" +
      "(Model tool-choice is probabilistic; re-run, or inspect the raw stream. " +
      "First 600 chars of stream below.)\n" + raw.slice(0, 600),
    );
    process.exit(1);
  }
  console.log("\nPASS: model routed via planSkills and computed the fee deterministically with a calcKey.");
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
