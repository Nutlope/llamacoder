import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSrcdoc, findMissingPreviewModules } from "./html";

const DEPS: Record<string, string> = {
  react: "19.0.0",
  "react-dom": "19.0.0",
  "framer-motion": "11.15.0",
};

test("known import-map specifiers are not flagged", () => {
  const code = `import * as React from "react";
import { motion } from "framer-motion";
import { createRoot } from "react-dom/client";
console.log(React, motion, createRoot);`;

  assert.deepEqual(findMissingPreviewModules(code, DEPS), []);
});

test("bare specifiers outside the import map are flagged once", () => {
  const code = `import * as THREE from "three";
import confetti from "canvas-confetti";
import again from "three";
console.log(THREE, confetti, again);`;

  assert.deepEqual(
    findMissingPreviewModules(code, DEPS).sort(),
    ["canvas-confetti", "three"],
  );
});

test("relative and absolute paths are ignored", () => {
  const code = `import App from "./App";
import vendor from "/preview-vendor/baseui-flat/react.js";
export { helper } from "../lib/helper";
console.log(App, vendor);`;

  assert.deepEqual(findMissingPreviewModules(code, DEPS), []);
});

test("subpath imports resolve through import-map prefix entries", () => {
  const code = `import { useReducedMotion } from "framer-motion/dom";
console.log(useReducedMotion);`;

  assert.deepEqual(findMissingPreviewModules(code, DEPS), []);
});

test("tailwind candidate classes are seeded into the preview document", () => {
  const srcdoc = buildSrcdoc("", "", DEPS, {
    tailwindCandidateClasses: 'fixed top-1/2 bg-[url("/x.svg")]',
  });

  assert.match(srcdoc, /id="__preview-tailwind-candidates"/);
  assert.match(srcdoc, /fixed top-1\/2/);
  assert.match(srcdoc, /&quot;\/x\.svg&quot;/);
});

test("preview paint keepalive survives browser occlusion", () => {
  const srcdoc = buildSrcdoc("", "", DEPS);

  // Arc/Chromium can occlude a tab without setting document.hidden. The
  // preview must therefore keep producing a tiny amount of inner-frame paint
  // damage even while the browser reports the document as visible; otherwise
  // a srcdoc that finishes offscreen can stay permanently white.
  assert.match(
    srcdoc,
    /paintKeepAliveTimer = setTimeout\(paintKeepAliveStep, 1000\);/,
  );
  assert.doesNotMatch(srcdoc, /paintKeepAliveEl\.remove\(\)/);
});
