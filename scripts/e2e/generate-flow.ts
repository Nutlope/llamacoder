import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const PROMPT = process.argv[2] ?? "Build a todo list app with add, complete, and delete";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  const t0 = Date.now();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });

  // fill the prompt textarea + submit
  await page.fill("textarea", PROMPT);
  const submit = page.locator('button[type="submit"]').first();
  await submit.click();

  // wait for redirect to the chat page
  await page.waitForURL(/\/chats\//, { timeout: 30000 });
  const redirectMs = Date.now() - t0;
  const chatUrl = page.url();

  // wait for the Base UI preview to reach ready or error (generation streams, then preview renders)
  const genStart = Date.now();
  let phase = "timeout";
  try {
    await page.waitForFunction(
      () => {
        const el = document.querySelector("[data-preview-phase]");
        const ph = el?.getAttribute("data-preview-phase");
        return ph === "ready" || ph === "error";
      },
      undefined,
      { timeout: 120000 },
    );
    phase = (await page
      .locator("[data-preview-phase]")
      .first()
      .getAttribute("data-preview-phase")) as string;
  } catch {
    phase = "no-phase-within-120s";
  }
  const previewMs = Date.now() - genStart;

  console.log("=== E2E PRODUCTION FLOW ===");
  console.log("prompt:", PROMPT);
  console.log("chat url:", chatUrl);
  console.log("homepage -> chat redirect:", redirectMs + "ms");
  console.log("chat -> preview " + phase + ":", previewMs + "ms");
  console.log("total:", Date.now() - t0 + "ms");
  console.log("page errors:", JSON.stringify(pageErrors.slice(0, 3)));

  // screenshot the result to disk to share
  const shot = "tmp/e2e-result.png";
  await page.screenshot({ path: shot });
  console.log("screenshot:", shot);

  await browser.close();
})();
