import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Parse a code-fence header (the text after the opening ``` on the opener line)
// into a language and an optional explicit path/filename. `path` is null when
// the header declares no path (the caller then falls back to other sources).
function parseFenceHeader(tag: string): { language: string; path: string | null } {
  const raw = tag || "";
  const langMatch = raw.match(/^([A-Za-z0-9]+)/);
  const language = langMatch ? langMatch[1] : "text";
  const pathMatch = raw.match(/(?:\{\s*)?path\s*=\s*([^}\s]+)(?:\s*\})?/);
  const filenameMatch = raw.match(
    /(?:\{\s*)?filename\s*=\s*([^}\s]+)(?:\s*\})?/,
  );
  const path = pathMatch ? pathMatch[1] : filenameMatch ? filenameMatch[1] : null;
  return { language, path };
}

// Some models (notably GLM) put the `{path=...}` attribute on the line AFTER
// the fence opener instead of on the header line, e.g.:
//   ```tsx
//   {path=src/App.tsx}
//   import ...
//   ```
// The header-only parser above misses it, so every block falls back to the same
// `file.<ext>` path and the cumulative merge collapses all files into one.
// Detect such a standalone attribute line and return the path it declares.
function parseAttributeLine(line: string): string | null {
  const trimmed = (line || "").trim();
  if (!trimmed) return null;
  const pathMatch = trimmed.match(/^\{?\s*path\s*=\s*([^}\s]+)\s*\}?$/);
  if (pathMatch) return pathMatch[1];
  const filenameMatch = trimmed.match(/^\{?\s*filename\s*=\s*([^}\s]+)\s*\}?$/);
  if (filenameMatch) return filenameMatch[1];
  return null;
}

// Resolve the path for a code block, in priority order:
//   1. explicit path/filename on the fence header,
//   2. a `{path=...}` attribute on the first line of the code body (stripped),
//   3. an intelligent name derived from the code content.
// Returns the code with the attribute line removed when option 2 applies.
function resolveBlockPath(
  fenceTag: string,
  code: string,
): { language: string; path: string; code: string } {
  const header = parseFenceHeader(fenceTag);
  if (header.path) {
    return { language: header.language, path: header.path, code };
  }
  const lines = code.split("\n");
  const attrPath = parseAttributeLine(lines[0] ?? "");
  if (attrPath) {
    return {
      language: header.language,
      path: attrPath,
      code: lines.slice(1).join("\n"),
    };
  }
  const { name, extension } = generateIntelligentFilename(code, header.language);
  const path = extension ? `${name}.${extension}` : name;
  return { language: header.language, path, code };
}

// Ensure every extracted file gets a unique path so distinct code blocks never
// collapse into a single entry when merged by path. Appends -2, -3, ... before
// the extension on collisions.
function dedupePath(path: string, usedPaths: Set<string>): string {
  if (!usedPaths.has(path)) {
    usedPaths.add(path);
    return path;
  }
  const dot = path.lastIndexOf(".");
  const stem = dot === -1 ? path : path.slice(0, dot);
  const ext = dot === -1 ? "" : path.slice(dot);
  let n = 2;
  let candidate = `${stem}-${n}${ext}`;
  while (usedPaths.has(candidate)) {
    n += 1;
    candidate = `${stem}-${n}${ext}`;
  }
  usedPaths.add(candidate);
  return candidate;
}

export function extractFirstCodeBlock(input: string) {
  // 1) We use a more general pattern for the code fence:
  //    - ^```([^\n]*) captures everything after the triple backticks up to the newline.
  //    - ([\s\S]*?) captures the *body* of the code block (non-greedy).
  //    - Then we look for a closing backticks on its own line (\n```).
  // The 'm' (multiline) flag isn't strictly necessary here, but can help if input is multiline.
  // The '([\s\S]*?)' is a common trick to match across multiple lines non-greedily.
  const match = input.match(/```([^\n]*)\n([\s\S]*?)\n```/);

  if (match) {
    const fenceTag = match[1] || ""; // e.g. "tsx{filename=Calculator.tsx}"
    const code = match[2]; // The actual code block content
    const fullMatch = match[0]; // Entire matched string including backticks

    // We'll parse the fenceTag to extract optional language and filename
    let language: string | null = null;
    let filename: { name: string; extension: string } | null = null;

    // Attempt to parse out the language, which we assume is the leading alphanumeric part
    // Example: fenceTag = "tsx{filename=Calculator.tsx}"
    const langMatch = fenceTag.match(/^([A-Za-z0-9]+)/);
    if (langMatch) {
      language = langMatch[1];
    }

    // Attempt to parse out a filename from braces, e.g. {filename=Calculator.tsx}
    const fileMatch = fenceTag.match(/{\s*filename\s*=\s*([^}]+)\s*}/);
    if (fileMatch) {
      filename = parseFileName(fileMatch[1]);
    }

    return { code, language, filename, fullMatch };
  }
  return null; // No code block found
}

