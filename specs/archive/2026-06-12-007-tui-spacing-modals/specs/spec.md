# Spec Delta: TUI Spacing, Modal Layout and Slash-Command Hints

## Current State

The TUI renders overlays as full-screen absolute boxes that overwrite the chat log. Function-key shortcuts (F1-F5) are still wired but the user prefers slash commands. The log pane has no vertical separation between assistant text, tool blocks, and user prompts. The status bar still lists F1-F5 labels.

## Changes

### MODIFIED
- `src/tui/components/App.tsx` — remove F1-F5 handlers, pass `onClose` to modals, render centered popup container.
- `src/tui/components/StatusBar.tsx` — accept context props and render dynamic slash-command hints; keep memory usage on the right.
- `src/tui/components/LogViewer.tsx` — add vertical spacing between log entries, especially on actor changes.
- `src/tui/components/modals/*.tsx` — remove per-modal footer hints if duplicated by `StatusBar`.
- `specs/living/tui/design.md` — update component contracts and state management.

### REMOVED
- F1-F5 global keyboard shortcuts from `App.tsx`.
- F1-F5 labels from `StatusBar.tsx`.

## Migration Notes

- Users who previously relied on F1-F5 must now use `/help`, `/provider`, `/session`, `/tools`, `/exit`.
- No IPC or worker changes are required.

## Backward Compatibility

- **Keyboard shortcuts:** removed by design.
- **Slash commands:** fully preserved.
- **Tool approval flow:** unchanged.
