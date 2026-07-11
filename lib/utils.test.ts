import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFenceOpeners,
  parseReplySegments,
  extractAllCodeBlocks,
  getFilesFromMessage,
  sanitizeAssistantOutput,
  stripThinkingBlocks,
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

// GLM (chat 4LsLa0R0L9b64Ng6) put the `{path=...}` attribute on the line AFTER
// the bare ```tsx opener (inside the code body) instead of on the fence header.
// The old header-only parser missed it, so every block fell back to `file.tsx`
// and the cumulative merge collapsed all files into one.
test("next-line {path=...} attribute is parsed and stripped from code", () => {
  const md = [
    `${B}tsx`,
    "{path=src/App.tsx}",
    `import { Hero } from "@/components/landing/hero";`,
    `export default function App() { return null; }`,
    B,
  ].join("\n");

  const got = files(md);
  assert.equal(got.length, 1);
  assert.equal(got[0].path, "src/App.tsx");
  // the attribute line must not leak into the rendered code
  assert.doesNotMatch(got[0].code, /\{path=/);
  assert.match(got[0].code, /import \{ Hero \}/);
});

// GLM (chat dxpXfIirRtV5oHn_) sometimes emitted the closing brace of the
// path-bearing fence header on the next line. The path was recovered, but the
// orphan `}` leaked into the file body and caused `Unexpected "}"` at byte 0.
test("split closing brace from path fence header is stripped from code", () => {
  const md = [
    `${B}tsx{path=src/data/seed.ts`,
    "}",
    "export type Channel = { id: string };",
    B,
    `${B}tsx{path=src/components/chat/Sidebar.tsx`,
    "}",
    `import { Hash } from "lucide-react";`,
    "export function Sidebar() { return null; }",
    B,
  ].join("\n");

  const ui = files(md);
  const backend = extractAllCodeBlocks(md);
  assert.deepEqual(
    ui.map((f) => f.path),
    ["src/data/seed.ts", "src/components/chat/Sidebar.tsx"],
  );
  assert.deepEqual(
    backend.map((f) => f.path),
    ui.map((f) => f.path),
  );
  assert.equal(ui[0].code.startsWith("}"), false);
  assert.equal(ui[1].code.startsWith("}"), false);
  assert.match(ui[0].code, /export type Channel/);
  assert.match(ui[1].code, /import \{ Hash \}/);
});

test("legacy stored files with orphan leading brace are re-extracted", () => {
  const content = [
    `${B}tsx{path=src/data/seed.ts`,
    "}",
    "export type Channel = { id: string };",
    B,
  ].join("\n");

  const got = getFilesFromMessage({
    content,
    files: [
      {
        path: "src/data/seed.ts",
        language: "tsx",
        code: "}\nexport type Channel = { id: string };",
      },
    ],
  });

  assert.equal(got.length, 1);
  assert.equal(got[0].path, "src/data/seed.ts");
  assert.equal(got[0].code.startsWith("}"), false);
  assert.match(got[0].code, /export type Channel/);
});

// The exact production regression: eight bare ```tsx blocks each carrying a
// next-line {path=...}. They must stay eight distinct files, not collapse.
test("multiple next-line path blocks never collapse into one", () => {
  const paths = [
    "src/App.tsx",
    "src/components/landing/navbar.tsx",
    "src/components/landing/hero.tsx",
    "src/components/landing/features.tsx",
    "src/components/landing/pricing.tsx",
    "src/components/landing/testimonials.tsx",
    "src/components/landing/waitlist.tsx",
    "src/components/landing/footer.tsx",
  ];
  const md = paths
    .map(
      (p) =>
        `${B}tsx\n{path=${p}}\nexport default function X() { return null; }\n${B}`,
    )
    .join("\n\n");

  const ui = files(md).map((f) => f.path);
  const backend = extractAllCodeBlocks(md).map((f) => f.path);
  assert.equal(ui.length, paths.length);
  assert.deepEqual(ui, paths);
  assert.deepEqual(ui, backend);
});

// Two blocks that genuinely declare the same explicit path must not silently
// drop one; dedupe keeps both with a numeric suffix.
test("duplicate explicit paths are disambiguated, not dropped", () => {
  const md = [
    `${B}tsx{path=src/App.tsx}`,
    `export default function App() { return 1; }`,
    B,
    `${B}tsx{path=src/App.tsx}`,
    `export default function App() { return 2; }`,
    B,
  ].join("\n");

  const got = files(md);
  assert.equal(got.length, 2);
  assert.deepEqual(
    got.map((f) => f.path),
    ["src/App.tsx", "src/App-2.tsx"],
  );
  assert.match(got[0].code, /return 1/);
  assert.match(got[1].code, /return 2/);
});

// From chat LCGsL-FlYg-1bRB- (GLM 5.2): the model leaked an unterminated <thinking> block
// (a 50k-char repetition loop quoting code in fences) into the message body.
// Those fences must not become files.
test("unterminated <thinking> yields no files", () => {
  const md = [
    "<thinking>",
    "The user is getting an error. Let me check `App.tsx`:",
    `${B}tsx`,
    `import { useState } from "react";`,
    B,
    "Wait, I see it now. Let me check `ListingCard.tsx`:",
    `${B}`,
    "No `...` there.",
    B,
  ].join("\n");
  assert.equal(extractAllCodeBlocks(md).length, 0);
});

test("closed <thinking> is stripped but real files after it survive", () => {
  const md = [
    "<thinking>",
    "Plan: quote some code",
    `${B}tsx`,
    "not a real file",
    B,
    "</thinking>",
    `${B}tsx{path=src/App.tsx}`,
    `export default function App() { return null; }`,
    B,
  ].join("\n");
  const got = extractAllCodeBlocks(md);
  assert.deepEqual(
    got.map((f) => f.path),
    ["src/App.tsx"],
  );
});

// Direct unit coverage for the stripper itself.
test("stripThinkingBlocks removes closed blocks and keeps surrounding text", () => {
  const md = "Intro.\n<thinking>plan A</thinking>\nMiddle.\n<thinking>plan B</thinking>\nOutro.";
  assert.equal(stripThinkingBlocks(md), "Intro.\n\nMiddle.\n\nOutro.");
});

test("stripThinkingBlocks drops everything after an unterminated opener", () => {
  const md = "Before.\n<thinking>\ntruncated repetition loop that never closes";
  assert.equal(stripThinkingBlocks(md), "Before.\n");
});

test("stripThinkingBlocks leaves content without thinking tags untouched", () => {
  const md = `Prose.\n${B}tsx{path=src/App.tsx}\nexport default function App() { return null; }\n${B}`;
  assert.equal(stripThinkingBlocks(md), md);
});

test("sanitizeAssistantOutput removes leaked reasoning before visible code", () => {
  const md = [
    "Thinking Process: choose the architecture",
    "1. Plan the files",
    `${B}tsx{path=src/App.tsx}`,
    "export default function App() { return null; }",
    B,
  ].join("\n");
  assert.equal(sanitizeAssistantOutput(md), md.slice(md.indexOf(B)));
});

test("sanitizeAssistantOutput removes tagged reasoning from visible output", () => {
  const md = [
    "<thinking>private plan</thinking>",
    `${B}tsx{path=src/App.tsx}`,
    "export default function App() { return null; }",
    B,
  ].join("\n");
  assert.doesNotMatch(sanitizeAssistantOutput(md), /thinking|private plan/i);
});

// Bare tagless blocks with distinct content get distinct intelligent names
// instead of all collapsing to the generic `file.tsx`.
test("tagless blocks get distinct intelligent names", () => {
  const md = [
    `${B}tsx`,
    `export default function Navbar() { return null; }`,
    B,
    `${B}tsx`,
    `export default function Hero() { return null; }`,
    B,
    `${B}tsx`,
    `export default function Navbar() { return null; }`,
    B,
  ].join("\n");

  const got = files(md);
  assert.equal(got.length, 3);
  const names = got.map((f) => f.path);
  // first and second differ by content; third collides with first and is suffixed
  assert.notEqual(names[0], names[1]);
  assert.deepEqual(names, ["navbar.tsx", "hero.tsx", "navbar-2.tsx"]);
});
