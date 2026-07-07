import dedent from "dedent";
import {
  getPreviewDependencies,
  listInjectedComponentNames,
  type PreviewUiLibrary,
} from "./preview/files";
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
   * When `"v5"`, it appends a `## Scope discipline` section and does NOT apply
   * the v2, v3, or v4 tweaks. When `"v6"`, it appends a `## Self-check`
   * section. When `"v7"`, it appends a `## Output contract` section. These
  * variants do NOT apply the earlier tweaks. When `"v8"`, it appends a
  * `## Available components` section listing the renderer's actual injected UI
  * components (auto-generated via `listInjectedComponentNames`). It does NOT
  * apply earlier variant tweaks. No other differences. When `"v9"`, it appends
  * the same `## Available components` section as v8 but sourced from the Base
  * UI component set (`listInjectedComponentNames("baseui")`) instead of the
  * Radix/shadcn set. Only the component list content differs; surrounding
  * wording is byte-identical to v8.
  */
  promptVariant?:
    | "v1"
    | "v2"
    | "v3"
    | "v4"
    | "v5"
    | "v6"
    | "v7"
    | "v3b"
    | "v8"
    | "v9"
    | "v10"
    | "v11";
  /**
   * Which injected component library the prompt targets. Controls the
   * allowed-stack list (generated from that library's deps). Defaults to
   * "radix" so every existing variant stays byte-identical.
   */
  uiLibrary?: PreviewUiLibrary;
};

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  includeExamples: false,
  includeComponentDocs: true,
  maxFiles: 5,
};

/**
 * The production design rubric: four punchy bullets covering the highest-impact
 * visual levers (whitespace, type hierarchy, one accent color, soft depth). Kept
 * short so it stays cheap. Shared verbatim by the shipped production prompt and
 * the `minimal-v10` benchmark variant so the two can never drift. Visual A/B
 * (GLM 5.2, dashboard + todo, 2026-07-07) showed a clear prettiness win over the
 * rubric-less baseline once the preview padding fix was in place.
 */
export const PRODUCTION_DESIGN_SECTION = dedent`
  ## Design

  Make it look intentionally designed, not a default prototype:
  - Generous whitespace and padding so the UI breathes — roomy card/section padding (p-6/p-8) and clear spacing between elements (gap-4/gap-6).
  - Strong type hierarchy: large, bold headings (text-2xl/text-3xl, font-semibold) with clear contrast to smaller muted body text (text-muted-foreground).
  - Pick ONE accent color and use it purposefully for primary actions and highlights; keep everything else neutral. Never use default-looking unstyled elements.
  - Soft depth and polish: subtle shadows (shadow-sm/shadow-md), rounded corners (rounded-lg/rounded-xl), clear card boundaries, and hover states on interactive elements.
`;

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
  // Ships the Base UI direction: allowed-stack generated from the Base UI deps,
  // the full Base UI component inventory listed, plus the inline plan-first
  // instruction. Benchmarked (minimal-v9 × inline × baseui, 2026-07-05): quality
  // parity with Radix, ~22% faster, and the missing-component failure class gone.
  const base = buildMinimalCodingPrompt({
    ...DEFAULT_PROMPT_CONFIG,
    uiLibrary: "baseui",
  });
  return (
    base +
    "\n\n" +
    buildAvailableComponentsSection("baseui") +
    "\n\n" +
    // Ships the stronger Hallmark-informed rubric (minimal-v11). The gentler
    // PRODUCTION_DESIGN_SECTION (minimal-v10) still produced flat/white output
    // — its "keep everything neutral" line suppressed color. Visual A/B on GLM
    // 5.2 (dashboard + todo, 2026-07-07) showed HALLMARK_DESIGN_SECTION is a
    // dramatic win: real palettes, serif display type, depth, biased layouts.
    HALLMARK_DESIGN_SECTION +
    "\n\n" +
    INLINE_PLAN_INSTRUCTION
  );
}

/**
 * A stronger, color-forward design rubric informed by the Hallmark design skill
 * (usehallmark.com): commit to a real palette instead of grayscale, layer depth
 * and tinted surfaces, pair a display face with a body face, bias the layout,
 * and actively dodge the recognizable "AI-generated" tells (purple-gradient
 * heroes, centered-everything, generic icon-tile grids). Aimed at fixing the
 * flat/white/barebone output the v10 rubric still produced ("keep everything
 * neutral" was actively suppressing color). Under A/B evaluation as `minimal-v11`.
 */
