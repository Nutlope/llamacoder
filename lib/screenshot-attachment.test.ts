import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ScreenshotAttachment from "../components/screenshot-attachment";

test("an uploading screenshot uses one stable attachment container", () => {
  const markup = renderToStaticMarkup(
    createElement(ScreenshotAttachment, {
      hidden: false,
      loading: true,
      onRemove: () => undefined,
      previewUrl: "blob:test-screenshot",
    }),
  );

  assert.equal(markup.match(/data-testid="screenshot-attachment"/g)?.length, 1);
  assert.match(markup, /data-testid="screenshot-preview"/);
  assert.match(markup, /data-testid="screenshot-upload-progress"/);
});
