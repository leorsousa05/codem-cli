# Spec Delta: TUI Visual Redesign

## Current State

The TUI is implemented as a single React Ink component in `src/tui/index.tsx` (`TelemetryHUD`). It is approximately 892 lines and contains:

- Global state for sessions, input, overlays, provider setup, and ambient metadata.
- Inline rendering of the header, log viewer, autocomplete dropdown, sandbox approval, status indicators, and all overlays.
- Hard-coded color values (`cyan`, `magenta`, `yellow`, `gray`, `green`) used directly in JSX.
- No centralized theme or component reuse beyond React primitives.
- `TUIOverlayMode` in `src/common/types.ts` does not include `'PROVIDER_MODAL'`, even though the component uses it inline.

## Changes

### ADDED
- `src/tui/components/App.tsx`: Root container that owns all global state and keyboard orchestration.
- `src/tui/components/Header.tsx`: Clean top bar displaying app name, cwd, git branch/status, active model/provider, session count, and context usage.
- `src/tui/components/LogViewer.tsx`: Focused log rendering component with semantic line classification.
- `src/tui/components/InputLine.tsx`: Single-line prompt with mode-aware prompt character and caret.
- `src/tui/components/StatusBar.tsx`: Bottom bar with keyboard hints and runtime metadata.
- `src/tui/components/SlashSuggestions.tsx`: Inline autocomplete dropdown aligned above the input line.
- `src/tui/components/SandboxModal.tsx`: Compact tool-approval prompt.
- `src/tui/components/modals/HelpModal.tsx`: F1 help overlay.
- `src/tui/components/modals/ProviderModal.tsx`: F2 provider setup wizard.
- `src/tui/components/modals/SessionModal.tsx`: F3 session switcher.
- `src/tui/components/modals/ModelModal.tsx`: `/model` picker overlay.
- `src/tui/components/modals/MCPStatusModal.tsx`: F4 connected-tools overlay.
- `src/tui/theme/types.ts`: `ThemeName`, `ColorTheme`, and `ThemeContextValue` types.
- `src/tui/theme/themes.ts`: `lightTheme`, `darkTheme`, `resolveThemeName()`, and `getTheme()`.
- `src/tui/theme/ThemeProvider.tsx`: React context provider for the active theme.
- `src/tui/theme/useTheme.ts`: Hook to consume the theme context.
- `src/tui/hooks/useKeyboard.ts`: Declarative wrapper around Ink's `useInput`.
- `src/tui/utils/logFormatter.ts`: Pure functions for parsing and classifying log lines.
- `src/tests/tui/theme.test.ts`: Unit tests for theme resolution.
- `src/tests/tui/logFormatter.test.ts`: Unit tests for log formatting.

### MODIFIED
- `src/tui/index.tsx`: Reduced to a thin entry point that renders `<ThemeProvider><App /></ThemeProvider>`.
- `src/common/types.ts`: Adds `'PROVIDER_MODAL'` to `TUIOverlayMode` so the type matches runtime usage.

### REMOVED
- The monolithic `TelemetryHUD` implementation in `src/tui/index.tsx` is removed and replaced by the new component tree.

## Migration Notes

- The public entry point for the CLI (`src/index.ts`) imports `TelemetryHUD` from `./tui/index.js`. After this change, `src/tui/index.tsx` will continue to export the root component (renamed or aliased as the default export), so `src/index.ts` does not require changes unless the export name is changed.
- All existing runner/database callbacks and IPC message handling logic move from the old monolithic component into `App.tsx` with identical semantics.
- Overlay state machine and keyboard shortcuts remain the same; only the visual presentation and file organization change.

## Backward Compatibility

- **CLI behavior:** Fully preserved. All commands, shortcuts, and flows work as before.
- **Database/schema:** No changes.
- **Config file:** No changes.
- **API contracts:** Only additive change to `TUIOverlayMode`; no existing values are removed or redefined.
- **Export contract:** `src/tui/index.tsx` keeps the same default/named export signature expected by `src/index.ts`.
