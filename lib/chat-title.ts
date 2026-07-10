export function createLocalChatTitle(prompt: string) {
  const cleaned = prompt
    .replace(/\s+/g, " ")
    .replace(
      /^[\s"'`]*(build|make|create|generate|design)\s+(me\s+)?(a|an|the|one-page)?\s*/i,
      "",
    )
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 5);
  const title = words
    .map((word) =>
      word.length <= 3
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");

  return title || "New App";
}

export function cleanGeneratedChatTitle(title: string, fallback: string) {
  const cleaned = title
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .split("\n")
    .at(0)
    ?.trim();

  return cleaned ? cleaned.slice(0, 80) : fallback;
}
