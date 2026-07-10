// Legacy model IDs → current serverless replacements. resolveModel() maps these
// so existing chats/DB rows that reference an old ID keep working.
export const MODEL_ALIASES: Record<string, string> = {
  "zai-org/GLM-4.6": "zai-org/GLM-5.2",
  "zai-org/GLM-5": "zai-org/GLM-5.2",
  "zai-org/GLM-5.1": "zai-org/GLM-5.2",
  "Qwen/Qwen2.5-Coder-32B-Instruct": "zai-org/GLM-5.2",
  "MiniMaxAI/MiniMax-M2.5": "MiniMaxAI/MiniMax-M3",
  "MiniMaxAI/MiniMax-M2.7": "MiniMaxAI/MiniMax-M3",
  "moonshotai/Kimi-K2.5": "moonshotai/Kimi-K2.7-Code",
  "moonshotai/Kimi-K2-Instruct-0905": "moonshotai/Kimi-K2.7-Code",
  "deepseek-ai/DeepSeek-V3.1": "moonshotai/Kimi-K2.7-Code",
  "Qwen/Qwen3-Coder-Next-FP8": "Qwen/Qwen3-235B-A22B-Instruct-2507-FP8",
  "Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8": "Qwen/Qwen3-235B-A22B-Instruct-2507-FP8",
};

export function resolveModel(model: string): string {
  return MODEL_ALIASES[model] ?? model;
}

// Model used for the high-quality "software architect" plan step in
// create-chat. Must support non-streaming completions (create-chat calls it
// with stream=false). Qwen3-Coder-* are now non-serverless on Together.
export const PLANNING_MODEL = "Qwen/Qwen3-235B-A22B-Instruct-2507-FP8";

export type ModelOption = {
  label: string;
  value: string;
  hidden?: boolean;
  // Optional muted hint shown next to the label in the picker (e.g. "slower").
  note?: string;
};

// Selectable (non-hidden) models are the fast, reliable set plus Nemotron 3
// Ultra (fast on serverless). Qwen3.7 Max, MiniMax M3 and the old Qwen 3 235B
// were dropped from the picker for slow/inconsistent serverless throughput,
// but stay here as hidden entries so existing chats and MODEL_ALIASES keep
// resolving them.
export const MODELS: ModelOption[] = [
  {
    label: "GLM 5.2",
    value: "zai-org/GLM-5.2",
  },
  {
    label: "Kimi K2.7 Code",
    value: "moonshotai/Kimi-K2.7-Code",
  },
  {
    label: "Kimi K2.6",
    value: "moonshotai/Kimi-K2.6",
  },
  {
    label: "Nemotron 3 Ultra",
    value: "nvidia/nemotron-3-ultra-550b-a55b",
  },
  {
    label: "Qwen3.7 Max",
    value: "Qwen/Qwen3.7-Max",
    hidden: true,
  },
  {
    label: "MiniMax M3",
    value: "MiniMaxAI/MiniMax-M3",
    hidden: true,
  },
  {
    label: "Qwen 3 235B",
    value: "Qwen/Qwen3-235B-A22B-Instruct-2507-FP8",
    hidden: true,
  },
  {
    label: "DeepSeek V3",
    value: "deepseek-ai/DeepSeek-V3",
    hidden: true,
  },
  {
    label: "Qwen 3 235B",
    value: "Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
    hidden: true,
  },
  {
    label: "Llama 3.3 70B",
    value: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    hidden: true,
  },
];

export const SUGGESTED_PROMPTS = [
  {
    title: "Sneaker Drop",
    description:
      "Build a one-page landing page for a limited sneaker drop: a bold hero with the drop name and release tagline, a short 'the drop' block listing the colorways with their release times, and a release-date call-to-action. Aesthetic: loud, athletic, and confident, with a light background, one saturated accent, chunky bold display type, and tight, punchy spacing.",
  },
  {
    title: "Expense Tracker",
    description:
      "Make a personal expense tracker where I can log expenses with categories like food, transport, and entertainment. Show a monthly breakdown with interactive pie and bar charts plus a running total. Aesthetic: a calm, cool financial-ledger feel, with a serif display heading over a tight, gridded data layout.",
  },
  {
    title: "Sourdough",
    description:
      "Build a one-page site for a sourdough bakery: a hero introducing the bakery and its signature loaf, a fermentation timeline shown as a day-by-day horizontal sequence, and a 'today's bake' schedule. Aesthetic: warm, editorial, and hand-made, like a small bakery's own printed booklet.",
  },
  {
    title: "Team Chat",
    description:
      "Build a one-page team chat app: a sidebar listing a few channels and direct messages, a main pane showing the selected channel's message thread, and a composer to send a message. Seed a few channels and messages, and append new messages locally. Aesthetic: a clean SaaS app shell, with a sidebar plus a content area, a calm neutral base, and one accent for the active channel and the send button.",
  },
  {
    title: "Beat Maker",
    description:
      "Build a one-page beat maker: a step-sequencer grid of a few drum sounds across 8 or 16 steps, a play/stop button, and a tempo slider. Tapping a cell arms it, and play loops through the steps, triggering each sound with the Web Audio API (synthesize the sounds, no external samples). Aesthetic: a bold, playful grid, with bright accent pads on a dark surface and chunky controls.",
  },
  {
    title: "Palette",
    description:
      "Build a one-page color palette generator: a row of five swatches, a button to generate a new harmonious palette, and the ability to lock individual swatches so they survive regeneration. Show each color's hex value and copy it on click. Aesthetic: a clean design-tool feel, with big full-bleed swatches, minimal chrome, and the palette as the page.",
  },
];
