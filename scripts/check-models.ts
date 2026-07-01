// Local smoke-test: are the models on the homepage still served by Together's
// SERVERLESS inference API? Pings each model with a tiny completion request and
// cross-checks the /v1/models catalog, so we can tell apart:
//   - WORKS          → 200, serverless call succeeds
//   - NON_SERVERLESS → model exists but requires a dedicated endpoint
//                      ("Unable to access non-serverless model …")
//   - DEPRECATED     → removed from the catalog / explicit deprecation / 404
//   - (transient)    → AUTH_ERROR / RATE_LIMITED / SERVER_ERROR / TIMEOUT / NETWORK
//
// Run:
//   node --env-file=.env scripts/check-models.ts
// (Node 23.6+ runs .ts/.mts directly via type stripping; this repo's Node is 26.)

import { MODELS, resolveModel } from "../lib/constants.ts";

const API_BASE = "https://api.together.xyz/v1";
const COMPLETIONS_URL = `${API_BASE}/chat/completions`;
const MODELS_URL = `${API_BASE}/models`;
const PER_REQUEST_TIMEOUT_MS = 45_000;
const CONCURRENCY = 5;
const RETRIES = 1; // retry transient failures once

const API_KEY = process.env.TOGETHER_API_KEY;
if (!API_KEY) {
  console.error(
    "✗ TOGETHER_API_KEY not found. Run with: node --env-file=.env scripts/check-models.ts",
  );
  process.exit(2);
}

type Outcome =
  | "WORKS"
  | "NON_SERVERLESS"
  | "DEPRECATED"
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "TIMEOUT"
  | "NETWORK"
  | "ERROR";

interface Result {
  label: string;
  model: string; // value as shown on the homepage
  resolved: string; // what actually gets sent after resolveModel()
  source: "homepage" | "internal";
  hidden: boolean;
  listed: boolean | null; // present in /v1/models catalog (null if catalog fetch failed)
  outcome: Outcome;
  status: number | null;
  ms: number;
  reply: string;
  detail: string;
}

function classify(status: number, bodyText: string): Outcome {
  const t = bodyText.toLowerCase();
  if (status === 200) return "WORKS";
  if (status === 401 || status === 403) return "AUTH_ERROR";
  if (status === 429) return "RATE_LIMITED";
  if (
    /non-serverless model|requires? a dedicated endpoint|create and start a new dedicated endpoint/i.test(
      t,
    )
  ) {
    return "NON_SERVERLESS";
  }
  if (
    /deprecat|decommission|discontinued|no longer|retired|shut ?down|end.of.life|has been replaced|being phased|model not found|unknown model|not a valid model|does not exist|is not available|has been removed/i.test(
      t,
    )
  ) {
    return "DEPRECATED";
  }
  if (status === 404) return "DEPRECATED"; // model id no longer resolves
  if (status >= 500) return "SERVER_ERROR";
  return "ERROR";
}

function shortDetail(status: number, text: string): string {
  try {
    const j = JSON.parse(text);
    const msg = j?.error?.message ?? j?.message ?? j?.error;
    if (typeof msg === "string" && msg.trim()) return msg.trim().slice(0, 240);
  } catch {
    /* not json */
  }
  return text.trim().slice(0, 240) || `(empty body, status ${status})`;
}

async function fetchCatalog(): Promise<Set<string> | null> {
  try {
    const res = await fetch(MODELS_URL, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (!res.ok) {
      console.warn(
        `  ! /v1/models returned ${res.status}; catalog cross-check disabled`,
      );
      return null;
    }
    const json = (await res.json()) as any[];
    // Together returns either [{id}] or [{model:{id}}]; handle both.
    const ids = new Set<string>();
    for (const m of json) {
      const id = m?.id ?? m?.model?.id;
      if (typeof id === "string") ids.add(id);
    }
    return ids;
  } catch (e) {
    console.warn(`  ! /v1/models fetch failed: ${(e as Error).message}`);
    return null;
  }
}

async function probe(
  model: string,
): Promise<Omit<Result, "label" | "source" | "hidden" | "listed">> {
  const body = JSON.stringify({
    model,
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
    max_tokens: 8,
    temperature: 0.2,
    stream: false,
  });

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
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
        body,
        signal: ac.signal,
      });
      const text = await res.text();
      const ms = Math.round(performance.now() - start);
      const outcome = classify(res.status, text);

      if (outcome === "WORKS") {
        let reply = "";
        try {
          reply =
            JSON.parse(text)?.choices?.[0]?.message?.content?.trim() ?? "";
        } catch {
          /* ignore */
        }
        return {
          model,
          resolved: model,
          outcome,
          status: res.status,
          ms,
          reply: reply.slice(0, 40),
          detail: "",
        };
      }

      const detail = shortDetail(res.status, text);
      const transient =
        outcome === "SERVER_ERROR" ||
        outcome === "RATE_LIMITED" ||
        outcome === "TIMEOUT" ||
        outcome === "NETWORK";
      if (transient && attempt < RETRIES) {
        clearTimeout(timer);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      return {
        model,
        resolved: model,
        outcome,
        status: res.status,
        ms,
        reply: "",
        detail,
      };
    } catch (e) {
      const ms = Math.round(performance.now() - start);
      const outcome = (e as Error).name === "AbortError" ? "TIMEOUT" : "NETWORK";
      if (attempt < RETRIES) {
        clearTimeout(timer);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      return {
        model,
        resolved: model,
        outcome,
        status: null,
        ms,
        reply: "",
        detail: (e as Error).message.slice(0, 240),
      };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`probe exhausted for ${model}`); // unreachable
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
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return ret;
}

