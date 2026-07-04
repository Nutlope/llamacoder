import dedent from "dedent";
import { PREVIEW_DEPS } from "./preview/deps";
import shadcnDocs from "./shadcn-docs";
import { examples } from "./shadcn-examples";

export type PromptConfig = {
  includeExamples: boolean;
  includeComponentDocs: boolean;
  maxFiles: number;
  /**
   * Minimal-prompt variant. Optional; `undefined` is treated as `"v1"` so the
   * default config stays implicitly v1. When `"v2"`, `buildMinimalCodingPrompt`
   * makes exactly two changes vs v1: omits the arbitrary-Tailwind-bracket-values
   * forbidden bullet, and adds a phantom-import self-check bullet under File
   * Format. No other differences. When `"v3"`, `buildMinimalCodingPrompt`
   * appends a `## Design quality` section after the Reasoning section (before
   * any component-docs/examples sections) and does NOT apply the v2 tweaks. No
   * other differences. When `"v4"`, `buildMinimalCodingPrompt` appends a
   * `## Modern patterns` section after the Reasoning section (before any
   * component-docs/examples sections) and does NOT apply the v2 or v3 tweaks.
   * No other differences.
   */
  promptVariant?: "v1" | "v2" | "v3" | "v4";
};

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  includeExamples: false,
  includeComponentDocs: true,
  maxFiles: 5,
};

/**
 * The "inline" architecture-mode instruction: the model writes a brief plan in
 * a <thinking> block, then the code — all in one response, no separate planning
 * API call. Shared verbatim by the benchmark harness (lib/generation.ts) and
 * production (app/api/create-chat) so the two never drift.
 */
export const INLINE_PLAN_INSTRUCTION =
  "Before writing any code files, first write a brief implementation plan inside a single <thinking>...</thinking> block. List the MVP features you will build and the files you will create (with their paths), keeping it concise. After the closing </thinking>, emit all the code files in the fenced format above. Everything — the plan and the code — must be in this one response.";

/**
 * The production coding system prompt: the benchmark-winning `minimal-v1` prompt
 * (clean, no few-shot examples, allowed stack generated from PREVIEW_DEPS) plus
 * the `inline` plan-first instruction. This is the locked winning config
 * (`minimal-v1` × `inline`) from the 2026-07-03 benchmark campaign.
 */
export function buildProductionCodingPrompt(): string {
  return buildMinimalCodingPrompt(DEFAULT_PROMPT_CONFIG) + "\n\n" + INLINE_PLAN_INSTRUCTION;
}

/**
 * Build a compact, section-structured system prompt from `config`.
 *
 * Sections (in order): identity, allowed stack, forbidden, output format,
 * renderer contract, guardrails, reasoning, then optional component docs and
 * examples. Component docs and examples are imported from the single sources
 * of truth (`./shadcn-docs`, `./shadcn-examples`) so they can never drift from
 * the current prompt — they are never pasted as copies.
 *
 * The output-format section reproduces verbatim the code-fence convention that
 * `extractAllCodeBlocks` in `lib/utils.ts` parses (```tsx{path=src/App.tsx}),
 * so existing parsing keeps working unchanged.
 */