export function extractAllCodeBlocks(input: string): Array<{
  code: string;
  language: string;
  path: string;
  fullMatch: string;
}> {
  input = normalizeFenceOpeners(input);
  const codeBlockRegex = /```([^\n]*)\n([\s\S]*?)\n```/g;
  const files: Array<{
    code: string;
    language: string;
    path: string;
    fullMatch: string;
  }> = [];

  let match;
  const usedPaths = new Set<string>();
  while ((match = codeBlockRegex.exec(input)) !== null) {
    const fenceTag = match[1] || ""; // e.g. "tsx{path=src/App.tsx}"
    const rawCode = match[2]; // The actual code block content
    const fullMatch = match[0]; // Entire matched string including backticks

    // Resolve language + path (handles GLM's next-line `{path=...}` attribute
    // and falls back to an intelligent name), then ensure a unique path so
    // distinct blocks never collapse into one when merged by path.
    const resolved = resolveBlockPath(fenceTag, rawCode);
    const path = dedupePath(resolved.path, usedPaths);
    files.push({ code: resolved.code, language: resolved.language, path, fullMatch });
  }

  return files;
}

function parseFileName(fileName: string): { name: string; extension: string } {
  // Split the string at the last dot
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    // No dot found
    return { name: fileName, extension: "" };
  }
  return {
    name: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex + 1),
  };
}

// New: Parse an assistant reply into ordered text and file segments.
// Supports multiple files per reply and interleaved text. Streaming-safe: returns
// a partial file segment if the closing fence hasn't arrived yet.
export type ReplySegment =
  | { type: "text"; content: string }
  | {
      type: "file";
      code: string;
      language: string;
      path: string;
      isPartial: boolean;
    };

// GLM (and other models) sometimes glue an opening code fence onto the end of
// the preceding prose line, e.g. "...for the form elements.```tsx{path=src/types.ts}",
// and occasionally put the first line of code on that same line too. The
// line-anchored fence detection below only recognizes a fence alone on its own
// line, so a glued opener makes it silently drop that file — the code renders as
// inline text and the preview breaks (a missing @/types module → 15s watchdog).
// Normalize path-tagged opening fences onto their own line, with code starting
// on the next line, before parsing. Targets only `{path=...}` openers, so bare
// closing fences and ordinary inline code are untouched.
export function normalizeFenceOpeners(markdown: string): string {
  const pathFence = String.raw`\x60\x60\x60[^\n\x60]*\{path=[^}\n]*\}`;
  return markdown
    // Newline before a glued opener (prose directly before the fence).
    .replace(new RegExp(String.raw`([^\n])(${pathFence})`, "g"), "$1\n$2")
    // Newline after the opener tag when code is glued onto the same line.
    .replace(new RegExp(String.raw`(${pathFence})[ \t]+(?=\S)`, "g"), "$1\n");
}