// --- Build the test list ---------------------------------------------------

// Models the app uses internally but that are NOT on the homepage MODELS list.
const INTERNAL_MODELS: { label: string; value: string }[] = [
  { label: "Kimi K2.5 (screenshot→code)", value: "moonshotai/Kimi-K2.5" },
  {
    label: "Qwen3-Coder-Next (high-quality plan)",
    value: "Qwen/Qwen3-Coder-Next-FP8",
  },
];

interface Spec {
  label: string;
  model: string;
  source: "homepage" | "internal";
  hidden: boolean;
}

const specs: Spec[] = [
  ...MODELS.map((m) => ({
    label: m.label,
    model: m.value,
    source: "homepage" as const,
    hidden: Boolean((m as { hidden?: boolean }).hidden),
  })),
  ...INTERNAL_MODELS.map((m) => ({
    label: m.label,
    model: m.value,
    source: "internal" as const,
    hidden: false,
  })),
];

// --- Run ------------------------------------------------------------------

console.log(
  `Probing ${specs.length} models via ${COMPLETIONS_URL} (concurrency ${CONCURRENCY})…\n`,
);

const catalog = await fetchCatalog();

const results: Result[] = await mapLimit(specs, CONCURRENCY, async (spec) => {
  const resolved = resolveModel(spec.model);
  const probed = await probe(resolved);
  let outcome = probed.outcome;
  // Catalog fallback: if the model is gone from the catalog AND the API gave a
  // generic (non-authoritative) error, treat it as deprecated. Never override
  // an explicit NON_SERVERLESS / DEPRECATED / AUTH_ERROR verdict.
  const listed =
    catalog === null ? null : catalog.has(resolved) || catalog.has(spec.model);
  if (
    outcome !== "WORKS" &&
    outcome !== "NON_SERVERLESS" &&
    outcome !== "DEPRECATED" &&
    outcome !== "AUTH_ERROR" &&
    listed === false
  ) {
    outcome = "DEPRECATED";
  }
  return {
    label: spec.label,
    model: spec.model,
    resolved,
    source: spec.source,
    hidden: spec.hidden,
    listed,
    outcome,
    status: probed.status,
    ms: probed.ms,
    reply: probed.reply,
    detail: probed.detail,
  };
});

// --- Report ----------------------------------------------------------------

const order: Outcome[] = [
  "DEPRECATED",
  "NON_SERVERLESS",
  "ERROR",
  "SERVER_ERROR",
  "TIMEOUT",
  "NETWORK",
  "RATE_LIMITED",
  "AUTH_ERROR",
  "WORKS",
];
const rank = (o: Outcome) => order.indexOf(o);
results.sort((a, b) => rank(a.outcome) - rank(b.outcome) || a.label.localeCompare(b.label));

const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);
const sym: Record<Outcome, string> = {
  WORKS: "✓",
  NON_SERVERLESS: "⊘",
  DEPRECATED: "✗",
  AUTH_ERROR: "!",
  RATE_LIMITED: "⏳",
  SERVER_ERROR: "⚠",
  TIMEOUT: "⏱",
  NETWORK: "⚠",
  ERROR: "?",
};

for (const r of results) {
  const alias = r.model !== r.resolved ? `  (→ ${r.resolved})` : "";
  const tag = r.source === "internal" ? " [internal]" : "";
  const hidden = r.hidden ? " [hidden]" : "";
  const listed = r.listed === null ? "" : r.listed ? "" : " · not in catalog";
  const http = r.status ? ` · http ${r.status}` : "";
  console.log(
    `${sym[r.outcome]} ${pad(r.outcome, 14)} ${r.label}${tag}${hidden}${alias}${listed}${http}  (${r.ms}ms)`,
  );
  if (r.reply) console.log(`    reply: "${r.reply}"`);
  if (r.detail) console.log(`    ${r.detail}`);
}

// --- Summary ---------------------------------------------------------------

const counts = results.reduce<Record<string, number>>((acc, r) => {
  acc[r.outcome] = (acc[r.outcome] ?? 0) + 1;
  return acc;
}, {});

const brokenOnHomepage = results.filter(
  (r) =>
    r.source === "homepage" &&
    (r.outcome === "DEPRECATED" || r.outcome === "NON_SERVERLESS"),
);
const brokenInternal = results.filter(
  (r) =>
    r.source === "internal" &&
    (r.outcome === "DEPRECATED" || r.outcome === "NON_SERVERLESS"),
);

console.log("\n── Summary ─────────────────────────────────────────────");
for (const o of order) if (counts[o]) console.log(`  ${pad(o, 14)} ${counts[o]}`);
console.log(`  ${"total".padEnd(14)} ${results.length}`);

if (brokenOnHomepage.length) {
  console.log(
    `\n❌ ${brokenOnHomepage.length} homepage model(s) NOT working as serverless:`,
  );
  for (const r of brokenOnHomepage) {
    console.log(
      `   • ${r.label}  (${r.model}${
        r.model !== r.resolved ? ` → ${r.resolved}` : ""
      }) — ${r.outcome}`,
    );
  }
} else {
  console.log("\n✅ All homepage models work as serverless.");
}

if (brokenInternal.length) {
  console.log(
    `\n⚠️  ${brokenInternal.length} internal model(s) (not on homepage) NOT working as serverless:`,
  );
  for (const r of brokenInternal) {
    console.log(`   • ${r.label}  (${r.model}) — ${r.outcome}`);
  }
}

process.exit(brokenOnHomepage.length ? 1 : 0);