import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

type ResultRow = {
  runId: string;
  promptId: string;
  model: string;
  promptVersion: string;
  sampling: { temperature: number; maxTokens: number };
  timing: {
    firstTokenMs: number;
    totalGenerationMs: number;
    buildMs: number;
    renderMs: number;
  };
  tokens: { input: number; output: number };
  policyViolations: string[];
  build: { ok: boolean };
  runtime: { ok: boolean; consoleErrors: string[] };
  screenshot: string | null;
  judge: {
    model: string;
    verdicts: Array<{ behavior: string; verdict: string }>;
    score: number;
    rationale: string;
  } | null;
  qualityScore: number;
  cellError?: string;
};

async function main() {
  const { values } = parseArgs({
    options: {
      run: { type: "string" },
      out: { type: "string" },
    },
  });

  if (!values.run) {
    throw new Error("Missing --run tmp/benchmark/<runId> directory");
  }

  const runDir = path.resolve(values.run);
  const rows = await readResults(path.join(runDir, "results.jsonl"));
  const outPath = values.out ?? path.join(runDir, "report.html");

  await fs.writeFile(outPath, await renderHtml(runDir, rows));
  console.log(outPath);
}

async function readResults(pathname: string): Promise<ResultRow[]> {
  const raw = await fs.readFile(pathname, "utf8");
  return raw
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

async function renderHtml(runDir: string, rows: ResultRow[]) {
  const cells = await Promise.all(
    rows.map((row) => renderCell(runDir, row)),
  );

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Benchmark report ${escapeHtml(rows[0]?.runId ?? "")}</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; margin: 24px; color: #18181b; background: #fafafa; }
  h1 { font-size: 20px; }
  .cell { display: grid; grid-template-columns: 480px 1fr; gap: 20px; background: white;
          border: 1px solid #e4e4e7; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
  .cell img { width: 100%; border: 1px solid #e4e4e7; border-radius: 6px; }
  .noshot { display: flex; align-items: center; justify-content: center; min-height: 200px;
            background: #fef2f2; color: #b91c1c; border-radius: 6px; font-weight: 600; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: #52525b; margin: 6px 0 10px; }
  .score { font-size: 26px; font-weight: 700; }
  .pass { color: #15803d; } .fail { color: #b91c1c; }
  .verdict { margin: 2px 0; font-size: 13px; }
  .met::before { content: "✔ "; color: #15803d; }
  .not-met::before { content: "✘ "; color: #b91c1c; }
  .cannot-tell::before { content: "? "; color: #a16207; }
  .rationale { font-size: 13px; color: #3f3f46; background: #f4f4f5; border-radius: 6px; padding: 10px; margin-top: 10px; }
  .violations { font-size: 12px; color: #9a3412; margin-top: 8px; }
  table { border-collapse: collapse; margin-bottom: 28px; background: white; }
  th, td { border: 1px solid #e4e4e7; padding: 6px 12px; font-size: 13px; text-align: right; }
  th:first-child, td:first-child { text-align: left; }
</style>
</head>
<body>
<h1>Benchmark report — run ${escapeHtml(rows[0]?.runId ?? "unknown")}</h1>
${renderSummaryTable(rows)}
${cells.join("\n")}
</body>
</html>`;
}

function renderSummaryTable(rows: ResultRow[]) {
  const byModel = new Map<string, ResultRow[]>();
  for (const row of rows) {
    byModel.set(row.model, [...(byModel.get(row.model) ?? []), row]);
  }

  const lines = Array.from(byModel.entries()).map(([model, modelRows]) => {
    const passed = modelRows.filter(isMechanicalPass);
    const judged = modelRows.filter((row) => row.judge);
    return `<tr>
      <td>${escapeHtml(model)}</td>
      <td>${passed.length}/${modelRows.length}</td>
      <td>${judged.length ? round1(average(judged.map((row) => row.qualityScore))) : "—"}</td>
      <td>${Math.round(average(modelRows.map((row) => row.timing.firstTokenMs)) / 1000)}s</td>
      <td>${Math.round(average(modelRows.map((row) => row.timing.totalGenerationMs)) / 1000)}s</td>
      <td>${Math.round(average(modelRows.map((row) => row.tokens.input + row.tokens.output)))}</td>
    </tr>`;
  });

  return `<table>
    <tr><th>model</th><th>pass</th><th>mean quality</th><th>avg first token</th><th>avg total gen</th><th>avg tokens (cost proxy)</th></tr>
    ${lines.join("\n")}
  </table>`;
}

async function renderCell(runDir: string, row: ResultRow) {
  const pass = isMechanicalPass(row);
  const screenshot = row.screenshot
    ? await inlineImage(path.resolve(runDir, row.screenshot))
    : null;

  const failureDetail = row.cellError
    ? `cell error: ${row.cellError}`
    : !row.build.ok
      ? "build failed"
      : !row.runtime.ok
        ? `runtime failed: ${row.runtime.consoleErrors[0] ?? "unknown"}`
        : "";

  return `<div class="cell">
  <div>
    ${
      screenshot
        ? `<img src="${screenshot}" alt="screenshot">`
        : `<div class="noshot">${escapeHtml(failureDetail || "no screenshot")}</div>`
    }
  </div>
  <div>
    <div><strong>${escapeHtml(row.promptId)}</strong> · ${escapeHtml(row.model)}
      <span class="${pass ? "pass" : "fail"}">${pass ? "PASS" : "FAIL"}</span></div>
    <div class="meta">
      <span>first token ${Math.round(row.timing.firstTokenMs / 1000)}s</span>
      <span>total gen ${Math.round(row.timing.totalGenerationMs / 1000)}s</span>
      <span>build ${Math.round(row.timing.buildMs)}ms</span>
      <span>render ${Math.round(row.timing.renderMs)}ms</span>
      <span>tokens ${row.tokens.input}+${row.tokens.output}</span>
      <span>temp ${row.sampling.temperature}</span>
    </div>
    ${
      row.judge
        ? `<div class="score">${row.qualityScore}/10</div>
           ${row.judge.verdicts
             .map(
               (verdict) =>
                 `<div class="verdict ${verdict.verdict}">${escapeHtml(verdict.behavior)}</div>`,
             )
             .join("\n")}
           <div class="rationale">${escapeHtml(row.judge.rationale)}</div>`
        : `<div class="score fail">not judged</div>${
            failureDetail ? `<div class="rationale">${escapeHtml(failureDetail)}</div>` : ""
          }`
    }
    ${
      row.policyViolations.length
        ? `<div class="violations">policy: ${row.policyViolations.map(escapeHtml).join(" · ")}</div>`
        : ""
    }
  </div>
</div>`;
}

async function inlineImage(pathname: string) {
  try {
    const data = await fs.readFile(pathname, "base64");
    return `data:image/png;base64,${data}`;
  } catch {
    return null;
  }
}

function isMechanicalPass(row: ResultRow) {
  return row.build.ok && row.runtime.ok && row.screenshot !== null;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