export function buildMinimalCodingPrompt(config: PromptConfig): string {
  const allowedStack = buildAllowedStack();

  let prompt = dedent`
    # LlamaCoder

    You are LlamaCoder, an expert frontend React engineer and UI/UX designer. Your job is to take a user's idea and produce a single small working React + TypeScript app — complete, runnable code split across a few files, using the allowed stack below. Be concise, correct, and ship a working MVP.

    ## Allowed stack

    Import only the packages listed here, each at its pinned version (do not introduce any other dependency). Pin the runtime to:
    ${allowedStack}
    - React, TypeScript, and Tailwind CSS classes (standard utilities only — see Forbidden).
    - The preloaded shadcn/ui components already available under \`@/components/ui\` (import them; never redefine them).

    ## Forbidden

    Do NOT use any of the following:
    - \`@chakra-ui/react\`
    - \`@headlessui/react\`
    - \`axios\` (use the browser's native \`fetch\` instead)
    - Arbitrary Tailwind bracket values such as \`w-[100px]\`, \`h-[600px]\`, \`bg-[#123456]\`, or \`text-[14px]\`
    - React Router (no routing — single page only)

    Import every package from its root specifier only. NEVER import a subpath of a package (e.g. \`recharts/charts\` or \`date-fns/format\`); import the package name and destructure what you need.

    ## Output format

    Generate complete React applications as multiple files. The entry point is \`App.tsx\`.

    **File Format:**
    - Each file in separate fenced block with path:
      \`\`\`tsx{path=src/App.tsx}
      // file content here
      \`\`\`
    - REQUIRED: Every file MUST use the exact fence format above with \`{path=...}\`
    - REQUIRED: The first line INSIDE the fence must be code, never a filename
    - NEVER output a plain \`\`\`tsx fence without \`{path=...}\`
    - NEVER output a file list or file names outside code fences
    - Full relative paths from project root
    - Only output changed files in iterations
    - Maintain stable file paths
    - ALWAYS create multiple files - never put all code in one file

    **Critical Rules:**
    - NEVER output shadcn/ui component definitions — they are already installed
    - Only create your own custom components and pages
    - Use imports to reference existing shadcn/ui components

    ## Renderer contract

    The browser preview resolves these path aliases — import through them, do not recreate them:
    - \`@/components/*\`
    - \`@/lib/*\`
    - \`@/utils/*\`
    - \`@/types/*\`

    \`lib/utils.ts\` and everything under \`components/ui/*\` already exist and are injected into the preview. You MUST NEVER rewrite or re-export them. Import \`cn\` from \`@/lib/utils\` when you need it; do not redefine it.

    ## Guardrails

    - Single page only — no routing, no multi-page navigation.
    - No backend and no external API calls; the app runs entirely in the browser.
    - Target 2-3 MVP features at most — build one thing well rather than many things partially.
    - Output at most ${config.maxFiles} files total.
    - Complete, runnable code with no placeholders.

    ## Reasoning

    Put any reasoning or planning inside a single \`<thinking>...</thinking>\` block. Your final answer, after the closing \`</thinking>\`, must consist only of valid code files in the fence format above — no prose, no summaries, no file lists outside the fences.
  `;

  // Variant v2 differs from v1 (the default) in exactly two ways, applied here
  // to the already-rendered prompt so the v1 `dedent` template above — and thus
  // the v1/undefined output — stays byte-identical. Both tweaks target text
  // that `dedent` always emits verbatim regardless of config flags, so the
  // substitutions below are stable for every config combination.
  if (config.promptVariant === "v2") {
    prompt = applyMinimalV2Tweaks(prompt);
  }

  // Variant v3 = v1 + a `## Design quality` section appended after the
  // Reasoning section (and before any component-docs/examples sections). It
  // does NOT apply the v2 tweaks, so the v1/undefined/v2 outputs stay
  // byte-identical to today; only the v3 path appends this block.
  if (config.promptVariant === "v3") {
    prompt = applyMinimalV3Tweaks(prompt);
  }

  // Variant v4 = v1 + a `## Modern patterns` section appended after the
  // Reasoning section (and before any component-docs/examples sections). It
  // does NOT apply the v2 or v3 tweaks, so the v1/undefined/v2/v3 outputs stay
  // byte-identical to today; only the v4 path appends this block.
  if (config.promptVariant === "v4") {
    prompt = applyMinimalV4Tweaks(prompt);
  }

  if (config.includeComponentDocs) {
    prompt += "\n\n" + buildComponentDocsSection();
  }

  if (config.includeExamples) {
    prompt += "\n\n" + buildExamplesSection();
  }

  return prompt;
}

/**
 * Apply the two minimal-v2-only differences to an already-rendered v1 prompt.
 *
 * (tweak 1 — phantom-import self-check) Under the `**File Format:**` bullet
 * list, add one final bullet requiring every relative import (`./` or `../`)
 * to resolve to a file emitted in the same response.
 *
 * (tweak 4 — arbitrary-Tailwind-bracket-values ban removed) Omit the
 * `## Forbidden` bullet about arbitrary Tailwind bracket values such as
 * `w-[100px]`, `h-[600px]`, `bg-[#123456]`, or `text-[14px]`.
 *
 * No other text changes. The targeted substrings are emitted verbatim by the
 * `dedent` template for every config combination, so these replacements are
 * stable and the v1 path (which never calls this) is untouched.
 */
function applyMinimalV2Tweaks(prompt: string): string {
  const tailwindBullet =
    "- Arbitrary Tailwind bracket values such as `w-[100px]`, `h-[600px]`, `bg-[#123456]`, or `text-[14px]`\n";
  const lastFormatBullet = "- ALWAYS create multiple files - never put all code in one file\n";
  const phantomImportBullet =
    "- REQUIRED: Every relative import (./ or ../) MUST resolve to a file you also emit in this same response. Before finishing, re-check each relative import has a matching emitted file — never import a component, hook, or module you did not create.\n";

  if (!prompt.includes(tailwindBullet) || !prompt.includes(lastFormatBullet)) {
    throw new Error(
      "applyMinimalV2Tweaks: expected minimal-prompt substrings not found; the v1 template may have changed.",
    );
  }

  // tweak 4: remove the arbitrary-Tailwind-bracket-values forbidden bullet
  // (including its trailing newline) so the React Router bullet follows axios.
  let result = prompt.replace(tailwindBullet, "");

  // tweak 1: append the phantom-import self-check as the final File Format
  // bullet, immediately before the blank line + `**Critical Rules:**`.
  result = result.replace(lastFormatBullet, lastFormatBullet + phantomImportBullet);

  return result;
}

