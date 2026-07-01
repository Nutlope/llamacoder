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
    title: "Kanban Board",
    description:
      "Create a Kanban-style project board with columns for To Do, In Progress, and Done. Let users add, edit, and drag tasks between columns. Include task labels, due dates, and a clean minimal design.",
  },
  {
    title: "Landing Page",
    description:
      "Build a modern landing page for an AI startup with a bold hero section, an animated feature grid, a pricing table with three tiers, a testimonials carousel, and a waitlist signup form. Use smooth scroll animations and a sleek dark theme.",
  },
  {
    title: "Habit Tracker",
    description:
      "Build a daily habit tracker where I can add habits and check them off each day. Show a weekly streak view with a heatmap-style grid, track completion percentages, and celebrate streaks with animations.",
  },
  {
    title: "Expense Tracker",
    description:
      "Make a personal expense tracker where I can log expenses with categories like food, transport, and entertainment. Show a monthly breakdown with interactive pie and bar charts, and a running total.",
  },
  {
    title: "Workout Timer",
    description:
      "Make an interval workout timer for HIIT training. Let me configure work and rest durations, number of rounds, and exercises. Show a large countdown display with color changes for work vs rest, and play a sound when switching.",
  },
  {
    title: "Calculator",
    description:
      "Make a beautiful scientific calculator with a history panel that shows past calculations. Support basic arithmetic, percentages, parentheses, and common functions like square root and exponents. Style it with a modern glassmorphism design.",
  },
];
