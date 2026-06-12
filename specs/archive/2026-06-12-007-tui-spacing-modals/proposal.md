# Proposal: TUI Spacing, Modal Layout and Slash-Command Hints

## Status
- **State:** draft
- **Created:** 2026-06-12
- **Author:** @architect

## Problem Statement

After the recent TUI redesign, the interface still feels cramped and the overlays behave like full-screen panels that overwrite the chat log instead of modal popups. The F1-F5 shortcuts are redundant now that all actions are reachable via `/` commands, and the status bar still advertises those shortcuts.

Observed issues:
- AI responses and user prompts appear glued to adjacent lines.
- Overlays render on top of the log content without dimming or centering, making the screen look corrupted.
- F1-F5 keys are unused by the user; all configuration is done through `/` commands.

## Goals

1. Remove F1-F5 keyboard shortcuts entirely.
2. Increase vertical spacing in the log pane between messages, tool blocks, and prompts.
3. Render overlays as centered, bordered popups that sit above the main UI.
4. Update the status bar to show context-aware `/` command hints while keeping the memory indicator.
5. Preserve all existing slash commands and approval flows.
6. Keep the build and tests green.

## Non-Goals

- Add mouse support or animations.
- Change the color palette.
- Modify the tool-call parser or worker output.
- Add new slash commands.

## Constraints

- Work within the current Ink + React TUI architecture.
- No emojis in production code.
- Minimal changes to existing components.

## Success Criteria

- [ ] F1-F5 handlers removed from `App.tsx`.
- [ ] Status bar shows `/` hints instead of F1-F5 labels.
- [ ] Log entries have clear vertical separation.
- [ ] Modals appear centered with a clean border.
- [ ] All existing tests pass.
