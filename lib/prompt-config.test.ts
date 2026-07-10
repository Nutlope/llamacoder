import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProductionCodingPrompt } from "./prompt-config";

test("production prompt explicitly rejects filename comments instead of path fences", () => {
  const prompt = buildProductionCodingPrompt();

  assert.match(prompt, /tsx\{path=src\/App\.tsx\}/);
  assert.match(prompt, /full path and filename MUST be in the fence header/);
  assert.match(prompt, /\/\/ src\/App\.tsx` does NOT count as a path/);
  assert.match(prompt, /NEVER output this invalid pattern/);
  assert.match(
    prompt,
    /if `src\/App\.tsx` imports `@\/components\/ExpenseForm`, you MUST emit `src\/components\/ExpenseForm\.tsx`/,
  );
});
