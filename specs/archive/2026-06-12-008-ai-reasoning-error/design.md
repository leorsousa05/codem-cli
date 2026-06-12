# Design: AI Reasoning Display and Error Feedback

## Overview

Switch the worker from `response.textStream` to `response.fullStream` so it can capture `reasoning-delta`, `error`, and lifecycle events. Reasoning text is accumulated and emitted as a single marker block before the assistant text. The TUI parses the block into a `ReasoningBlock`, renders it collapsed by default, and allows keyboard expand/collapse like tool-call rows. Empty or error responses produce visible output.

## Proposed Directory & File Structure

```
/home/arch/codes/codem-cli/
├── src/
│   ├── worker/
│   │   └── harness/
│   │       └── AgentHarness.ts        # MODIFIED: consume fullStream, emit markers
│   └── tui/
│       ├── components/
│       │   ├── App.tsx                # MODIFIED: manage expanded reasonings state
│       │   ├── LogViewer.tsx          # MODIFIED: render ReasoningBlock
│       │   └── ReasoningRow.tsx       # ADDED: collapsed/expanded reasoning row
│       ├── utils/
│       │   ├── logFormatter.ts        # MODIFIED: handle ReasoningBlock
│       │   └── reasoningParser.ts     # ADDED: parse reasoning markers
│       └── tests/
│           └── tui/
│               └── reasoningParser.test.ts # ADDED
└── specs/
    └── changes/
        └── 008-ai-reasoning-error/
            ├── .spec.yaml
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                └── spec.md
```

## Code Architecture & Design Patterns

### State Pattern
- `App.tsx` tracks `expandedReasonings: Set<string>` for reasoning blocks, identical to `expandedBlocks` for tool calls.

### Strategy Pattern
- `reasoningParser.ts` uses marker prefix matching to build `ReasoningBlock` objects, mirroring `toolLogParser.ts`.

## Data Model

### ReasoningBlock

```typescript
export interface ReasoningBlock {
  type: 'reasoning';
  id: string;
  text: string;
}
```

### Updated LogEntry Union

```typescript
export type LogEntry = PlainLine | ToolCallBlock | ReasoningBlock;
```

## API Contracts

### Worker Markers

```typescript
const REASONING_START = '[REASONING_START]';
const REASONING_DELTA = '[REASONING_DELTA]';
const REASONING_END   = '[REASONING_END]';
```

Emitted sequence:
```
[REASONING_START]
[REASONING_DELTA] first thought
[REASONING_DELTA] second thought
[REASONING_END]
Hello, here is the answer.
```

The harness accumulates deltas internally and emits one `[REASONING_START]` followed by the full accumulated reasoning and `[REASONING_END]`, so the parser can group it into a single block.

### ReasoningRow Props

```typescript
export interface ReasoningRowProps {
  block: ReasoningBlock;
  expanded: boolean;
  focused: boolean;
}
```

### Error/Empty Feedback

- Stream `error` event → emit `[CRITICAL ERROR]: <message>`.
- After stream ends, if `assistantText` is empty and no tool calls/reasoning were produced → emit `[SYSTEM]: No response from model.`.

## Flow Diagrams

### Reasoning Flow

```
[AgentHarness streamText]
    │
    ├── fullStream reasoning-delta → accumulate
    ├── fullStream text-delta → accumulate
    ├── fullStream error → emit CRITICAL ERROR
    └── fullStream finish → check emptiness
    │
    ▼
[emit REASONING block if any]
[emit assistant text if any]
[emit SYSTEM no-response if all empty]
```

### Rendering Flow

```
[LogViewer receives LogEntry]
    │
    ├── PlainLine → render as text
    ├── ToolCallBlock → render ToolCallRow
    └── ReasoningBlock → render ReasoningRow (collapsed by default)
```

## State Management

`App.tsx` adds:
- `expandedReasonings: Set<string>`
- Focus navigation now includes both tool blocks and reasoning blocks.

## Error Handling

- Empty response after successful stream → visible `[SYSTEM]: No response from model.` line.
- Stream error event → `[CRITICAL ERROR]: <message>`.
- Malformed reasoning markers → fall back to plain lines.

## Performance Considerations

- Reasoning text is buffered in memory per turn. Long reasoning could be large, but it is bounded by the model's context window.
- No new dependencies.

## Security Considerations

- Reasoning text is treated as display-only; it is not executed or passed to tools.
