import { test } from "node:test";
import assert from "node:assert/strict";
import { findMissingPreviewModules } from "./html";

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
