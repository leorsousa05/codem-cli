# Tasks: Sessions & Slash Commands

## Setup
- [ ] Create spec folder structure
- [ ] Initialize `.spec.yaml`

## Implementation
- [ ] Extend `src/common/types.ts` with `TUIMode` and database helper contracts.
- [ ] Update `src/db/sqlite.ts` to include log retrieval and session deletions.
- [ ] Implement Menu selection hooks and TUI layout updates for modes in `src/tui/index.tsx`.
- [ ] Support command mappings (`/new`, `/session`, `/exit`, `/provider`) in the TUI input loop.

## Testing
- [ ] Unit tests for SQLite log retrieval history.
- [ ] Integration tests for sessions navigation menu callbacks.
