import { test } from "node:test";
import assert from "node:assert/strict";
import { FIX_REQUEST_PREFIX, shouldAllowAutoFix } from "./chat-auto-fix";

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
