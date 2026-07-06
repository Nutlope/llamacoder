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
      // Keep `[`/`]` so Tailwind arbitrary-value utilities survive normalization
      // (e.g. `bg-[#06060a]`, `text-[14px]`). Stripping the trailing `]` corrupts
      // the candidate and the compiler silently drops it — white-on-white preview.
      const normalized = token.trim().replace(/[{}(),;]+$/g, "");
      if (isLikelyTailwindToken(normalized)) tokens.add(normalized);
    }
  }

  return tokens;
}

function isLikelyTailwindToken(token: string) {
  if (token.length < 2 || token.length > 160) return false;
  if (token.startsWith("@/") || token.startsWith("./")) return false;

  const utility = token.split(":").pop()?.replace(/^!?-?/, "") ?? token;
  return /^(bg|text|border|ring|shadow|rounded|flex|grid|inline|block|hidden|items|justify|content|gap|space|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|w|h|min|max|size|overflow|relative|absolute|fixed|sticky|inset|top|right|bottom|left|z|opacity|transition|duration|ease|animate|cursor|select|pointer|font|leading|tracking|whitespace|truncate|sr-only|container|aspect|object|scale|translate|rotate|origin|isolate|columns|col|row|auto|place|self|grow|shrink|basis|order|divide|outline|resize|scroll|overscroll|snap|touch|will|transform|decoration|underline|uppercase|lowercase|capitalize|normal|italic|not-italic|tabular|align|break|list|backdrop|blur|brightness|contrast|drop|grayscale|hue|invert|saturate|sepia|filter|fill|stroke|accent|caret|scheme|visible|invisible|collapse|static|float|clear|box|table|caption|no-scrollbar|scrollbar|shimmer)(-|$)/.test(
    utility,
  );
}

function normalizePreviewPath(path: string) {
  return path.replace(/^\/+/, "").replace(/^src\//, "");
}
