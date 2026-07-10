import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright";

export type GeneratedFile = {
  path: string;
  content: string;
};

export type RunnerOutput = {
  build: { ok: boolean; stdout: string; stderr: string; durationMs: number };
  runtime: { ok: boolean; consoleErrors: string[]; durationMs: number };
  screenshot: string | null;
};

type HarnessResult = Omit<RunnerOutput, "screenshot">;

export type EvalHarnessSession = {
  renderFiles: (
    files: GeneratedFile[],
    options?: { screenshotPath?: string },
  ) => Promise<RunnerOutput>;
  close: () => Promise<void>;
};

export async function createEvalHarnessSession(options: {
  baseUrl?: string;
  browser?: Browser;
  uiLibrary?: "baseui";
}): Promise<EvalHarnessSession> {
  const browser = options.browser ?? (await chromium.launch());
  const ownsBrowser = !options.browser;
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(
    `${options.baseUrl ?? "http://localhost:3000"}/eval-harness`,
  );
  await page.waitForFunction(() => typeof window.renderFiles === "function");

  return {
    renderFiles: (files, renderOptions) =>
      renderFilesInPage(page, files, renderOptions),
    close: async () => {
      await page.close();
      if (ownsBrowser) await browser.close();
    },
  };
}

async function renderFilesInPage(
  page: Page,
  files: GeneratedFile[],
  options: { screenshotPath?: string } = {},
): Promise<RunnerOutput> {
  await page.evaluate(async (inputFiles) => {
    await window.renderFiles(inputFiles);
  }, files);

  await page.waitForFunction(
    () => {
      const phase = document
        .querySelector("[data-preview-phase]")
        ?.getAttribute("data-preview-phase");
      return phase === "ready" || phase === "error";
    },
    undefined,
    { timeout: 20_000 },
  );

  const result = await page.evaluate(() => window.getEvalHarnessResult());
  const phase = await page
    .locator("[data-preview-phase]")
    .getAttribute("data-preview-phase");

  let screenshot: string | null = null;
  if (phase === "ready" && options.screenshotPath) {
    await page.addStyleTag({
      content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
    });
    await page.waitForTimeout(800);
    await fs.mkdir(path.dirname(options.screenshotPath), { recursive: true });
    await page.screenshot({ path: options.screenshotPath, fullPage: false });
    screenshot = options.screenshotPath;
  }

  return {
    ...result,
    screenshot,
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      files: { type: "string" },
      out: { type: "string" },
      "base-url": { type: "string", default: "http://localhost:3000" },
    },
  });

  if (!values.files) {
    throw new Error("Missing --files path to JSON array of generated files");
  }

  const files = JSON.parse(await fs.readFile(values.files, "utf8"));
  const outDir = values.out ?? "tmp/benchmark/eval-runner";
  const session = await createEvalHarnessSession({
    baseUrl: values["base-url"],
  });

  try {
    const output = await session.renderFiles(files, {
      screenshotPath: path.join(outDir, "screenshot.png"),
    });
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(
      path.join(outDir, "runner-output.json"),
      JSON.stringify(output, null, 2),
    );
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await session.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
