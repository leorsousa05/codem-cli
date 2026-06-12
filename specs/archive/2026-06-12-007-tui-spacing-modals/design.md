# Design: TUI Spacing, Modal Layout and Slash-Command Hints

## Overview

This change polishes the recently redesigned TUI by removing redundant function-key shortcuts, improving vertical rhythm in the log pane, and turning the full-screen overlays into centered modal popups. The status bar becomes a contextual hint line for slash commands.

## Proposed Directory & File Structure

```
/home/arch/codes/codem-cli/
├── src/
│   └── tui/
│       ├── components/
│       │   ├── App.tsx              # MODIFIED: remove F1-F5, render centered modals
│       │   ├── LogViewer.tsx        # MODIFIED: add spacing between entries
│       │   ├── StatusBar.tsx        # MODIFIED: dynamic slash hints + memory
│       │   └── modals/
│       │       ├── HelpModal.tsx    # MODIFIED: keep content, no footer hint if moved to status bar
│       │       ├── ProviderModal.tsx
│       │       ├── SessionModal.tsx
│       │       ├── ModelModal.tsx
│       │       └── MCPStatusModal.tsx
└── specs/
    └── changes/
        └── 007-tui-spacing-modals/
            ├── .spec.yaml
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                └── spec.md
```

## Code Architecture & Design Patterns

### Container/Presentational Pattern
- `App.tsx` decides **which** modal is open and computes the status-bar hint.
- Modal components remain presentational; they receive an `onClose` prop and render centered content.

### Strategy Pattern
- `StatusBar.tsx` selects a hint string based on the current context (`overlayMode`, suggestion visibility, pending approval, default).

## Data Model

### StatusBar Props

```typescript
export interface StatusBarProps {
  memoryUsage: string;
  overlayMode: TUIOverlayMode;
  suggestions: Array<{ cmd: string; desc: string }>;
  pendingApproval: boolean;
}
```

### Modal Props

```typescript
export interface ModalProps {
  onClose: () => void;
}
```

Existing modal-specific props remain unchanged.

## API Contracts

### StatusBar Hint Rules

| Context | Hint |
|---------|------|
| `overlayMode !== 'NONE'` | `ESC close  •  ↑↓ navigate  •  Enter select` |
| `suggestions.length > 0` | `↑↓ navigate  •  Enter select  •  ESC close` |
| `pendingApproval` | `y allow  •  n deny` |
| default | `type / for commands` |

### Log Spacing

`LogViewer` inserts an empty line between consecutive entries when the "actor" changes:
- assistant text → user prompt
- assistant text → tool block
- tool block → assistant text
- system message → any other actor

## Flow Diagrams

### Modal Rendering Flow

```
[App.tsx]
    │
    ├── overlayMode === 'NONE'     ──► Header + LogViewer + InputLine + StatusBar
    └── overlayMode !== 'NONE'     ──► render centered Popup
                                           │
                                           ▼
                                    full-screen container
                                           │
                                           ▼
                                    bordered modal box
                                           │
                                           ▼
                                    HelpModal / ProviderModal / ...
```

### Status Bar Hint Flow

```
[App.tsx passes context to StatusBar]
    │
    ├── overlay active    ──► ESC / arrows / Enter hints
    ├── suggestions open  ──► navigation hints
    ├── approval pending  ──► y/n hints
    └── default           ──► "type / for commands"
```

## State Management

No new global state. `App.tsx` already owns `overlayMode`, `userInput`, `pendingApproval`, and suggestions. It passes derived values to `StatusBar`.

## Error Handling

- Malformed `overlayMode` falls through to `null` in `renderOverlay`, showing the base UI safely.
- Very small terminals may clip the popup; the modal uses `paddingX={2}` and avoids fixed widths when possible.

## Performance Considerations

- `StatusBar` hints are derived from props; no extra state.
- Spacing is implemented by wrapping entries in `Box` with `marginY` or inserting empty `Box` lines.

## Security Considerations

- No changes to the approval flow or tool execution model.
