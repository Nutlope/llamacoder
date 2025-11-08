# Code Editing Workflow Discussion

## Current Data Flow

- **Prompt to AI**: User message + entire current codebase (all file contents)
- **AI Response**: Entire new codebase (all files, even unchanged)
- **Why full codebase in prompt**: ChatCompletion is stateless - no persistent memory, so AI needs full context each time
- **Frontend storage**: Files exist only in browser state

## Problems

- Inefficient: Full codebase in prompt + full response for every tweak
- Token waste: Regenerating unchanged files
- Slow for large apps: Processing entire codebase repeatedly

## Desired Data Flow

- **Prompt to AI**: User message + entire current codebase (full contents, as before)
- **AI Response**: Only changed files using existing code fence format (not full codebase)
- **Agent Simulation**: AI "reads" files from prompt context, reasons about changes, outputs only modified files

## How to Implement

- **Prompt Structure**: Same as current (full codebase + user request)
- **AI Reasoning**: AI analyzes all provided files, determines which need changes
- **Response Format**: Use existing code fence syntax but only for changed files, e.g.:

  ````
  Here are the updated files:

  ```tsx{path=src/Header.tsx}
  // updated header content here
  ````

  ```tsx{path=src/App.tsx}
  // updated app content here
  ```

  ```

  ```

- **Frontend Parsing**: Stream response, extract only changed files via `extractAllCodeBlocks()`, update browser state

## Current Format Details

- Files specified with: ```language{path=file/path.ext}
- Parsed by `extractAllCodeBlocks()` in `lib/utils.ts`
- Supports multiple files per response
- No special markers needed - just output changed files in this format

## Open Questions

- How to instruct AI to only output changed files (not all files)?
- How to handle new files, deleted files, or renamed files?
- How to ensure AI includes all necessary changes without missing context?
- When to fall back to full codebase responses (e.g., major rewrites)?
