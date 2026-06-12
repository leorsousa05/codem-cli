# Spec Delta: AI Reasoning Display and Error Feedback

## Current State

`AgentHarness` consumes only `response.textStream`. Reasoning deltas, error events, and empty-result detection are lost. The TUI has no `ReasoningBlock` concept.

## Changes

### ADDED
- `src/tui/utils/reasoningParser.ts`: Parse `[REASONING_START]`/`[REASONING_END]` markers into `ReasoningBlock` objects.
- `src/tui/components/ReasoningRow.tsx`: Presentational collapsed/expanded row for reasoning.
- `src/tests/tui/reasoningParser.test.ts`: Unit tests for marker parsing.

### MODIFIED
- `src/worker/harness/AgentHarness.ts`: Use `response.fullStream`; accumulate reasoning and text; emit reasoning markers; emit error/empty-response messages.
- `src/tui/utils/logFormatter.ts`: Include `ReasoningBlock` in `LogEntry` union.
- `src/tui/components/LogViewer.tsx`: Render `ReasoningBlock` rows.
- `src/tui/components/App.tsx`: Manage `expandedReasonings` state and include reasoning blocks in keyboard navigation.
- `specs/living/tui/design.md`: Document new contracts.

### REMOVED
- Direct consumption of `response.textStream` (replaced by `fullStream`).

## Migration Notes

- `AGENT_OUTPUT` payload remains text-based.
- Models that do not emit reasoning simply produce no `[REASONING]` markers.

## Backward Compatibility

- No IPC contract changes.
- Existing tool-call markers and plain log lines remain unchanged.
