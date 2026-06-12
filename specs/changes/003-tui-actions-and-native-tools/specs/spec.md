# Spec Delta: TUI Actions and Native Tools Sandbox

## Changes

### ADDED
- `src/worker/NativeTools.ts`: Native code runner for files read/write and bash executions.
- Popover overlay panels for Keyboard events F1 to F4.
- Dynamic inline dropdown showing matches of slash commands above prompt line.

### MODIFIED
- `src/tui/index.tsx`: Replaced page-based menus with minimal inline overlays and dropdown lists.
- `src/worker/agent.worker.ts`: Merged native tools into the client lists exposed to the LLM.
