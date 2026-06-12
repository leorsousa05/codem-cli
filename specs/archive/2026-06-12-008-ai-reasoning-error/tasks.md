# Tasks: AI Reasoning Display and Error Feedback

## Setup
- [x] Create spec folder structure: `specs/changes/008-ai-reasoning-error/`
- [x] Initialize `.spec.yaml`
- [x] Write `proposal.md`
- [x] Write `design.md`
- [x] Write `specs/spec.md`
- [x] Write `tasks.md`

## Worker
- [x] Replace `response.textStream` with `response.fullStream` in `AgentHarness.ts`.
- [x] Accumulate reasoning deltas and emit `[REASONING_START]`, full reasoning, `[REASONING_END]`.
- [x] Continue accumulating text deltas and emit assistant text.
- [x] Handle `error` stream events by emitting `[CRITICAL ERROR]: <message>`.
- [x] Emit `[SYSTEM]: No response from model.` when text, reasoning, and tool calls are all empty.

## Parser & Formatter
- [x] Create `src/tui/utils/reasoningParser.ts` with `ReasoningBlock` type and `parseReasoningMarkers`.
- [x] Update `src/tui/utils/logFormatter.ts` to include `ReasoningBlock` in `LogEntry`.
- [x] Update `src/tui/utils/toolLogParser.ts` `LogEntry` union to include `ReasoningBlock`.

## Components
- [x] Create `src/tui/components/ReasoningRow.tsx` for collapsed/expanded rendering.
- [x] Update `src/tui/components/LogViewer.tsx` to render reasoning rows.
- [x] Update `src/tui/components/App.tsx` to manage `expandedReasonings` and include reasoning blocks in navigation.

## Testing
- [x] Write `src/tests/tui/reasoningParser.test.ts`.
- [x] Write `src/tests/worker/AgentHarness.test.ts` covering stream error, reasoning/text accumulation and empty responses.
- [x] Run `npm run build` and fix TypeScript errors.
- [x] Run `npm test` and fix failing tests.

## Documentation
- [x] Update `specs/living/tui/design.md`.
- [x] Mark `specs/changes/008-ai-reasoning-error/.spec.yaml` as completed.
- [x] Archive completed spec folder.

## Completion
- [x] Route to reviewer for code review.
