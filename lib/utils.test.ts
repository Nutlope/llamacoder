import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFenceOpeners,
  parseReplySegments,
  extractAllCodeBlocks,
} from "./utils";

const B = "```"; // keep literal fences out of the source so editors don't choke

function files(markdown: string) {
  return parseReplySegments(markdown)
    .filter((s): s is Extract<typeof s, { type: "file" }> => s.type === "file")
    .map((s) => ({ path: s.path, code: s.code }));
}

// The actual production regression (chat FnMytKqzZvnceshT, GLM 5.2): the model
// glued the FIRST file's opening fence onto the end of the prose plan line, so
// the line-anchored UI parser dropped src/types.ts and rendered 4 of 5 files.
test("glued opening fence on the prose line is still detected", () => {
  const md = [
    `I'll use localStorage and shadcn/ui components.${B}tsx{path=src/types.ts}`,
    `export type Category = "food" | "other";`,
    B,
    `${B}tsx{path=src/App.tsx}`,
    `export default function App() { return null; }`,
    B,
  ].join("\n");

  const got = files(md);
  assert.deepEqual(
    got.map((f) => f.path),
    ["src/types.ts", "src/App.tsx"],
  );
  assert.match(got[0].code, /export type Category/);
  // the prose must not leak into the file body
  assert.doesNotMatch(got[0].code, /localStorage/);
});

// Second glue shape: the first line of code shares the fence line too.
test("code glued after the opener tag lands in the file body", () => {
  const md = `Here goes.${B}tsx{path=src/App.tsx} export const x = 1;\nexport const y = 2;\n${B}`;
  const got = files(md);
  assert.equal(got.length, 1);
  assert.equal(got[0].path, "src/App.tsx");
  assert.match(got[0].code, /export const x = 1;/);
  assert.match(got[0].code, /export const y = 2;/);
});

// Both parsers must agree on the glued input — the bug was that they disagreed.
test("parseReplySegments and extractAllCodeBlocks agree on glued input", () => {
  const md = [
    `Plan.${B}tsx{path=src/a.ts}`,
    `export const a = 1;`,
    B,
    `${B}tsx{path=src/b.ts}`,
    `export const b = 2;`,
    B,
  ].join("\n");
  const ui = files(md).map((f) => f.path);
  const backend = extractAllCodeBlocks(md).map((f) => f.path);
  assert.deepEqual(ui, ["src/a.ts", "src/b.ts"]);
  assert.deepEqual(ui, backend);
});

// Well-formed output must be left byte-for-byte alone and parse as before.
test("normalizeFenceOpeners is idempotent on well-formed output", () => {
  const md = [
    "Some intro.",
    "",
    `${B}tsx{path=src/App.tsx}`,
    "export default function App() { return null; }",
    B,
    "",
    "Trailing prose.",
  ].join("\n");
  assert.equal(normalizeFenceOpeners(md), md);
  const got = files(md);
  assert.deepEqual(
    got.map((f) => f.path),
    ["src/App.tsx"],
  );
});

// Bare fences (no {path=...}) and inline code must not be turned into files.
test("bare closing fences and inline code are untouched", () => {
  const md = `Use \`cn()\` here.\n\n${B}\nplain block\n${B}`;
  assert.equal(normalizeFenceOpeners(md), md);
  assert.equal(files(md).length, 0);
});
