"use client";

import { startTransition, useEffect, useState } from "react";
import { codeToHtml } from "shiki/bundle/web";

export default function SyntaxHighlighter({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const [codeHtml, setCodeHtml] = useState("");

  useEffect(() => {
    if (!code) return;

    startTransition(async () => {
      const html = await codeToHtml(code, {
        lang: language,
        theme: "github-light-default",
      });

      startTransition(() => {
        setCodeHtml(html);
      });
    });
  }, [code, language]);

  return (
    <div
      className="p-4 text-sm"
      dangerouslySetInnerHTML={{ __html: codeHtml }}
    />
  );
}
