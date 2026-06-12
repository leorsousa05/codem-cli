# Spec Delta: Collapsible Tool Call Logs

## Current State

The worker emits tool lifecycle messages as plain text through `AGENT_OUTPUT`:

```
⚙️ Requesting execution: read_file from native...
⚙️ Running read_file...
✅ Tool executed successfully.
```

The TUI classifies and renders each line independently in `LogViewer`. Emojis are present in the output. The actual tool result data is pushed into the worker's internal message history but is not emitted back to the TUI.

## Changes

### ADDED
- `src/tui/utils/toolLogParser.ts`: Pure functions to parse structured tool markers and group them into `ToolCallBlock` objects.
- `src/tui/components/ToolCallRow.tsx`: Presentational component for a single collapsible tool call row.
- `src/tests/tui/toolLogParser.test.ts`: Unit tests for marker parsing and grouping.

### MODIFIED
- `src/worker/harness/AgentHarness.ts`: Replace emoji-prefixed lifecycle output with textual markers (`[TOOL_START]`, `[TOOL_RUN]`, `[TOOL_RESULT]`, `[TOOL_SUCCESS]`, `[TOOL_ERROR]`, `[TOOL_REJECTED]`). Emit the tool result as an `AGENT_OUTPUT` marker.
- `src/tui/utils/logFormatter.ts`: Return `LogEntry[]` (union of `FormattedLine` and `ToolCallBlock`) instead of `FormattedLine[]`. Integrate `toolLogParser` for marker grouping.
- `src/tui/components/LogViewer.tsx`: Render `LogEntry` union, including collapsed/expanded `ToolCallRow` instances.
- `src/tui/components/App.tsx`: Manage `expandedBlocks` state and keyboard navigation for toggling rows.
- `src/tests/tui/logFormatter.test.ts`: Update existing tests and add cases for `ToolCallBlock` output.

### REMOVED
- Emoji characters from tool lifecycle output in the worker.

## Migration Notes

- `AGENT_OUTPUT` payload remains text-based; no IPC contract changes are required.
- Any external consumers of `AGENT_OUTPUT` will see marker-prefixed lines instead of emoji text. Since the TUI is the only known consumer, this is acceptable.
- Existing plain log lines (assistant text, system messages, errors) continue to be rendered as before.

## Backward Compatibility

- **TUI behavior:** Tool output display changes significantly, but this is the explicit goal.
- **Database logs:** Raw log strings stored in SQLite will now contain markers instead of emoji. This is acceptable because logs are for display, not machine parsing.
- **IPC contracts:** No changes to `IPCMessage` or payload shape.
- **Existing overlays/commands:** Fully preserved.
