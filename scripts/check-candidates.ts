// Tests the NEW models we want to adopt, to confirm they actually work on
// Together's SERVERLESS inference API and (for the screenshot→code use case)
// accept image input. Each candidate is paired with the old model it would
// replace. Run:
//
//   node --env-file=.env scripts/check-candidates.ts

export {};

const COMPLETIONS_URL = "https://api.together.xyz/v1/chat/completions";
const PER_REQUEST_TIMEOUT_MS = 45_000;
const CONCURRENCY = 4;

const API_KEY = process.env.TOGETHER_API_KEY;
if (!API_KEY) {
  console.error(
    "✗ TOGETHER_API_KEY not found. Run with: node --env-file=.env scripts/check-candidates.ts",
  );
  process.exit(2);
}

// 1x1 transparent PNG — good enough to test whether the API accepts an image
// content part (vision-capable) vs. rejects it (text-only model).
const PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

interface Candidate {
  label: string;
  value: string;
  replaces: string;
  needsVision: boolean;
}

const CANDIDATES: Candidate[] = [
  {
    label: "GLM 5.2",
    value: "zai-org/GLM-5.2",
    replaces: "zai-org/GLM-5 / zai-org/GLM-5.1",
    needsVision: false,
  },
  {
    label: "MiniMax M3",
    value: "MiniMaxAI/MiniMax-M3",
    replaces: "MiniMaxAI/MiniMax-M2.7",
    needsVision: false,
  },
  {
    label: "Kimi K2.6",
    value: "moonshotai/Kimi-K2.6",
    replaces: "moonshotai/Kimi-K2.5 (screenshot→code)",
    needsVision: true,
  },
  {
    label: "Kimi K2.7-Code",
    value: "moonshotai/Kimi-K2.7-Code",
    replaces: "moonshotai/Kimi-K2.5 (code path)",
    needsVision: true,
  },
];

type Verdict = "OK" | "NON_SERVERLESS" | "NO_VISION" | "ERROR" | "TIMEOUT" | "NETWORK";

interface Probe {
  verdict: Verdict;
  status: number | null;
  ms: number;
  detail: string;
  reply: string;
}

function classifyText(status: number, text: string): Verdict {
  const t = text.toLowerCase();
  if (status === 200) return "OK";
  if (/non-serverless model|requires? a dedicated endpoint|create and start a new dedicated endpoint/i.test(t))
    return "NON_SERVERLESS";
  if (/deprecat|decommission|discontinued|no longer|retired|model not found|unknown model|does not exist|has been removed/i.test(t))
    return "ERROR";
  if (status >= 500) return "ERROR";
  return "ERROR";
}

function classifyVision(status: number, text: string): Verdict {
  const t = text.toLowerCase();
  if (status === 200) return "OK";
  if (/non-serverless model|requires? a dedicated endpoint|create and start a new dedicated endpoint/i.test(t))
    return "NON_SERVERLESS";
  // Text-only models reject image content with messages like:
  // "model does not support image input" / "no vision support" / "multimodal"
  if (/image|vision|multimodal|does not support|not supported|unable to process|invalid.*content|expected a string/i.test(t))
    return "NO_VISION";
  if (status >= 500) return "ERROR";
  return "ERROR";
}

function shortDetail(text: string): string {
  try {
    const j = JSON.parse(text);
    const msg = j?.error?.message ?? j?.message ?? j?.error;
    if (typeof msg === "string" && msg.trim()) return msg.trim().slice(0, 200);
  } catch {
    /* not json */
  }
  return text.trim().slice(0, 200);
}