export function parseReplySegments(markdown: string): ReplySegment[] {
  markdown = normalizeFenceOpeners(markdown);
  const segments: ReplySegment[] = [];
  const lines = markdown.split("\n");
  const fenceRegex = /^```([^\n]*)$/; // opening or closing fence line

  let textBuffer: string[] = [];
  let codeBuffer: string[] = [];
  let openTag: string | null = null; // e.g. tsx{path=src/App.tsx}

  const flushText = () => {
    if (textBuffer.length > 0) {
      segments.push({ type: "text", content: textBuffer.join("\n") });
      textBuffer = [];
    }
  };

  const usedPaths = new Set<string>();

  for (const line of lines) {
    const match = line.match(fenceRegex);
    if (match && !openTag) {
      // Opening fence
      openTag = match[1] || "";
      flushText();
      codeBuffer = [];
    } else if (match && openTag) {
      // Closing fence
      const resolved = resolveBlockPath(openTag, codeBuffer.join("\n"));
      const path = dedupePath(resolved.path, usedPaths);
      segments.push({
        type: "file",
        code: resolved.code,
        language: resolved.language,
        path,
        isPartial: false,
      });
      openTag = null;
      codeBuffer = [];
    } else if (openTag) {
      codeBuffer.push(line);
    } else {
      textBuffer.push(line);
    }
  }

  // If a code fence remains open, emit a partial file segment
  if (openTag) {
    const resolved = resolveBlockPath(openTag, codeBuffer.join("\n"));
    const path = dedupePath(resolved.path, usedPaths);
    segments.push({
      type: "file",
      code: resolved.code,
      language: resolved.language,
      path,
      isPartial: true,
    });
  } else {
    flushText();
  }

  return segments.filter(
    (r) => r.type !== "text" || (r.type === "text" && r.content.length > 0),
  );
}

// Cheap count of fenced code blocks in a message body (open + close fence lines
// divided by 2). Used to detect legacy messages whose stored `files` collapsed
// (e.g. all blocks resolved to the same fallback path) so they can be re-extracted.
function countCodeBlocks(content: string): number {
  if (!content) return 0;
  let fences = 0;
  for (const line of content.split("\n")) {
    if (line.startsWith("```")) fences += 1;
  }
  return Math.floor(fences / 2);
}

// Return the files for a stored message, healing legacy data that collapsed
// multiple code blocks into a single entry. Healthy stored files (unique paths
// and at least as many as the content actually contains) are used as-is;
// otherwise the files are re-extracted from the raw message content. This makes
// older chats that were saved with the buggy header-only parser render correctly
// without a database migration.
export function getFilesFromMessage(msg: {
  files?: unknown;
  content: string;
}): Array<{ code: string; language: string; path: string; fullMatch: string }> {
  const stored = Array.isArray(msg.files) ? (msg.files as any[]) : null;
  if (stored && stored.length > 0) {
    const paths = stored.map((f) => f?.path).filter(Boolean);
    const uniquePaths = new Set(paths);
    const blockEstimate = countCodeBlocks(msg.content);
    if (
      paths.length === uniquePaths.size &&
      (blockEstimate === 0 || stored.length >= blockEstimate)
    ) {
      return stored;
    }
  }
  return extractAllCodeBlocks(msg.content);
}

// Enhanced filename generation for when models don't provide filenames
export function generateIntelligentFilename(
  content: string,
  language: string,
): { name: string; extension: string } {
  // Try to extract filename from common patterns in the content
  const patterns = [
    /export\s+default\s+(?:function\s+)?(\w+)/i,
    /function\s+(\w+)\s*\(/i,
    /const\s+(\w+)\s*=\s*\(/i,
    /class\s+(\w+)/i,
    /component\s*:\s*(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const name = match[1];
      // Convert to kebab-case
      const kebabName = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
      return { name: kebabName, extension: getExtensionForLanguage(language) };
    }
  }

  // Fallback to generic names based on language
  return { name: `component`, extension: getExtensionForLanguage(language) };
}

export function getExtensionForLanguage(language: string): string {
  const extensions: Record<string, string> = {
    javascript: "js",
    js: "js",
    typescript: "tsx",
    ts: "ts",
    tsx: "tsx",
    jsx: "jsx",
    python: "py",
    py: "py",
    html: "html",
    css: "css",
    json: "json",
    markdown: "md",
    md: "md",
    sql: "sql",
    bash: "sh",
    sh: "sh",
    yaml: "yaml",
    yml: "yml",
  };

  return extensions[language.toLowerCase()] || "txt";
}

export function getLanguageOfFile(filePath: string): string {
  const extension = filePath.split(".").pop()?.toLowerCase();
  const languages: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    py: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    sql: "sql",
    sh: "shell",
    yaml: "yaml",
    yml: "yaml",
  };
  return languages[extension || ""] || "plaintext";
}

export function getMonacoLanguage(language: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    javascript: "javascript",
    ts: "typescript",
    typescript: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    py: "python",
    python: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    markdown: "markdown",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    yaml: "yaml",
    yml: "yaml",
  };
  return map[language.toLowerCase()] || "plaintext";
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(rawName: string): string {
  // Split on one or more hyphens or underscores
  const parts = rawName.split(/[-_]+/);

  // Capitalize each part and join them back with spaces
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
