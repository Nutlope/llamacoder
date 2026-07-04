import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Frame, type Page } from "playwright";

type Scenario = "minimal" | "typical" | "heavy" | "gauntlet";
type Variant = "debounce-300" | "debounce-0";
type Vendor = "local" | "cdn" | "flat";
type BundleMode =
  | "external"
  | "inline-components"
  | "inline-used"
  | "inline-leaf"
  | "single-file"
  | "app-bare";

type RunResult = {
  scenario: Scenario;
  variant: Variant;
  vendor: Vendor;
  bundleMode: BundleMode;
  iteration: number;
  copyVariant: string | null;
  url: string;
  phase: string;
  ok: boolean;
  renderOk: boolean;
  smokeOk: boolean;
  bundleCacheHit: boolean;
  bundleCacheSource: string;
  bundleCacheLookupMs: number | null;
  esbuildEnsureMs: number | null;
  assemblyMs: number | null;
  tailwindCacheReadMs: number | null;
  tailwindCandidateMs: number | null;
  tailwindCssCacheHit: boolean;
  tailwindPrecompileCacheHit: boolean;
  bundleInputFiles: number | null;
  bundleInputBytes: number | null;
  bundleCacheKeyBytes: number | null;
  bundleOutputJsBytes: number | null;
  bundleOutputCssBytes: number | null;
  tailwindPrecompileMs: number | null;
  prepMs: number | null;
  bundleMs: number | null;
  iframeReadyMs: number | null;
  documentLoadMs: number | null;
  styledMs: number | null;
  totalMs: number | null;
  resources: number | null;
  esmResources: number | null;
  jsdelivrResources: number | null;
  cssRules: number | null;
  slowResources: PreviewResource[];
  consoleErrors: string[];
  pageErrors: string[];
  smoke: Record<string, "pass" | "fail" | "skip">;
};

type PreviewResource = {
  name: string;
  duration: number;
  initiatorType?: string;
  transferSize?: number;
  decodedBodySize?: number;
};

