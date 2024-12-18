"use server";

import { CodeSandbox } from "@codesandbox/sdk";
import assert from "assert";

assert.ok(typeof process.env.CSB_API_KEY === "string");
const sdk = new CodeSandbox(process.env.CSB_API_KEY);

export async function runPythonCode(code: string) {
  const sandbox = await sdk.sandbox.create();
  const result = await sandbox.shells.python.run(code);

  sandbox.disconnect();

  return result.output;
}

export async function runJavaScriptCode(code: string) {
  const sandbox = await sdk.sandbox.create();
  const result = await sandbox.shells.js.run(code);

  sandbox.disconnect();

  return result.output;
}
