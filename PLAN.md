# Plan to Support Multiple Files in LLM-Generated Apps

## Overview

Extend the app from generating single-file "app.tsx" components to supporting multiple files per message, allowing the LLM to create more complex, multi-file React projects.

## Current Architecture Analysis

- **Prompt System**: Instructs LLM to generate one code block
- **Code Extraction**: `extractFirstCodeBlock()` and `splitByFirstCodeFence()` handle only first code fence
- **Code Display**: CodeViewer uses single extracted code block
- **Code Execution**: Sandpack hardcodes single "App.tsx" file
- **UI**: AppVersionButton shows file info
- **Storage**: Messages stored as text with embedded code fences

## Implementation Steps

### 1. Update LLM Prompt System ✅

- [x] Modify `getMainCodingPrompt()` in `lib/prompts.ts`
- [x] Change instructions to support multiple code blocks with filenames
- [x] Update from single file to multi-file format

### 2. Create Multi-File Code Extraction Utilities ✅

- [x] Add `extractAllCodeBlocks()` function in `lib/utils.ts`
- [x] Add `splitByAllCodeFences()` to replace `splitByFirstCodeFence()`
- [x] Maintain backward compatibility with single-file messages

### 3. Update Sandpack Configuration ✅

- [x] Modify `getSandpackConfig()` in `lib/sandpack-config.ts`
- [x] Change to accept `files: Record<string, string>` instead of single `code`
- [x] Dynamically create Sandpack files object from extracted code blocks
- [x] Set appropriate entry point (look for "App.tsx" or "index.tsx")

### 4. Enhance CodeViewer Component ✅

- [x] Update `app/(main)/chats/[id]/code-viewer.tsx` to handle multiple files
- [x] Add file tabs/navigation for switching between files
- [x] Pass all files to Sandpack instead of single code
- [x] Update file filtering logic for multi-file messages

### 5. Update Chat Display Logic ✅

- [x] Modify `app/(main)/chats/[id]/chat-log.tsx` to show multiple code blocks per message
- [x] Update `AssistantMessage` to render multiple `AppVersionButton` instances or consolidated view
- [x] Leverage updated `app-version-button.tsx` for file count display

### 6. Handle Message Selection and Active State ✅

- [x] Update `page.client.tsx` to track active file within active message
- [x] Modify click handlers to select specific files, not just messages
- [x] Update state management for file selection

### 7. Update Sharing Functionality ✅

- [x] Modify `app/share/v2/[messageId]/page.tsx` to handle multi-file messages
- [x] Show file selector or default to main entry point

### 8. Backward Compatibility ✅

- [x] Ensure single-file messages continue to work
- [x] Graceful fallback when multi-file parsing fails
- [x] Maintain existing UI patterns for single-file cases

### 9. Testing and Validation

- [ ] Test with various file structures (components, utils, types, etc.) - USER WILL TEST
- [ ] Ensure Sandpack correctly handles dependencies between files
- [ ] Validate LLM prompt produces properly formatted multi-file output

## Potential Challenges

1. LLM Prompt Engineering for consistent multi-file output
2. Handling file dependencies and imports
3. Entry point detection
4. UI complexity for multiple files
5. Performance with larger codebases

## Implementation Priority

1. High: Update utilities and Sandpack config
2. High: Modify CodeViewer for multi-file support
3. Medium: Update prompts and chat display
4. Low: Enhance sharing and advanced features
