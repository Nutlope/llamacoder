# Architecture Evolution

## Current Setup (Gemini + LocalStorage)

_Message-based code generation with multi-file output and client-side persistence_

- Workflow: User request -> Gemini AI generates code (multiple files) -> Store in browser's `localStorage`
- Powered by Google Gemini AI SDK
- No backend database or cloud storage required
- Full chat history and generated apps kept locally in the user's browser

## Future Evolution

### Enhanced Client-Side Storage
- Migrate from `localStorage` to IndexedDB for larger storage capacity (supporting more screenshots and larger projects)
- Improved project management with local file system access API

### Autonomous AI Agent
- Fully autonomous development with comprehensive tool access
- Reasoning and planning across entire development workflow
