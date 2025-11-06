# Architecture Evolution

## Current Setup (Version 1)

_Message-based code generation with single-file output_

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

## Version 2: Vercel AI SDK Integration

_Vercel AI SDK with tool streaming and enhanced reasoning_

```mermaid
sequenceDiagram
    participant U as User/Browser
    participant V as Vercel AI SDK
    participant T as AI Tools

    U->>V: Send request with file context
    V->>T: Stream tools for reasoning & file operations
    T->>V: Execute tool calls (edit, search, run commands)
    V->>U: Stream responses with tool outputs
    U->>V: Continue conversation with tool results
```

- Workflow: User request -> Vercel AI SDK streams tools -> Tools execute operations -> Stream results back
- Migrate from Together AI to Vercel AI SDK for better tool streaming
- Enhanced reasoning capabilities with tool calling
- Real-time streaming of AI thinking and tool execution
- Support for complex multi-step operations

## Version 3: Multi-File Project Support

_Client-side multi-file storage and editing_

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

## Version 4: Autonomous AI Agent

_Fully autonomous development with comprehensive tool access_

```mermaid
sequenceDiagram
    participant U as User/Browser
    participant A as AI Agent
    participant T as Tools
    participant FS as File System
    participant WS as Web Services

    U->>A: Send request with project context
    A->>T: Execute complex operations autonomously
    T->>FS: Modify multiple files, create directories
    T->>WS: Web searches, API calls, install dependencies
    FS->>A: Return file system state
    WS->>A: Return external data
    A->>U: Present completed project with reasoning
```

- Workflow: User request -> AI agent autonomously executes complex operations -> Full file system manipulation -> External integrations -> Deliver complete solution
- Fully autonomous AI agent with comprehensive tool access
- Complete project lifecycle management
- Advanced integrations: web APIs, package management, deployment
- Reasoning and planning across entire development workflow
