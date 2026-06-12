# Tasks: Minimal Clean TUI Visual Redesign with Theme Support

## Setup
- [x] Create spec folder structure: `specs/changes/005-tui-visual-redesign/`
- [x] Initialize `.spec.yaml`
- [x] Write `proposal.md`
- [x] Write `design.md`
- [x] Write `specs/spec.md`
- [x] Write `tasks.md`

## Theme Layer
- [x] Create `src/tui/theme/types.ts` with `ThemeName` and `ColorTheme`.
- [x] Create `src/tui/theme/themes.ts` with `darkTheme`, `lightTheme`, `resolveThemeName`, and `getTheme`.
- [x] Create `src/tui/theme/ThemeProvider.tsx` providing theme context.
- [x] Create `src/tui/theme/useTheme.ts` hook.
- [x] Write `src/tests/tui/theme.test.ts` covering `resolveThemeName` fallbacks and env overrides.

## Utilities & Hooks
- [x] Create `src/tui/utils/logFormatter.ts` with `formatLogs` and `classifyLine`.
- [x] Write `src/tests/tui/logFormatter.test.ts` covering all line variants.
- [x] Create `src/tui/hooks/useKeyboard.ts` wrapper around Ink `useInput`.

## Presentational Components
- [x] Create `src/tui/components/Header.tsx` matching the design contract.
- [x] Create `src/tui/components/LogViewer.tsx` using `logFormatter` and theme colors.
- [x] Create `src/tui/components/InputLine.tsx` with mode-aware prompt and caret.
- [x] Create `src/tui/components/StatusBar.tsx` with shortcuts and metadata.
- [x] Create `src/tui/components/SlashSuggestions.tsx` with virtual scroll.
- [x] Create `src/tui/components/SandboxModal.tsx` for tool approval.
- [x] Create `src/tui/components/modals/HelpModal.tsx`.
- [x] Create `src/tui/components/modals/ProviderModal.tsx`.
- [x] Create `src/tui/components/modals/SessionModal.tsx`.
- [x] Create `src/tui/components/modals/ModelModal.tsx`.
- [x] Create `src/tui/components/modals/MCPStatusModal.tsx`.

## Application Shell
- [x] Create `src/tui/components/App.tsx` and migrate all state/effects/keyboards from old `TelemetryHUD`.
- [x] Update `src/common/types.ts` to add `'PROVIDER_MODAL'` to `TUIOverlayMode`.
- [x] Replace `src/tui/index.tsx` with a thin entry point rendering `ThemeProvider` + `App`.
- [x] Verify `src/index.ts` import of the TUI root still works.

## Testing
- [x] Run `npm run build` and fix TypeScript errors.
- [x] Run `npm test` and fix failing tests.
- [ ] Manually verify F1-F5 overlays render with the new theme.
- [ ] Manually verify slash-command autocomplete still navigates and submits.
- [ ] Manually verify provider setup flow (F2) masks API key and saves config.
- [ ] Manually verify tool approval (sandbox) modal displays and accepts/rejects.
- [ ] Verify light mode via `CODEM_THEME=light` and dark mode by default.

## Documentation
- [x] Update README with theme/env-var note if needed.
- [x] Update `specs/changes/005-tui-visual-redesign/.spec.yaml` status to `completed` when done.
- [x] Move completed spec folder to `specs/archive/` following project naming convention.

## Completion
- [ ] Route to reviewer for code review.
