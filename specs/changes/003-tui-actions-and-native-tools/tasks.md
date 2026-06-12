# Tasks: TUI Actions and Native Tools Sandbox

## Setup
- [ ] Create spec folder structure
- [ ] Initialize `.spec.yaml`

## Implementation
- [ ] Extend `src/common/types.ts` with `TUIOverlayMode` and `NativeToolDefinition`.
- [ ] Build the file and system automation tools in `src/worker/NativeTools.ts`.
- [ ] Refactor `src/worker/agent.worker.ts` to merge `NATIVE_TOOLS` into the LLM prompt calling list.
- [ ] Upgrade keyboard inputs in `src/tui/index.tsx` to handle `F1` - `F5` key events.
- [ ] Design and render overlay panels for Help, Model Select, and MCP connections.
- [ ] Create the autocomplete dropdown interface matching `/` prefix inputs.

## Testing
- [ ] Unit tests for `NativeTools` file writes and reads.
- [ ] Integration tests for TUI function key event transitions.