/**
 * Apply the minimal-v3-only difference to an already-rendered v1 prompt:
 * append a `## Design quality` section, preceded by two newlines, to the end
 * of the prompt. Unlike v2, this changes nothing else in the v1 template — the
 * forbidden bullet, File Format bullets, etc. all stay verbatim. It is called
 * after the base prompt is rendered (and before any component-docs / examples
 * sections are appended), so the Design quality section lands right after the
 * `## Reasoning` section.
 */
function applyMinimalV3Tweaks(prompt: string): string {
  const designQualitySection = dedent`
    ## Design quality

    Aim for a distinctive, polished interface — never generic 'AI-generated' defaults. Apply:
    - Type hierarchy: a clear size/weight ladder readable at a glance; use font-serif or font-mono deliberately for headings when it suits the app's genre, not everywhere. Avoid flat, single-weight text.
    - Restrained color: pick ONE anchor hue; keep the accent under ~5% of the surface; use solid, softly-tinted neutral backgrounds (warm or cool grays, not pure white) — never purple/blue gradient backgrounds.
    - Spacing rhythm: use Tailwind's spacing scale consistently (p-4, gap-6, etc.); never arbitrary pixel values.
    - Intentional layout: bias the composition (asymmetric margins, a dominant column) instead of centering everything; vary card sizes and alignment rather than a uniform grid of identical rounded rectangles.
    - Real states: implement hover, focus, empty, and loading states — not just the happy path.
    - Subtle motion: quick, purposeful ease-out transitions on interactive elements; respect prefers-reduced-motion.
    - Polish over quantity: better one refined feature than three rough ones. If a detail would look unfinished, cut it.
  `;
  return prompt + "\n\n" + designQualitySection;
}

/**
 * Apply the minimal-v4-only difference to an already-rendered v1 prompt:
 * append a `## Modern patterns` section, preceded by two newlines, to the end
 * of the prompt. Like v3, this changes nothing else in the v1 template. It is
 * called after the base prompt is rendered (and before any component-docs /
 * examples sections are appended), so the section lands right after the
 * `## Reasoning` section.
 */
function applyMinimalV4Tweaks(prompt: string): string {
  const modernPatternsSection = dedent`
    ## Modern patterns

    Write idiomatic, modern React and CSS:
    - Lay out with flexbox and CSS grid (Tailwind flex/grid utilities). Never use absolute positioning for page structure or manual pixel math for alignment.
    - Use semantic HTML: <button> for actions, <nav>/<main>/<header>/<section>, and <label> tied to each input. Avoid a div for everything.
    - Function components and hooks only; controlled inputs; derive state from existing state instead of duplicating it.
    - Prefer native browser APIs (fetch, Intl, Date, structuredClone) over adding helper libraries.
  `;
  return prompt + "\n\n" + modernPatternsSection;
}

/**
 * Allowed-stack block: package name + pinned version, one per line, generated by
 * iterating `PREVIEW_DEPS`. This keeps the prompt and the renderer's import map
 * in sync by construction.
 */
function buildAllowedStack(): string {
  return Object.entries(PREVIEW_DEPS)
    .map(([name, version]) => `- ${name}@${version}`)
    .join("\n");
}

/**
 * Component-docs section: the same content `getMainCodingPrompt` embeds today,
 * imported from `lib/shadcn-docs` so it can never drift.
 */
function buildComponentDocsSection(): string {
  const docs = shadcnDocs
    .map((component) => `- ${component.name}: ${component.importDocs}`)
    .join("\n");
  return dedent`
    ## Component docs

    Preloaded shadcn/ui components (import these; never redefine them):
    ${docs}
  `;
}

/**
 * Examples section: the same few-shot examples the current prompt path uses today,
 * imported from `lib/shadcn-examples` so they can never drift.
 */
function buildExamplesSection(): string {
  const entries = Object.entries(examples).map(
    ([name, example]) =>
      `### Example: ${name}\n\nUser: ${example.prompt}\n\nAssistant:\n${example.response}`,
  );
  return dedent`
    ## Examples

    The following are reference examples of the expected output format and structure. Use them to calibrate your own output; do not copy them literally for unrelated prompts.

    ${entries.join("\n\n")}
  `;
}
