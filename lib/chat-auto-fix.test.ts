import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIX_REQUEST_PREFIX,
  describePathlessFenceProblem,
  shouldAllowAutoFix,
} from "./chat-auto-fix";

const B = "```";

type TestMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function user(id: string, content = "make an app"): TestMessage {
  return { id, role: "user", content };
}

function assistant(id: string, path = "src/App.tsx"): TestMessage {
  return {
    id,
    role: "assistant",
    content: `${B}tsx{path=${path}}\nexport default function App() { return null; }\n${B}`,
  };
}

test("auto-fix is blocked for broken older app versions", () => {
  const messages = [
    user("u1"),
    assistant("a1"),
    user("u2", "make it better"),
    assistant("a2"),
  ];

  assert.equal(
    shouldAllowAutoFix({
      messages,
      activeMessage: messages[1],
      autoFixMessageIds: new Set(),
    }),
    false,
  );
});

test("auto-fix is allowed for the latest app version", () => {
  const messages = [user("u1"), assistant("a1")];

  assert.equal(
    shouldAllowAutoFix({
      messages,
      activeMessage: messages[1],
      autoFixMessageIds: new Set(),
    }),
    true,
  );
});

test("auto-fix is allowed for the fresh latest assistant before refresh", () => {
  const messages = [user("u1")];
  const activeMessage = assistant("a1");

  assert.equal(
    shouldAllowAutoFix({
      messages,
      activeMessage,
      autoFixMessageIds: new Set(),
    }),
    true,
  );
});

test("auto-fix is blocked for a previous fix prompt", () => {
  const messages = [
    user("u1", `${FIX_REQUEST_PREFIX}\n\nerror`),
    assistant("a1"),
  ];

  assert.equal(
    shouldAllowAutoFix({
      messages,
      activeMessage: messages[1],
      autoFixMessageIds: new Set(),
    }),
    false,
  );
});

// Chat LCGsL-FlYg-1bRB- (GLM 5.2): a multi-file app emitted as bare fences
// with no {path=...}. The bundler's "Cannot resolve" symptom sent the model
// chasing a code bug it didn't have; the fix request must describe the
// missing path tags instead.
test("pathless multi-file responses get the path-tag fix message", () => {
  const content = [
    "Here's the app:",
    `${B}tsx`,
    `import { listings } from "@/lib/data";`,
    "export default function App() { return null; }",
    B,
    `${B}ts`,
    "export const listings = [];",
    B,
  ].join("\n");

  const problem = describePathlessFenceProblem(content);
  assert.ok(problem);
  assert.match(problem!, /\{path=/);
  assert.match(problem!, /every file/i);
});

test("responses with path tags fall through to the real error", () => {
  const tagged = [
    `${B}tsx{path=src/App.tsx}`,
    "export default function App() { return null; }",
    B,
    `${B}ts{path=src/lib/data.ts}`,
    "export const listings = [];",
    B,
  ].join("\n");
  assert.equal(describePathlessFenceProblem(tagged), null);
});

test("a single bare fence is not flagged as a pathless multi-file app", () => {
  const single = `${B}tsx\nexport default function App() { return null; }\n${B}`;
  assert.equal(describePathlessFenceProblem(single), null);
});

test("fences quoted inside <thinking> do not trigger the pathless message", () => {
  const content = [
    "<thinking>",
    `${B}tsx`,
    "quoted code",
    B,
    `${B}tsx`,
    "more quoted code",
    B,
    "</thinking>",
    `${B}tsx{path=src/App.tsx}`,
    "export default function App() { return null; }",
    B,
  ].join("\n");
  assert.equal(describePathlessFenceProblem(content), null);
});
