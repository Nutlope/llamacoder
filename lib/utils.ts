import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function splitByFirstCodeFence(markdown: string) {
  const result: {
    type: "text" | "first-code-fence" | "first-code-fence-generating";
    content: string;
    filename: { name: string; extension: string };
    language: string;
  }[] = [];

  const lines = markdown.split("\n");

  let inFirstCodeFence = false; // Are we currently inside the first code fence?
  let codeFenceFound = false; // Have we fully closed the first code fence?
  let textBuffer: string[] = [];
  let codeBuffer: string[] = [];

  // We'll store these when we open the code fence
  let fenceTag = ""; // e.g. "tsx{filename=Calculator.tsx}"
  let extractedFilename: string | null = null;

  // Regex to match an entire code fence line, e.g. ```tsx{filename=Calculator.tsx}
  const codeFenceRegex = /^```([^\n]*)$/;

  for (const line of lines) {
    const match = line.match(codeFenceRegex);

    if (!codeFenceFound) {
      if (match && !inFirstCodeFence) {
        // -- OPENING the first code fence --
        inFirstCodeFence = true;
        fenceTag = match[1] || ""; // e.g. tsx{filename=Calculator.tsx}

        // Attempt to extract filename from {filename=...}
        const fileMatch = fenceTag.match(/{\s*filename\s*=\s*([^}]+)\s*}/);
        extractedFilename = fileMatch ? fileMatch[1] : null;

        // Flush any accumulated text into the result
        if (textBuffer.length > 0) {
          result.push({
            type: "text",
            content: textBuffer.join("\n"),
            filename: { name: "", extension: "" },
            language: "",
          });
          textBuffer = [];
        }
        // Don't add the fence line itself to codeBuffer
      } else if (match && inFirstCodeFence) {
        // -- CLOSING the first code fence --
        inFirstCodeFence = false;
        codeFenceFound = true;

        // Parse the extracted filename into { name, extension }
        const parsedFilename = extractedFilename
          ? parseFileName(extractedFilename)
          : { name: "", extension: "" };

        // Extract language from the portion of fenceTag before '{'
        const bracketIndex = fenceTag.indexOf("{");
        const language =
          bracketIndex > -1
            ? fenceTag.substring(0, bracketIndex).trim()
            : fenceTag.trim();

        result.push({
          type: "first-code-fence",
          // content: `\`\`\`${fenceTag}\n${codeBuffer.join("\n")}\n\`\`\``,
          content: codeBuffer.join("\n"),
          filename: parsedFilename,
          language,
        });

        // Reset code buffer
        codeBuffer = [];
      } else if (inFirstCodeFence) {
        // We are inside the first code fence
        codeBuffer.push(line);
      } else {
        // Outside any code fence
        textBuffer.push(line);
      }
    } else {
      // The first code fence has already been processed; treat all remaining lines as text
      textBuffer.push(line);
    }
  }

  // If the first code fence was never closed
  if (inFirstCodeFence) {
    const parsedFilename = extractedFilename
      ? parseFileName(extractedFilename)
      : { name: "", extension: "" };

    // Extract language from the portion of fenceTag before '{'
    const bracketIndex = fenceTag.indexOf("{");
    const language =
      bracketIndex > -1
        ? fenceTag.substring(0, bracketIndex).trim()
        : fenceTag.trim();

    result.push({
      type: "first-code-fence-generating",
      // content: `\`\`\`${fenceTag}\n${codeBuffer.join("\n")}`,
      content: codeBuffer.join("\n"),
      filename: parsedFilename,
      language,
    });
  } else if (textBuffer.length > 0) {
    // Flush any remaining text
    result.push({
      type: "text",
      content: textBuffer.join("\n"),
      filename: { name: "", extension: "" },
      language: "",
    });
  }

  return result;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