export const HALLMARK_DESIGN_SECTION = dedent`
  ## Design

  Ship a distinctive, intentionally-designed interface — never a flat white wireframe or a generic "AI-generated" page. A screen that is only black text on a white background is a failure.

  - COMMIT TO COLOR. Choose a real palette anchored on one rich hue (e.g. deep indigo, emerald, teal, amber, rose) and actually use it: tinted surfaces (bg-slate-50, bg-indigo-50), colored stat/icon chips, colored primary buttons, a colored or subtly gradient header band. Do NOT default to the cliché purple→blue hero gradient — that reads as AI-generated; pick a less obvious color story.
  - BUILD DEPTH. Layer the UI so cards read as real objects: soft shadows (shadow-sm/shadow-md), generous rounding (rounded-xl/rounded-2xl), hairline borders, and gently tinted section backgrounds — never bare panels floating on pure white.
  - STRONG TYPE HIERARCHY. A clear size/weight ladder (large bold display headings text-2xl/text-3xl/font-bold → muted text-sm body via text-muted-foreground). Use font-serif for a display heading when it fits the app's character, so headings and body don't share one flat voice.
  - BIAS THE LAYOUT. Don't center one narrow column on an empty page. Use a real header/toolbar, an asymmetric or dominant content column, and varied card sizes. "Centered everything" and a uniform grid of identical rounded rectangles are AI tells — break them up.
  - POLISH. Generous spacing on the 4-scale (p-6/p-8, gap-4/gap-6), hover/active states on every interactive element, and considered empty/loading states — not just the happy path.
`;

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
  const allowedStack = buildAllowedStack(config.uiLibrary ?? "radix");

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

  // Variant v5 = v1 + a `## Scope discipline` section. It does NOT apply the
  // v2/v3/v4 tweaks, so only the v5 path appends this block.
  if (config.promptVariant === "v5") {
    prompt = applyMinimalV5Tweaks(prompt);
  }

  // Variant v6 = v1 + a `## Self-check` section. It does NOT apply earlier
  // variant tweaks.
  if (config.promptVariant === "v6") {
    prompt = applyMinimalV6Tweaks(prompt);
  }

  // Variant v7 = v1 + a stricter `## Output contract` section only.
  if (config.promptVariant === "v7") {
    prompt = applyMinimalV7Tweaks(prompt);
  }

  // Variant v3b = v1 + a compact `## Design quality` section (~half the
  // length of v3's). It does NOT apply the v2/v3/v4/v5/v6/v7 tweaks, so only
  // the v3b path appends this block.
  if (config.promptVariant === "v3b") {
    prompt = applyMinimalV3bTweaks(prompt);
  }

  // Variant v8 = v1 + a `## Available components` section listing the
  // renderer's actual injected UI components (auto-generated from
  // listInjectedComponentNames, so it can never drift from the injected set).
  // It does NOT apply earlier variant tweaks.
  if (config.promptVariant === "v8") {
    prompt = applyMinimalV8Tweaks(prompt);
  }

  // Variant v9 = v8's `## Available components` section but sourced from the
  // Base UI component set instead of the Radix/shadcn set. Only the component
  // list content differs from v8; the surrounding wording is byte-identical.
  if (config.promptVariant === "v9") {
    prompt = applyMinimalV9Tweaks(prompt);
  }

  // Variant v10 = v9 (Base UI component list) + a small, sharp `## Design`
  // section. Re-tested after the preview padding fix, which the earlier v3/v3b
  // rubric tests were confounded by.
  if (config.promptVariant === "v10") {
    prompt = applyMinimalV10Tweaks(prompt);
  }

  // Variant v11 = v9 (Base UI component list) + the stronger, color-forward
  // HALLMARK_DESIGN_SECTION. Under A/B evaluation vs v10.
  if (config.promptVariant === "v11") {
    prompt = applyMinimalV11Tweaks(prompt);
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
 * Apply the minimal-v3b-only difference to an already-rendered v1 prompt:
 * append a compact `## Design quality` section (~half the length of v3's),
 * preceded by two newlines, to the end of the prompt. Like v3, this changes
 * nothing else in the v1 template. Called after the base prompt is rendered
 * (and before any component-docs / examples sections are appended), so the
 * section lands right after the `## Reasoning` section.
 */
function applyMinimalV3bTweaks(prompt: string): string {
  const designQualitySection = dedent`
    ## Design quality

    Make it look intentional, not generic:
    - One anchor hue; keep accent color small; use solid, softly-tinted neutral backgrounds — never gradient backgrounds.
    - Clear type hierarchy: distinct heading vs body sizes and weights.
    - Bias the layout (asymmetric margins, one dominant column) instead of centering everything; vary card sizes rather than a uniform grid.
    - Real hover, focus, and empty states — not just the happy path.
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
 * Apply the minimal-v5-only difference to an already-rendered v1 prompt.
 */
function applyMinimalV5Tweaks(prompt: string): string {
  const scopeDisciplineSection = dedent`
    ## Scope discipline

    Build one polished core workflow, not a feature list:
    - Prefer 2-3 source files; split only when it clearly separates state, reusable UI, or data.
    - Finish the primary workflow completely before adding extras, with real empty, error, success, and disabled states where relevant.
    - Avoid optional nice-to-haves, fake navigation, marketing sections, unused sample data, and decorative code that does not support the user's main goal.
    - Keep state local and simple; avoid over-engineered abstractions, duplicated derived state, and helper files for tiny logic.
  `;
  return prompt + "\n\n" + scopeDisciplineSection;
}

/**
 * Apply the minimal-v6-only difference to an already-rendered v1 prompt.
 */
function applyMinimalV6Tweaks(prompt: string): string {
  const selfCheckSection = dedent`
    ## Self-check

    Inside the single <thinking> block, after the implementation plan, add a short "Risk check" with exactly two bullets:
    - Missing imports/files: verify every relative import resolves to a file you emit, and every @/components/ui or @/hooks import exists in the injected renderer. If unsure, use plain React and Tailwind instead.
    - Runtime states: identify the one interaction, empty state, or disabled state most likely to break, then handle it before emitting code.

    Do not mention the risk check outside <thinking>; after </thinking>, output only code fences.
  `;
  return prompt + "\n\n" + selfCheckSection;
}

/**
 * Apply the minimal-v7-only difference to an already-rendered v1 prompt.
 */
function applyMinimalV7Tweaks(prompt: string): string {
  const outputContractSection = dedent`
    ## Output contract

    Follow this contract exactly after </thinking>:
    - The first emitted file MUST be \`src/App.tsx\`. Do not emit \`src/main.tsx\`, \`main.tsx\`, \`index.tsx\`, or any custom React bootstrapping file; the renderer already mounts App.
    - Emit one fenced block per file, using exactly \`\`\`tsx{path=src/SomeFile.tsx}\` as the fence header. No markdown headings, bullets, filenames, explanations, or summaries outside fences.
    - Keep every emitted file path under \`src/\`. Do not emit duplicate paths or two files with the same component.
    - Every relative import (\`./\` or \`../\`) must resolve to another file you emit in the same response. If a component is tiny, keep it in the importing file instead of creating an import edge.
  `;
  return prompt + "\n\n" + outputContractSection;
}

/**
 * Apply the minimal-v8-only difference to an already-rendered v1 prompt:
 * append a `## Available components` section listing the renderer's actual
 * injected UI components (auto-generated via listInjectedComponentNames), so
 * the list can never drift from the injected set. Changes nothing else in the
 * v1 template. Called after the base prompt is rendered (and before any
 * component-docs / examples sections are appended), so the section lands
 * right after the `## Reasoning` section.
 */
function applyMinimalV8Tweaks(prompt: string): string {
  return prompt + "\n\n" + buildAvailableComponentsSection("radix");
}

/**
 * Variant v9 = v8's `## Available components` section but with the Base UI
 * component set instead of the Radix/shadcn set. The surrounding wording is
 * byte-identical to `applyMinimalV8Tweaks`; only the component list source
 * changes (baseui instead of radix).
 */
function applyMinimalV9Tweaks(prompt: string): string {
  return prompt + "\n\n" + buildAvailableComponentsSection("baseui");
}

/**
 * Variant v10 = v9 (Base UI component list) + a small, sharp `## Design`
 * section — the highest-impact visual levers, kept to four punchy bullets so it
 * stays cheap. Aimed at making GLM's apps look intentionally designed.
 */
function applyMinimalV10Tweaks(prompt: string): string {
  return (
    prompt +
    "\n\n" +
    buildAvailableComponentsSection("baseui") +
    "\n\n" +
    PRODUCTION_DESIGN_SECTION
  );
}

/**
 * Variant v11 = v9 (Base UI component list) + the stronger, color-forward
 * HALLMARK_DESIGN_SECTION (vs v10's gentler PRODUCTION_DESIGN_SECTION).
 */
function applyMinimalV11Tweaks(prompt: string): string {
  return (
    prompt +
    "\n\n" +
    buildAvailableComponentsSection("baseui") +
    "\n\n" +
    HALLMARK_DESIGN_SECTION
  );
}

/**
 * Allowed-stack block: package name + pinned version, one per line, generated by
 * iterating `PREVIEW_DEPS`. This keeps the prompt and the renderer's import map
 * in sync by construction.
 */
function buildAllowedStack(uiLibrary: PreviewUiLibrary = "radix"): string {
  return Object.entries(getPreviewDependencies(uiLibrary))
    .map(([name, version]) => `- ${name}@${version}`)
    .join("\n");
}

/**
 * The `## Available components` section: an auto-generated inventory of the
 * components the renderer actually injects for `uiLibrary`, so the model
 * composes from them instead of reinventing or guessing. Shared by the v8/v9
 * variants and the production prompt.
 */
function buildAvailableComponentsSection(
  uiLibrary: PreviewUiLibrary,
): string {
  const components = listInjectedComponentNames(uiLibrary).join(", ");
  return dedent`
    ## Available components

    These UI components already exist under \`@/components/ui\` — import and compose them; NEVER recreate or redefine them:
    ${components}

    Import them by name, e.g. \`import { Button } from "@/components/ui/button"\`. If you need a component that is NOT in this list, build it yourself with plain React + Tailwind (do not import a non-listed component).
  `;
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
