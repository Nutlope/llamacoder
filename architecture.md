# Architecture Evolution

## Current Setup (Version 1)

```mermaid
sequenceDiagram
    participant U as User
    participant AI as AI

    U->>AI: Send message
    AI->>U: Generate code (single file)
    U->>AI: Send message with code (versioned)
    AI->>U: Extract code from all messages containing code strings and process
```

- Workflow: User request -> AI creates entire app.tsx -> Extract single code file from AI response
- User interactions via messages
- Code stored/extracted from message history
- Versioning through message chains

## Intermediate Version (Version 2)

```mermaid
sequenceDiagram
    participant U as User/Browser
    participant AI as AI

    U->>AI: Send message
    AI->>U: Generate multiple files in browser storage
    U->>AI: Send message with file context
    AI->>U: Regenerate smaller files as needed
```

- Workflow: User request -> AI creates multiple files -> Store in browser storage -> Regenerate smaller files as needed
- Migrate away from storing code in messages
- Project-based approach with client-side file storage
- Faster editing due to smaller, targeted file regeneration

## Future Architecture (Version 3)

```mermaid
sequenceDiagram
    participant U as User/Browser
    participant A as AI Agent
    participant T as Tools

    U->>A: Send request with file context
    A->>T: Use tools (edit lines, delete, apply changes)
    T->>U: Modify multiple files in browser storage
    U->>A: Return updated project state
```

- Workflow: User request -> AI agent uses tools to edit lines, delete, apply changes -> Modify multiple files in browser -> Web searches, install dependencies -> Return updated project
- AI agent with full tool access
- Multiple file editing capabilities
- Advanced tools: line edits, deletions, web searches, dependency management
- Autonomous project manipulation
