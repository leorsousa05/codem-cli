# Tasks: Collapsible Tool Call Logs with Final Result Display

## Setup
- [x] Create spec folder structure: `specs/changes/006-collapsible-tool-logs/`
- [x] Initialize `.spec.yaml`
- [x] Write `proposal.md`
- [x] Write `design.md`
- [x] Write `specs/spec.md`
- [x] Write `tasks.md`

## Worker Changes
- [x] Update `src/worker/harness/AgentHarness.ts` to emit textual markers instead of emoji-prefixed messages.
- [x] Emit `[TOOL_RESULT]` marker with the tool result payload after success.
- [x] Emit `[TOOL_ERROR]` marker with error message on failure.
- [x] Emit `[TOOL_REJECTED]` marker when user rejects approval.

## Parser & Formatter
- [x] Create `src/tui/utils/toolLogParser.ts` with marker parsing and grouping functions.
- [x] Update `src/tui/utils/logFormatter.ts` to return `LogEntry[]` union.
- [x] Handle malformed markers gracefully (fall back to plain lines).

## Components
- [x] Create `src/tui/components/ToolCallRow.tsx` for collapsed/expanded rendering.
- [x] Update `src/tui/components/LogViewer.tsx` to render `LogEntry` union.
- [x] Update `src/tui/components/App.tsx` to manage `expandedBlocks` state and keyboard toggle.

## Testing
- [x] Write `src/tests/tui/toolLogParser.test.ts` covering all marker combinations.
- [x] Update `src/tests/tui/logFormatter.test.ts` with block cases.
- [x] Run `npm run build` and fix TypeScript errors.
- [x] Run `npm test` and fix failing tests.
- [x] Manually verify a tool call renders as a collapsed row without emojis.
- [x] Manually verify expanding/collapsing a tool call row works.

## Documentation
- [x] Update living spec `specs/living/tui/design.md` if behavior changes after implementation.
- [x] Update `specs/changes/006-collapsible-tool-logs/.spec.yaml` status to `completed` when done.
- [x] Move completed spec folder to `specs/archive/` following project naming convention.

## Completion
- [ ] Route to reviewer for code review.