const DEFAULT_SCENARIOS: Scenario[] = [
  "minimal",
  "typical",
  "heavy",
  "gauntlet",
];
const DEFAULT_VARIANTS: Variant[] = ["debounce-300", "debounce-0"];
const DEFAULT_VENDORS: Vendor[] = ["local"];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await assertServerReady(args.baseUrl);

  const browser = await chromium.launch({ headless: true });
  const results: RunResult[] = [];

  try {
    for (const scenario of args.scenarios) {
      for (const variant of args.variants) {
        for (const vendor of args.vendors) {
          const sharedPage = args.reusePage
            ? await browser.newPage({
                viewport: { width: 1440, height: 1000 },
              })
            : null;

          try {
            for (let iteration = 0; iteration < args.iterations; iteration++) {
              const page =
                sharedPage ??
                (await browser.newPage({
                  viewport: { width: 1440, height: 1000 },
                }));
            const pageErrors: string[] = [];
            page.on("pageerror", (error) =>
              pageErrors.push(error.stack || error.message),
            );

            try {
              const result = await runOne({
                baseUrl: args.baseUrl,
                scenario,
                variant,
                vendor,
                bundleMode: args.bundleMode,
                iteration,
                copyVariant: args.copyVariant,
                page,
                pageErrors,
              });
              results.push(result);
              printRun(result);
            } finally {
              if (!sharedPage) await page.close();
            }
            }
          } finally {
            await sharedPage?.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }

  printSummary(results);
  await writeJson(results, args.outDir);
}

async function runOne(options: {
  baseUrl: string;
  scenario: Scenario;
  variant: Variant;
  vendor: Vendor;
  bundleMode: BundleMode;
  iteration: number;
  copyVariant: boolean;
  page: Page;
  pageErrors: string[];
}): Promise<RunResult> {
  const copyVariant = options.copyVariant
    ? `copy-${options.iteration + 1}`
    : null;
  const url = buildScenarioUrl(
    options.baseUrl,
    options.scenario,
    options.variant,
    options.vendor,
    options.bundleMode,
    copyVariant,
  );

  await options.page.goto(url, { waitUntil: "domcontentloaded" });
  await options.page.waitForFunction(
    `(() => {
      const phase = document
        .querySelector("[data-preview-phase]")
        ?.getAttribute("data-preview-phase");
      return phase === "ready" || phase === "error";
    })()`,
    undefined,
    { timeout: 30_000 },
  );

  const metrics = await options.page.evaluate(`(() => {
      const element = document.querySelector("[data-preview-phase]");
      if (!element) {
        return {
          phase: "missing",
          bundleCacheHit: false,
          bundleCacheSource: "",
          bundleCacheLookupMs: null,
          esbuildEnsureMs: null,
          assemblyMs: null,
          tailwindCacheReadMs: null,
          tailwindCandidateMs: null,
          tailwindCssCacheHit: false,
          tailwindPrecompileCacheHit: false,
          bundleInputFiles: null,
          bundleInputBytes: null,
          bundleCacheKeyBytes: null,
          bundleOutputJsBytes: null,
          bundleOutputCssBytes: null,
          tailwindPrecompileMs: null,
          prepMs: null,
          bundleMs: null,
          iframeReadyMs: null,
          documentLoadMs: null,
          styledMs: null,
          totalMs: null,
          resources: null,
          esmResources: null,
          jsdelivrResources: null,
          cssRules: null,
          slowResources: [],
          consoleErrors: [],
        };
      }
      const attr = (name) => element.getAttribute(name);
      const numberAttr = (name) => {
        const value = attr(name);
        if (!value) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const jsonAttr = (name, fallback) => {
        try {
          return JSON.parse(attr(name) || "");
        } catch {
          return fallback;
        }
      };

      return {
        phase: attr("data-preview-phase") || "unknown",
        bundleCacheHit: attr("data-preview-bundle-cache-hit") === "1",
        bundleCacheSource: attr("data-preview-bundle-cache-source") || "",
        bundleCacheLookupMs: numberAttr("data-preview-bundle-cache-lookup-ms"),
        esbuildEnsureMs: numberAttr("data-preview-esbuild-ensure-ms"),
        assemblyMs: numberAttr("data-preview-assembly-ms"),
        tailwindCacheReadMs: numberAttr("data-preview-tailwind-cache-read-ms"),
        tailwindCandidateMs: numberAttr("data-preview-tailwind-candidate-ms"),
        tailwindCssCacheHit:
          attr("data-preview-tailwind-css-cache-hit") === "1",
        tailwindPrecompileCacheHit:
          attr("data-preview-tailwind-precompile-cache-hit") === "1",
        bundleInputFiles: numberAttr("data-preview-bundle-input-files"),
        bundleInputBytes: numberAttr("data-preview-bundle-input-bytes"),
        bundleCacheKeyBytes: numberAttr("data-preview-bundle-cache-key-bytes"),
        bundleOutputJsBytes: numberAttr("data-preview-bundle-output-js-bytes"),
        bundleOutputCssBytes: numberAttr("data-preview-bundle-output-css-bytes"),
        tailwindPrecompileMs: numberAttr("data-preview-tailwind-precompile-ms"),
        prepMs: numberAttr("data-preview-prepare-ms"),
        bundleMs: numberAttr("data-preview-bundle-ms"),
        iframeReadyMs: numberAttr("data-preview-iframe-ready-ms"),
        documentLoadMs: numberAttr("data-preview-document-ms"),
        styledMs: numberAttr("data-preview-styled-ms"),
        totalMs: numberAttr("data-preview-total-ms"),
        resources: numberAttr("data-preview-resource-count"),
        esmResources: numberAttr("data-preview-esm-resource-count"),
        jsdelivrResources: numberAttr("data-preview-jsdelivr-resource-count"),
        cssRules: numberAttr("data-preview-stylesheet-rules"),
        slowResources: jsonAttr(
          "data-preview-slow-resources",
          [],
        ),
        consoleErrors: jsonAttr("data-preview-console-errors", []),
      };
    })()`);

  const smoke = await runSmokeChecks(options.page, options.scenario);
  const renderOk =
    metrics.phase === "ready" &&
    metrics.consoleErrors.length === 0 &&
    options.pageErrors.length === 0;
  const smokeOk = !Object.values(smoke).includes("fail");

  return {
    scenario: options.scenario,
    variant: options.variant,
    vendor: options.vendor,
    bundleMode: options.bundleMode,
    iteration: options.iteration,
    copyVariant,
    url,
    phase: metrics.phase,
    renderOk,
    smokeOk,
    bundleCacheHit: metrics.bundleCacheHit,
    bundleCacheSource: metrics.bundleCacheSource,
    bundleCacheLookupMs: metrics.bundleCacheLookupMs,
    esbuildEnsureMs: metrics.esbuildEnsureMs,
    assemblyMs: metrics.assemblyMs,
    tailwindCacheReadMs: metrics.tailwindCacheReadMs,
    tailwindCandidateMs: metrics.tailwindCandidateMs,
    tailwindCssCacheHit: metrics.tailwindCssCacheHit,
    tailwindPrecompileCacheHit: metrics.tailwindPrecompileCacheHit,
    bundleInputFiles: metrics.bundleInputFiles,
    bundleInputBytes: metrics.bundleInputBytes,
    bundleCacheKeyBytes: metrics.bundleCacheKeyBytes,
    bundleOutputJsBytes: metrics.bundleOutputJsBytes,
    bundleOutputCssBytes: metrics.bundleOutputCssBytes,
    tailwindPrecompileMs: metrics.tailwindPrecompileMs,
    ok: renderOk && smokeOk,
    prepMs: metrics.prepMs,
    bundleMs: metrics.bundleMs,
    iframeReadyMs: metrics.iframeReadyMs,
    documentLoadMs: metrics.documentLoadMs,
    styledMs: metrics.styledMs,
    totalMs: metrics.totalMs,
    resources: metrics.resources,
    esmResources: metrics.esmResources,
    jsdelivrResources: metrics.jsdelivrResources,
    cssRules: metrics.cssRules,
    slowResources: metrics.slowResources,
    consoleErrors: metrics.consoleErrors,
    pageErrors: options.pageErrors,
    smoke,
  };
}

async function runSmokeChecks(page: Page, scenario: Scenario) {
  const frame = page.frameLocator('iframe[title="Preview"]');
  const checks: Record<string, "pass" | "fail" | "skip"> = {
    dropdown: "skip",
    dialog: "skip",
    alertDialog: "skip",
    popover: "skip",
    tooltip: "skip",
    toast: "skip",
    sonner: "skip",
    scrollArea: "skip",
    chart: "skip",
  };

  if (scenario === "typical" || scenario === "heavy" || scenario === "gauntlet") {
    checks.dialog = await clickAndSee(frame, /Open dialog/, /Dialog/);
  }
  if (scenario === "typical" || scenario === "gauntlet") {
    checks.dropdown = await clickAndSee(
      frame,
      /Open dropdown menu|Actions/,
      /Archive|Toast|Actions/,
    );
  }
  if (scenario === "heavy" || scenario === "gauntlet") {
    checks.popover = await clickAndSee(frame, /Open popover/, /Popover/);
    checks.chart = (await isVisible(frame.locator("svg").first()))
      ? "pass"
      : "fail";
    checks.scrollArea = await canScrollPreview(page);
  }
  if (scenario === "gauntlet") {
    checks.alertDialog = await clickAndSee(
      frame,
      /Open alert dialog/,
      /Alert dialog rendered/,
    );
    checks.tooltip = await hoverAndSee(
      frame,
      /Hover for tooltip/,
      /Base UI tooltip/,
    );
    checks.toast = await clickAndSee(frame, /Fire use-toast/, /use-toast fired/);
    checks.sonner = await clickAndSee(frame, /Fire sonner/, /Sonner fired/);
  } else if (scenario === "typical" || scenario === "heavy") {
    checks.sonner = await clickAndSee(
      frame,
      /Save draft|Fire toast/,
      /Saved draft|Heavy app toast/,
    );
  }

  return checks;
}

async function clickAndSee(
  frame: ReturnType<Page["frameLocator"]>,
  trigger: RegExp,
  expected: RegExp,
) {
  const triggerLocator = frame.getByText(trigger).first();
  if (!(await isVisible(triggerLocator))) return "skip" as const;

  try {
    await triggerLocator.click({ timeout: 2_000 });
    await frame
      .getByText(expected)
      .first()
      .waitFor({ state: "visible", timeout: 3_000 });
    return "pass" as const;
  } catch {
    return "fail" as const;
  }
}

async function hoverAndSee(
  frame: ReturnType<Page["frameLocator"]>,
  trigger: RegExp,
  expected: RegExp,
) {
  const triggerLocator = frame.getByText(trigger).first();
  if (!(await isVisible(triggerLocator))) return "skip" as const;

  try {
    await triggerLocator.hover({ timeout: 2_000 });
    await frame
      .getByText(expected)
      .first()
      .waitFor({ state: "visible", timeout: 3_000 });
    return "pass" as const;
  } catch {
    return "fail" as const;
  }
}

async function canScrollPreview(page: Page) {
  const frameElement = await page
    .locator('iframe[title="Preview"]')
    .elementHandle()
    .catch(() => null);
  const contentFrame = await frameElement?.contentFrame();
  const result = await contentFrame
    ?.evaluate(`(() => {
      const elements = Array.from(document.querySelectorAll("div"));
      const scrollable = elements.find(
        (element) => element.scrollHeight > element.clientHeight + 20,
      );
      if (!scrollable) return null;
      scrollable.scrollTop = 9999;
      return scrollable.scrollTop > 0;
    })()`)
    .catch(() => null);

  return result === null ? "skip" : result ? "pass" : "fail";
}

async function isVisible(locator: ReturnType<Frame["locator"]>) {
  return locator.isVisible({ timeout: 1000 }).catch(() => false);
}

function buildScenarioUrl(
  baseUrl: string,
  scenario: Scenario,
  variant: Variant,
  vendor: Vendor,
  bundleMode: BundleMode,
  copyVariant: string | null,
) {
  const url = new URL("/preview-baseui", baseUrl);
  url.searchParams.set("debug", "1");
  if (scenario !== "gauntlet") url.searchParams.set("scenario", scenario);
  url.searchParams.set("debounce", variant === "debounce-300" ? "300" : "0");
  if (vendor !== "local") url.searchParams.set("vendor", vendor);
  if (bundleMode !== "external") url.searchParams.set("bundle", bundleMode);
  if (copyVariant) url.searchParams.set("copy", copyVariant);
  return url.toString();
}

async function assertServerReady(baseUrl: string) {
  const response = await fetch(new URL("/preview-baseui", baseUrl)).catch(
    () => null,
  );
  if (!response?.ok) {
    throw new Error(
      `Preview server is not ready at ${baseUrl}. Start it with pnpm dev or pnpm start before running this benchmark.`,
    );
  }
}

function printRun(result: RunResult) {
  const total = formatMs(result.totalMs);
  const resources = result.resources ?? "--";
  const output = formatBytes(result.bundleOutputJsBytes);
  console.log(
    `${result.ok ? "PASS" : "FAIL"} ${result.scenario} ${result.variant} ${result.vendor} ${result.bundleMode} #${result.iteration + 1} render=${result.renderOk ? "pass" : "fail"} smoke=${result.smokeOk ? "pass" : "fail"} total=${total} out=${output} resources=${resources}`,
  );
}

function printSummary(results: RunResult[]) {
  const rows = new Map<string, RunResult[]>();
  for (const result of results) {
    const key = `${result.scenario}\t${result.variant}\t${result.vendor}\t${result.bundleMode}`;
    rows.set(key, [...(rows.get(key) ?? []), result]);
  }

  console.table(
    [...rows.entries()].map(([key, group]) => {
      const [scenario, variant, vendor, bundleMode] = key.split("\t");
      const totals = group.map((result) => result.totalMs).filter(isNumber);
      return {
        scenario,
        variant,
        vendor,
        bundleMode,
        pass: `${group.filter((result) => result.ok).length}/${group.length}`,
        render: `${group.filter((result) => result.renderOk).length}/${group.length}`,
        smoke: `${group.filter((result) => result.smokeOk).length}/${group.length}`,
        cacheHits: `${group.filter((result) => result.bundleCacheHit).length}/${group.length}`,
        cacheSources: [
          ...new Set(group.map((result) => result.bundleCacheSource).filter(Boolean)),
        ].join(","),
        cssCacheHits: `${group.filter((result) => result.tailwindCssCacheHit).length}/${group.length}`,
        cssPreCacheHits: `${group.filter((result) => result.tailwindPrecompileCacheHit).length}/${group.length}`,
        median: formatMs(percentile(totals, 0.5)),
        p75: formatMs(percentile(totals, 0.75)),
        p95: formatMs(percentile(totals, 0.95)),
        min: formatMs(Math.min(...totals)),
        max: formatMs(Math.max(...totals)),
        resources: Math.round(average(group.map((result) => result.resources).filter(isNumber))),
        esm: Math.round(average(group.map((result) => result.esmResources).filter(isNumber))),
        cdn: Math.round(average(group.map((result) => result.jsdelivrResources).filter(isNumber))),
        css: Math.round(average(group.map((result) => result.cssRules).filter(isNumber))),
        files: Math.round(average(group.map((result) => result.bundleInputFiles).filter(isNumber))),
        input: formatBytes(
          average(group.map((result) => result.bundleInputBytes).filter(isNumber)),
        ),
        cacheKey: formatBytes(
          average(group.map((result) => result.bundleCacheKeyBytes).filter(isNumber)),
        ),
        assembly: formatMs(
          average(group.map((result) => result.assemblyMs).filter(isNumber)),
        ),
        cacheLookup: formatMs(
          average(group.map((result) => result.bundleCacheLookupMs).filter(isNumber)),
        ),
        ensure: formatMs(
          average(group.map((result) => result.esbuildEnsureMs).filter(isNumber)),
        ),
        outputJs: formatBytes(
          average(group.map((result) => result.bundleOutputJsBytes).filter(isNumber)),
        ),
        outputCss: formatBytes(
          average(group.map((result) => result.bundleOutputCssBytes).filter(isNumber)),
        ),
        cssPre: formatMs(
          average(group.map((result) => result.tailwindPrecompileMs).filter(isNumber)),
        ),
        cssCandidates: formatMs(
          average(group.map((result) => result.tailwindCandidateMs).filter(isNumber)),
        ),
        errors: group.reduce(
          (count, result) =>
            count + result.consoleErrors.length + result.pageErrors.length,
          0,
        ),
      };
    }),
  );
}

async function writeJson(results: RunResult[], outDir: string) {
  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = path.join(outDir, `preview-speedup-${stamp}.json`);
  await fs.writeFile(filename, JSON.stringify({ results }, null, 2));
  console.log(filename);
}

function parseArgs(argv: string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (!arg.startsWith("--")) continue;
    values.set(arg.slice(2), argv[index + 1] ?? "");
    index++;
  }

  return {
    baseUrl: values.get("base-url") ?? "http://localhost:3100",
    iterations: Number.parseInt(values.get("iterations") ?? "10", 10),
    scenarios: parseList(values.get("scenarios"), DEFAULT_SCENARIOS),
    variants: parseList(values.get("variants"), DEFAULT_VARIANTS),
    vendors: parseList(values.get("vendors"), DEFAULT_VENDORS),
    bundleMode: parseBundleMode(values.get("bundle-mode")),
    reusePage: values.get("reuse-page") === "1",
    copyVariant: values.get("copy-variant") === "1",
    outDir: values.get("out") ?? "benchmark-results",
  };
}

function parseBundleMode(value: string | undefined): BundleMode {
  if (
    value === "inline-components" ||
    value === "inline-used" ||
    value === "inline-leaf" ||
    value === "single-file" ||
    value === "app-bare"
  ) {
    return value;
  }
  return "external";
}

function parseList<T extends string>(value: string | undefined, fallback: T[]) {
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as T[];
}

function percentile(values: number[], fraction: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * fraction) - 1),
  );
  return sorted[index];
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatMs(value: number | null) {
  return value === null || !Number.isFinite(value) ? "--" : `${Math.round(value)}ms`;
}

function formatBytes(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "--";
  if (value < 1024) return `${Math.round(value)}b`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)}kb`;
  return `${(value / (1024 * 1024)).toFixed(1)}mb`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
