# Proposal: Minimal Clean TUI Visual Redesign with Theme Support

## Status
- **State:** draft
- **Created:** 2026-06-12
- **Author:** @architect

## Problem Statement

The current `codem-cli` terminal interface lives almost entirely inside a single 892-line `src/tui/index.tsx` component. The layout mixes responsibilities, lacks visual hierarchy, and uses ad-hoc color values scattered throughout the render tree. The result feels cluttered and inconsistent compared to modern agent CLIs such as Opencode, Kimi Code, Claude Code, and Antigravity CLI.

Specific pain points:
- **Monolithic component:** `TelemetryHUD` handles keyboard input, overlay state, log rendering, provider configuration, session selection, and status display in one file.
- **No theme system:** Colors are hard-coded (`cyan`, `magenta`, `yellow`, `gray`) with no light/dark mode support or central palette.
- **Weak visual hierarchy:** Header, log area, input line, and status indicators compete for attention without clear separation.
- **Inconsistent status communication:** Agent status, tool approval, and autocomplete use different border styles and colors without a unifying system.
- **No reusable structure:** Adding a new overlay or restyling a region requires touching the main component and risks regressions.

## Goals

1. **Full visual redesign:** Replace the existing layout with a minimal, clean interface that emphasizes the conversation log and input while de-emphasizing chrome.
2. **Component decomposition:** Split `src/tui/index.tsx` into focused, single-responsibility components and hooks.
3. **Custom theme system:** Introduce a centralized `ColorTheme` with light and dark variants that respects system preference (via terminal environment heuristics) and supports manual override.
4. **Consistent palette:** Define a small, intentional set of semantic colors (accent, success, warning, error, muted, surface, border) used everywhere.
5. **Preserve behavior:** Keep all existing keyboard shortcuts (F1-F5), slash commands, overlays, and sandbox approval flows intact.

## Non-Goals

- Add animations, transitions, or motion effects.
- Change the underlying agent runner, database, worker, or skill injection logic.
- Add new slash commands or overlays beyond those already present.
- Implement accessibility features beyond reasonable contrast and focus states.
- Support terminal themes beyond light and dark (e.g., high-contrast, solarized).

## Constraints

- Must remain on **Ink 5.x** and **React 18.x**.
- Must keep the project dependency footprint small; avoid heavy UI libraries.
- Must work in common terminals. Truecolor is preferred but the palette must degrade gracefully to 256-color and 16-color terminals.
- Must preserve existing keyboard behavior and overlay flows.
- No existing UI patterns need to be preserved; refactoring is allowed.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large refactor of the only TUI file introduces regressions in input handling or overlays. | High | Keep component props strictly typed; add unit tests for pure logic; verify every overlay flow manually before review. |
| Terminal color support varies across users' terminals. | Medium | Use `chalk` levels to detect color support; provide named-color fallback mapping in the theme layer. |
| System light/dark detection in terminals is unreliable. | Medium | Default to dark; allow `CODEM_THEME` environment variable override; document behavior. |
| Decomposed components share a lot of state, making parallel work error-prone. | Medium | Define clear prop contracts and a single source of truth in `App.tsx`; avoid parallel subagents for this change. |

## Success Criteria

- [ ] `src/tui/index.tsx` is reduced to a thin entry point; all UI logic lives in `src/tui/components/` and `src/tui/theme/`.
- [ ] A `ThemeProvider` supplies a `ColorTheme` to every component via React context.
- [ ] Running the CLI renders the new layout with the custom palette in both light and dark modes.
- [ ] All existing F1-F5 shortcuts, slash commands, and overlays continue to work.
- [ ] Unit tests exist for theme detection and log formatting utilities.
- [ ] `npm test` passes after implementation.
