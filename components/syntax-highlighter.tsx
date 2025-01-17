"use client";

import javascript from "@shikijs/langs/javascript";
import jsx from "@shikijs/langs/jsx";
import tsx from "@shikijs/langs/tsx";
import typescript from "@shikijs/langs/typescript";
import githubLightDefault from "@shikijs/themes/github-light-default";
import { use } from "react";
import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import shikiWasm from "shiki/wasm";

const highlighterPromise = createHighlighterCore({
  themes: [githubLightDefault],
  langs: [javascript, typescript, jsx, tsx],
  engine: createOnigurumaEngine(shikiWasm),
});

export default function SyntaxHighlighter({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const highlighter = use(highlighterPromise);
  const html = highlighter.codeToHtml(code, {
    lang: language,
    theme: "github-light-default",
  });

  return (
    <div className="p-4 text-sm" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
