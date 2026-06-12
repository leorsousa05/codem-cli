# Design: Collapsible Tool Call Logs with Final Result Display

## Overview

This change introduces a log parser that groups consecutive tool lifecycle messages into discrete `ToolCallBlock` objects. The worker emits structured text markers before each lifecycle step and the final tool result. The TUI parses these markers, groups related lines, and renders each group as a single collapsible row. By default only the tool name, server, and final result/status are shown.

## Proposed Directory & File Structure

```
/home/arch/codes/codem-cli/
├── src/
│   ├── worker/
│   │   └── harness/
│   │       └── AgentHarness.ts       # MODIFIED: emit structured tool markers + results
│   ├── tui/
│   │   ├── utils/
│   │   │   └── logFormatter.ts       # MODIFIED: parse LogEntry union (lines + blocks)
│   │   │   └── toolLogParser.ts      # ADDED: pure functions to group tool markers
│   │   ├── components/
│   │   │   ├── LogViewer.tsx         # MODIFIED: render ToolCallBlock rows
│   │   │   └── ToolCallRow.tsx       # ADDED: presentational row for one tool call
│   │   └── components/
│   │       └── App.tsx               # MODIFIED: manage expanded block state
│   └── tests/
│       └── tui/
│           ├── logFormatter.test.ts  # MODIFIED: add block cases
│           └── toolLogParser.test.ts # ADDED: parser unit tests
└── specs/
    └── changes/
        └── 006-collapsible-tool-logs/
            ├── .spec.yaml
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                └── spec.md
```

## Code Architecture & Design Patterns

### 1. Strategy Pattern
- **Applied in:** `toolLogParser.ts`.
- **Justification:** Different line prefixes require different parsing strategies (start, run, success, error, rejected, result). Keeping them in focused functions makes the parser testable and easy to extend.

### 2. State Pattern
- **Applied in:** `App.tsx` expanded block state.
- **Justification:** Each `ToolCallBlock` has an independent expanded/collapsed state. A `Set<string>` of block IDs is the simplest immutable representation.

### 3. Container/Presentational Pattern
- **Applied in:** `App.tsx` owns block state; `LogViewer` and `ToolCallRow` render it.
- **Justification:** Keeps rendering logic focused and testable; state changes stay in one place.

## Data Model

### Core Types (proposed additions)

```typescript
// src/tui/utils/logFormatter.ts
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error' | 'rejected';

export interface ToolCallBlock {
  type: 'tool-call';
  id: string;
  toolName: string;
  serverName: string;
  status: ToolCallStatus;
  resultText: string;
  details: string[];
}

export type LogEntry = FormattedLine | ToolCallBlock;
```

### Worker Markers

```typescript
// src/worker/harness/AgentHarness.ts
// Text markers emitted as AGENT_OUTPUT payloads:
const TOOL_START = '[TOOL_START]';
const TOOL_RUN = '[TOOL_RUN]';
const TOOL_SUCCESS = '[TOOL_SUCCESS]';
const TOOL_ERROR = '[TOOL_ERROR]';
const TOOL_REJECTED = '[TOOL_REJECTED]';
const TOOL_RESULT = '[TOOL_RESULT]';
```

Example emitted sequence:
```
[TOOL_START] read_file native
[TOOL_RUN] read_file
[TOOL_RESULT] read_file {"path":"src/index.ts","content":"..."}
[TOOL_SUCCESS] read_file
```

## API Contracts

### Parser Contract

```typescript
// src/tui/utils/toolLogParser.ts
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error' | 'rejected';

export interface ToolCallBlock {
  type: 'tool-call';
  id: string;
  toolName: string;
  serverName: string;
  status: ToolCallStatus;
  resultText: string;
  details: string[];
}

export interface PlainLine {
  type: 'line';
  text: string;
}

export type LogEntry = PlainLine | ToolCallBlock;

export function parseToolMarkers(lines: string[]): LogEntry[];
export function isToolCallBlock(entry: LogEntry): entry is ToolCallBlock;
```

### Updated Log Formatter Contract

```typescript
// src/tui/utils/logFormatter.ts
export function formatLogs(rawLogs: string[], maxLines: number): LogEntry[];
```

### Component Contracts

```typescript
// src/tui/components/ToolCallRow.tsx
export interface ToolCallRowProps {
  block: ToolCallBlock;
  expanded: boolean;
  onToggle: () => void;
}

// src/tui/components/LogViewer.tsx
export interface LogViewerProps {
  logs: string[];
  expandedBlocks: Set<string>;
  onToggleBlock: (id: string) => void;
  maxLines?: number;
}
```

## Flow Diagrams

### Tool Call Log Flow
```
[Worker executes tool]
    │
    ├── AGENT_OUTPUT: [TOOL_START] read_file native
    ├── AGENT_OUTPUT: [TOOL_RUN] read_file
    ├── AGENT_OUTPUT: [TOOL_RESULT] {...}
    └── AGENT_OUTPUT: [TOOL_SUCCESS] read_file
    │
    ▼
[App receives logs via runner.onMessage]
    │
    ▼
[formatLogs parses markers into ToolCallBlock]
    │
    ▼
[LogViewer renders collapsed row]
    │
    ├── Default: "> read_file (native) — success"
    └── Expanded: shows START, RUN, RESULT, SUCCESS lines
```

### Expand/Collapse Flow
```
[user navigates log with ↑↓]
    │
    ▼
[user presses Enter on focused ToolCallRow]
    │
    ▼
[App toggles expandedBlocks Set]
    │
    ▼
[LogViewer re-renders row expanded/collapsed]
```

## State Management

`App.tsx` adds:
- `expandedBlocks: Set<string>` — IDs of currently expanded `ToolCallBlock`s.
- `focusedLogIndex: number` — index of the focused log entry for keyboard navigation.
- `onToggleBlock(id)` — adds/removes the ID from the set.

`LogViewer` receives the set and callback as props and renders rows accordingly.

## Error Handling

- **Malformed markers:** If a result/success/error appears without a preceding start, the parser treats it as a plain line to avoid data loss.
- **Large results:** Collapsed view truncates `resultText` to a configurable preview length (e.g., 80 chars). Full JSON shown only when expanded.
- **Missing results:** If a block ends without a `TOOL_RESULT`, the collapsed row shows only the status (`success`/`error`/`rejected`).

## Performance Considerations

- Parsing runs on each log update. Complexity is linear in the number of lines.
- `ToolCallBlock` objects are recreated on each render; React keys use stable block IDs derived from tool name + sequence index.
- No new dependencies.

## Security Considerations

- The parser only reads text markers; it does not execute tool results.
- Tool results are already sanitized by the worker before emission.
- No changes to the sandbox approval model.
