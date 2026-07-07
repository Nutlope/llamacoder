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

export const MODELS = [
  {
    label: "GLM 5.2",
    value: "zai-org/GLM-5.2",
  },
  {
    label: "MiniMax M3",
    value: "MiniMaxAI/MiniMax-M3",
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
    label: "Qwen 3 235B",
    value: "Qwen/Qwen3-235B-A22B-Instruct-2507-FP8",
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
    title: "Calculator",
    description:
      "Make a scientific calculator with a history panel showing past calculations. Support basic arithmetic, percentages, parentheses, and common functions like square root and exponents. Aesthetic: a tactile desk-calculator feel — one confident accent color, rounded keys with real press states, a clear readable display.",
  },
  {
    title: "Expense Tracker",
    description:
      "Make a personal expense tracker where I can log expenses with categories like food, transport, and entertainment. Show a monthly breakdown with interactive pie and bar charts plus a running total. Aesthetic: a calm, cool financial-ledger feel — a serif display heading over a tight, gridded data layout.",
  },
  {
    title: "Sourdough Bakery",
    description:
      "Build a one-page site for a sourdough bakery's signature loaf, 'Hum': a hero introducing the loaf, a fermentation timeline shown as a day-by-day horizontal sequence, and a 'today's bake' schedule. Aesthetic: warm, editorial, hand-made — like a small-press zine for bakers.",
  },
  {
    title: "Record Label EP",
    description:
      "Build a one-page release site for an indie record label's new EP: a big album hero, a tracklist of five or six tracks with their lengths, and a short artist blurb with the release date. Aesthetic: late-night and moody — a single bright accent over dark surfaces, tight, bold, narrow-set type.",
  },
  {
    title: "Typographer Portfolio",
    description:
      "Build a one-page portfolio for a typographer: a huge display headline introducing them, a type-specimen section showing two or three type pairings (mix serif, sans, and mono), and a short list of selected projects. Aesthetic: minimal and type-led but asymmetrically laid out — lots of air, the typography is the whole page, one quiet accent.",
  },
  {
    title: "Repair Café Poster",
    description:
      "Build a one-page poster site for a neighborhood repair café's open day: a bold event title with date and location, a short 'what we fix' list, and a how-to-find-us block. Aesthetic: a risograph print poster — two flat ink colors on paper, bold geometric type, high-contrast and playful, intentionally flat with no shadows or gradients.",
  },
];