async function probe(
  model: string,
  body: Record<string, unknown>,
  classify: (s: number, t: string) => Verdict,
): Promise<Probe> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PER_REQUEST_TIMEOUT_MS);
  const start = performance.now();
  try {
    const res = await fetch(COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    const text = await res.text();
    const ms = Math.round(performance.now() - start);
    const verdict = classify(res.status, text);
    let reply = "";
    if (verdict === "OK") {
      try {
        reply = JSON.parse(text)?.choices?.[0]?.message?.content?.trim() ?? "";
      } catch {
        /* ignore */
      }
    }
    return {
      verdict,
      status: res.status,
      ms,
      detail: verdict === "OK" ? "" : shortDetail(text),
      reply: reply.slice(0, 40),
    };
  } catch (e) {
    const ms = Math.round(performance.now() - start);
    return {
      verdict: (e as Error).name === "AbortError" ? "TIMEOUT" : "NETWORK",
      status: null,
      ms,
      detail: (e as Error).message.slice(0, 200),
      reply: "",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (t: T, i: number) => Promise<R>,
): Promise<R[]> {
  const ret = new Array<R>(items.length);
  let idx = 0;
  const worker = async () => {
    while (idx < items.length) {
      const cur = idx++;
      ret[cur] = await fn(items[cur], cur);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return ret;
}

console.log(
  `Testing ${CANDIDATES.length} candidate models (text + vision probes, concurrency ${CONCURRENCY})…\n`,
);

const results = await mapLimit(CANDIDATES, CONCURRENCY, async (c) => {
  const textBody = {
    model: c.value,
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
    max_tokens: 8,
    temperature: 0.2,
    stream: false,
  };
  const visionBody = {
    model: c.value,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this image in one short word." },
          { type: "image_url", image_url: { url: PIXEL_PNG } },
        ],
      },
    ],
    max_tokens: 16,
    temperature: 0.2,
    stream: false,
  };

  const text = await probe(c.value, textBody, classifyText);
  // Only run the vision probe if the model is reachable serverless at all.
  const vision = text.verdict === "NON_SERVERLESS"
    ? { verdict: "NON_SERVERLESS" as Verdict, status: null, ms: 0, detail: "(skipped: non-serverless)", reply: "" }
    : c.needsVision
      ? await probe(c.value, visionBody, classifyVision)
      : { verdict: "OK" as Verdict, status: null, ms: 0, detail: "(not required)", reply: "" };

  return { c, text, vision };
});

const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);
const sym: Record<Verdict, string> = {
  OK: "✓",
  NON_SERVERLESS: "⊘",
  NO_VISION: "○",
  ERROR: "✗",
  TIMEOUT: "⏱",
  NETWORK: "⚠",
};

console.log(pad("Candidate", 16), pad("text", 14), pad("vision", 14), "replaces");
console.log("-".repeat(90));
for (const r of results) {
  const tStatus = r.text.status ? ` ·${r.text.status}` : "";
  const vStatus = r.vision.status ? ` ·${r.vision.status}` : "";
  console.log(
    `${pad(r.c.label, 16)} ${sym[r.text.verdict]} ${pad(r.text.verdict, 12)}${tStatus} ${sym[r.vision.verdict]} ${pad(r.vision.verdict, 12)}${vStatus} ${r.c.replaces}`,
  );
  if (r.text.detail) console.log(`    text:   ${r.text.detail}`);
  if (r.text.reply) console.log(`    reply:  "${r.text.reply}"`);
  if (r.vision.detail && r.vision.verdict !== "OK") console.log(`    vision: ${r.vision.detail}`);
  if (r.vision.reply) console.log(`    vision reply: "${r.vision.reply}"`);
}

// --- Verdict ---------------------------------------------------------------

const ready = results.filter(
  (r) => r.text.verdict === "OK" && (!r.c.needsVision || r.vision.verdict === "OK"),
);
const partial = results.filter(
  (r) => r.text.verdict === "OK" && r.c.needsVision && r.vision.verdict !== "OK",
);
const notReady = results.filter((r) => r.text.verdict !== "OK");

console.log("\n── Verdict ─────────────────────────────────────────────");
if (ready.length) {
  console.log("✓ Serverless-ready (text + vision where needed):");
  for (const r of ready) console.log(`   • ${r.c.label}  (${r.c.value})`);
}
if (partial.length) {
  console.log("○ Serverless text-only (NO vision — NOT a valid screenshot→code replacement):");
  for (const r of partial) console.log(`   • ${r.c.label}  (${r.c.value})`);
}
if (notReady.length) {
  console.log("✗ Not available as serverless:");
  for (const r of notReady) console.log(`   • ${r.c.label}  (${r.c.value}) — ${r.text.verdict}`);
}

process.exit(notReady.length ? 1 : 0);