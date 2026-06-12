# Tasks: TUI Spacing, Modal Layout and Slash-Command Hints

## Setup
- [x] Create spec folder structure: `specs/changes/007-tui-spacing-modals/`
- [x] Initialize `.spec.yaml`
- [x] Write `proposal.md`
- [x] Write `design.md`
- [x] Write `specs/spec.md`
- [x] Write `tasks.md`

## Remove F1-F5 Shortcuts
- [x] Remove F1-F5 detection and handlers from `src/tui/components/App.tsx`.
- [x] Remove F1-F5 labels from `src/tui/components/StatusBar.tsx`.

## Status Bar Hints
- [x] Update `StatusBarProps` to receive `overlayMode`, `suggestions`, and `pendingApproval`.
- [x] Implement hint selection logic based on context.
- [x] Keep memory usage indicator on the right.

## Log Spacing
- [x] Add vertical spacing between entries in `src/tui/components/LogViewer.tsx`.
- [x] Insert extra separation on actor changes (assistant → user, assistant → tool, tool → assistant, system → other).

## Modal Layout
- [x] Update `App.tsx` `renderOverlay` to render a centered popup container instead of a full-screen panel.
- [x] Remove duplicated footer hints from modal components.

## Slash Commands
- [x] Add `/help` and `/tools` slash commands to `App.tsx`.
- [x] Update `HelpModal` to list slash commands instead of F1-F5 shortcuts.

## Documentation
- [x] Update `specs/living/tui/design.md` with new contracts.
- [x] Mark `specs/changes/007-tui-spacing-modals/.spec.yaml` as completed.
- [x] Archive completed spec folder.

## Verification
- [x] Run `npm run build` and fix TypeScript errors.
- [x] Run `npm test` and fix failing tests.
- [x] Manual smoke test: open `/provider`, `/session`, `/model`, `/help`, `/tools` and verify centered layout.

## Completion
- [ ] Route to reviewer for code review.
