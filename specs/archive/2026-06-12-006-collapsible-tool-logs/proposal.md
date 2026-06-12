# Proposal: Collapsible Tool Call Logs with Final Result Display

## Status
- **State:** draft
- **Created:** 2026-06-12
- **Author:** @architect

## Problem Statement

The current TUI chat log renders every tool lifecycle message as a separate line:

```
⚙️ Requesting execution: read_file from native...
⚙️ Running read_file...
✅ Tool executed successfully.
```

This is noisy, uses emoji characters, and exposes intermediate execution steps that the user does not need to see by default. The actual data returned by the tool is also not shown in the log — only a success indicator. The user wants a Claude Code-like experience where each tool call is a single, compact, collapsible entry that shows only the final result or status unless expanded.

## Goals

1. **Group tool lifecycle messages** into single collapsible blocks per tool call.
2. **Hide intermediate steps** (requesting, running) by default.
3. **Show the final result** of each tool call when collapsed, or full details when expanded.
4. **Remove emoji characters** from tool-related log output; use textual indicators only.
5. **Allow expand/collapse** via keyboard interaction within the log viewer.
6. **Apply to all tools:** native (`read_file`, `write_file`, `execute_bash`) and MCP tools.

## Non-Goals

- Change the sandbox approval flow or security model.
- Modify tool execution semantics or worker isolation.
- Add mouse support or animations.
- Persist user preference for default expansion state.
- Show the AI's internal reasoning/thought process.

## Constraints

- Work within the current TUI architecture (`LogViewer`, `logFormatter`, `App.tsx`).
- Preserve all existing keyboard shortcuts and overlays.
- Keep the existing cyan/neutral color palette.
- No emojis anywhere in the rendered tool output.
- Build and test suite must remain green.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Worker output format change breaks other consumers. | Low | `AGENT_OUTPUT` is consumed only by the TUI; payload remains backward-compatible text. |
| Parsing edge cases cause lifecycle messages to be mis-grouped. | Medium | Use explicit markers and unit-test all combinations. |
| Large tool results overflow the terminal. | Medium | Truncate collapsed result preview; show full result only when expanded. |

## Success Criteria

- [x] Tool lifecycle messages are grouped into one block per call.
- [x] Collapsed block shows only tool name, server, and final result/status without emojis.
- [x] Expanded block shows all lifecycle details.
- [x] User can expand/collapse blocks with keyboard.
- [x] All existing tests pass; new parser tests added.
