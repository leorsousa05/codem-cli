# Spec Delta: Sessions & Slash Commands

## Changes

### ADDED
- TUI Mode state control allowing to cycle between Chat, Session Select, and Command menus.
- Option list popup on `/` keypress.

### MODIFIED
- `src/tui/index.tsx`: Keyboard capture handles modes and arrows differently depending on TUI focus state.
