export function buildPreviewStyleSignature(
  files: Array<{ path: string; content: string }>,
) {
  return collectPreviewStyleTokens(files).sort().join("\n");
}

export function collectPreviewStyleCandidates(
  files: Array<{ path: string; content: string }>,
) {
  return collectPreviewStyleTokens(files)
    .filter((token) => !token.startsWith("import:") && !token.startsWith("path:"))
    .sort();
}

function collectPreviewStyleTokens(
  files: Array<{ path: string; content: string }>,
) {
  const tokens = new Set<string>();

  for (const file of files) {
    tokens.add(`path:${normalizePreviewPath(file.path)}`);
    collectImportSpecifiers(file.content).forEach((specifier) =>
      tokens.add(`import:${specifier}`),
    );
    collectStyleTokens(file.content).forEach((token) => tokens.add(token));
  }

  return [...tokens];
}

function collectImportSpecifiers(content: string) {
  const specifiers: string[] = [];
  const importPattern =
    /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(content))) {
    if (match[1]) specifiers.push(match[1]);
  }

  return specifiers;
}

function collectStyleTokens(content: string) {
  const tokens = new Set<string>();
  const stringPattern = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  let match: RegExpExecArray | null;

  while ((match = stringPattern.exec(content))) {
    for (const token of match[2].split(/\s+/)) {
      // Keep `[`/`]` AND `(`/`)` so modern Tailwind v4 utilities survive
      // normalization — arbitrary values (`bg-[#06060a]`, `text-[14px]`) AND
      // CSS-variable shorthand (`py-(--card-spacing)`, `gap-(--card-spacing)`).
      // Stripping the trailing `)` corrupts the candidate and the compiler
      // silently drops it — e.g. Base UI cards lose all their padding.
      const normalized = token.trim().replace(/[{},;]+$/g, "");
      if (isLikelyTailwindToken(normalized)) tokens.add(normalized);
    }
  }

  return tokens;
}

function isLikelyTailwindToken(token: string) {
  if (token.length < 2 || token.length > 160) return false;
  if (token.startsWith("@/") || token.startsWith("./")) return false;

  // Arbitrary-value utilities and property setters — `w-[100px]`,
  // `py-(--card-spacing)`, `[--card-spacing:--spacing(4)]`, `data-[open]:...`.
  // Don't try to allowlist these (the set is open-ended and Base UI leans on
  // CSS-variable spacing); if a token carries `[` or `(` arbitrary syntax, hand
  // it to Tailwind's `build()` and let the compiler be the judge. Prose words
  // never contain these characters, so this stays safe against false positives.
  if (token.includes("[") || token.includes("(")) return true;

  const utility = token.split(":").pop()?.replace(/^!?-?/, "") ?? token;
  // `from-*`/`via-*`/`to-*` are gradient color-stops — without them the compiler
  // never sees the stops, `--tw-gradient-stops` stays empty, the gradient resolves
  // to `none`, and `bg-clip-text text-transparent` text becomes invisible.
  return /^(bg|from|via|to|text|border|ring|shadow|rounded|flex|grid|inline|block|hidden|items|justify|content|gap|space|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|w|h|min|max|size|overflow|relative|absolute|fixed|sticky|inset|top|right|bottom|left|z|opacity|transition|duration|ease|animate|cursor|select|pointer|font|leading|tracking|whitespace|truncate|sr-only|container|aspect|object|scale|translate|rotate|origin|isolate|columns|col|row|auto|place|self|grow|shrink|basis|order|divide|outline|resize|scroll|overscroll|snap|touch|will|transform|decoration|underline|uppercase|lowercase|capitalize|normal|italic|not-italic|tabular|align|break|list|backdrop|blur|brightness|contrast|drop|grayscale|hue|invert|saturate|sepia|filter|fill|stroke|accent|caret|scheme|visible|invisible|collapse|static|float|clear|box|table|caption|no-scrollbar|scrollbar|shimmer)(-|$)/.test(
    utility,
  );
}

function normalizePreviewPath(path: string) {
  return path.replace(/^\/+/, "").replace(/^src\//, "");
}
