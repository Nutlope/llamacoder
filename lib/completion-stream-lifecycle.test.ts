import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GENERATION_DEADLINE_MS,
  superviseCompletionStream,
  type CompletionDeadlineClock,
} from "./completion-stream-lifecycle";

function createClock() {
  let callback: (() => void) | undefined;
  let cleared = false;
  const clock: CompletionDeadlineClock = {
    set(nextCallback) {
      callback = nextCallback;
      return 1;
    },
    clear() {
      cleared = true;
    },
  };

  return {
    clock,
    fire: () => callback?.(),
    wasCleared: () => cleared,
  };
}

test("the generation deadline leaves time before Vercel's hard timeout", () => {
  assert.ok(GENERATION_DEADLINE_MS < 300_000);
});

test("a generation that never completes is aborted at the deadline", () => {
  const testClock = createClock();
  let aborted = false;

  superviseCompletionStream(
    {
      abort() {
        aborted = true;
      },
      finalContent() {
        return new Promise<string>(() => {});
      },
    },
    { timeoutMs: 10, clock: testClock.clock },
  );

  testClock.fire();
  assert.equal(aborted, true);
});

test("a completed generation cannot be aborted by a stale deadline", async () => {
  const testClock = createClock();
  let aborted = false;

  await superviseCompletionStream(
    {
      abort() {
        aborted = true;
      },
      finalContent() {
        return Promise.resolve("done");
      },
    },
    { timeoutMs: 10, clock: testClock.clock },
  );

  testClock.fire();
  assert.equal(testClock.wasCleared(), true);
  assert.equal(aborted, false);
});
