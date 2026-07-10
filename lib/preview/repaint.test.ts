import { test } from "node:test";
import assert from "node:assert/strict";
import { nudgePreviewIframeGeometry } from "./repaint";

test("preview repaint nudge forces layout at both resize boundaries", () => {
  const callbacks: Array<() => void> = [];
  let layoutReads = 0;
  const iframe = {
    style: { width: "" },
    get offsetWidth() {
      layoutReads += 1;
      return 800;
    },
  } as unknown as HTMLIFrameElement;

  nudgePreviewIframeGeometry(iframe, (callback) => {
    callbacks.push(callback);
    return 1;
  });

  assert.equal(iframe.style.width, "calc(100% - 1px)");
  assert.equal(layoutReads, 1);
  assert.equal(callbacks.length, 1);

  callbacks[0]();
  assert.equal(iframe.style.width, "");
  assert.equal(layoutReads, 2);
});
