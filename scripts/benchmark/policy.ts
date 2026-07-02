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
const TAILWIND_ARBITRARY_VALUE_REGEX =
  /\b(?:[a-z0-9-]+:)*[a-z][a-z0-9-]*-\[[^\]]+\]/gi;

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

    for (const match of file.content.matchAll(TAILWIND_ARBITRARY_VALUE_REGEX)) {
      violations.add(
        `${file.path}: arbitrary Tailwind value "${match[0]}" is forbidden`,
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
