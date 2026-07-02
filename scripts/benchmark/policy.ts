import { PREVIEW_DEPS } from "../../lib/preview/deps";
import type { GeneratedFile } from "./preview-runner";

const FORBIDDEN_IMPORTS = [
  "@chakra-ui/react",
  "@headlessui/react",
  "axios",
  "react-router-dom",
];

const IMPORT_SPECIFIER_REGEX =
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
const CLASS_TOKEN_REGEX = /[A-Za-z0-9_:/[\].%=#(),-]+/g;
const ARBITRARY_UTILITY_REGEX = /^[a-z][a-z0-9-]*-\[[^\]]+\]$/i;

const ROOT_ONLY_IMPORTS = Object.keys(PREVIEW_DEPS).sort(
  (left, right) => right.length - left.length,
);

export function findPolicyViolations(files: GeneratedFile[]): string[] {
  const violations = new Set<string>();

  for (const file of files) {
    for (const specifier of findImportSpecifiers(file.content)) {
      if (FORBIDDEN_IMPORTS.includes(specifier)) {
        violations.add(`${file.path}: forbidden import "${specifier}"`);
      }

      const rootPackage = ROOT_ONLY_IMPORTS.find((name) =>
        specifier.startsWith(`${name}/`),
      );

      if (rootPackage) {
        violations.add(
          `${file.path}: package subpath import "${specifier}" must use root specifier "${rootPackage}"`,
        );
      }
    }

    for (const match of findArbitraryTailwindUtilities(file.content)) {
      violations.add(
        `${file.path}: arbitrary Tailwind value "${match}" is forbidden`,
      );
    }
  }

  return Array.from(violations);
}

function findImportSpecifiers(content: string): string[] {
  const specifiers: string[] = [];

  for (const match of content.matchAll(IMPORT_SPECIFIER_REGEX)) {
    const specifier = match[1] ?? match[2];
    if (specifier && isBareSpecifier(specifier)) specifiers.push(specifier);
  }

  return specifiers;
}

function isBareSpecifier(specifier: string) {
  return (
    !specifier.startsWith(".") &&
    !specifier.startsWith("/") &&
    !specifier.startsWith("@/")
  );
}

function findArbitraryTailwindUtilities(content: string): string[] {
  const values = new Set<string>();

  for (const token of content.match(CLASS_TOKEN_REGEX) ?? []) {
    const utility = splitTailwindToken(token).at(-1);
    if (utility && ARBITRARY_UTILITY_REGEX.test(utility)) {
      values.add(utility);
    }
  }

  return Array.from(values);
}

function splitTailwindToken(token: string): string[] {
  const parts: string[] = [];
  let current = "";
  let bracketDepth = 0;

  for (const char of token) {
    if (char === "[") bracketDepth++;
    if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);

    if (char === ":" && bracketDepth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current) parts.push(current);
  return parts;
}
