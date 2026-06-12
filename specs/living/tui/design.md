# Design: Minimal Clean TUI Visual Redesign with Theme Support

## Overview

This redesign replaces the monolithic `TelemetryHUD` component with a modular React Ink application. A `ThemeProvider` supplies a semantic color palette to all components, enabling light and dark modes. The layout is stripped down to a clean header, a scrollable log pane, a single-line input prompt, and unobtrusive status information. All existing overlays and keyboard flows are preserved but relocated into focused modal components.

## Proposed Directory & File Structure

```
/home/arch/codes/codem-cli/
├── src/
│   ├── common/
│   │   └── types.ts                    # MODIFIED: add PROVIDER_MODAL to TUIOverlayMode
│   ├── tui/
│   │   ├── index.tsx                   # MODIFIED: thin entry point, renders App
│   │   ├── components/
│   │   │   ├── App.tsx                 # ADDED: root container, global state, keyboard orchestration
│   │   │   ├── Header.tsx              # ADDED: top bar with app name, cwd, git, model, context
│   │   │   ├── LogViewer.tsx           # ADDED: rendered conversation log (lines + tool blocks)
│   │   │   ├── ToolCallRow.tsx         # ADDED: collapsible tool call row
│   │   │   ├── InputLine.tsx           # ADDED: prompt line with caret and mode indicator
│   │   │   ├── StatusBar.tsx           # ADDED: bottom hints and runtime metadata
│   │   │   ├── SlashSuggestions.tsx    # ADDED: inline autocomplete dropdown
│   │   │   ├── SandboxModal.tsx        # ADDED: tool approval prompt
│   │   │   └── modals/
│   │   │       ├── HelpModal.tsx       # ADDED: F1 help overlay
│   │   │       ├── ProviderModal.tsx   # ADDED: F2 provider setup wizard
│   │   │       ├── SessionModal.tsx    # ADDED: F3 session switcher
│   │   │       ├── ModelModal.tsx      # ADDED: /model picker overlay
│   │   │       └── MCPStatusModal.tsx  # ADDED: F4 connected tools overlay
│   │   ├── theme/
│   │   │   ├── types.ts                # ADDED: ThemeName and ColorTheme interfaces
│   │   │   ├── themes.ts               # ADDED: lightTheme, darkTheme, resolveThemeName
│   │   │   ├── ThemeProvider.tsx       # ADDED: React context provider
│   │   │   └── useTheme.ts             # ADDED: theme consumption hook
│   │   ├── hooks/
│   │   │   └── useKeyboard.ts          # ADDED: reusable keyboard input subscription
│   │   └── utils/
│   │       ├── logFormatter.ts         # ADDED: log line parsing and color classification
│   │       └── toolLogParser.ts        # ADDED: group tool lifecycle markers into blocks
│   └── tests/
│       └── tui/
│           ├── theme.test.ts           # ADDED: theme detection and palette tests
│           ├── logFormatter.test.ts    # ADDED: log formatting tests
│           └── toolLogParser.test.ts   # ADDED: tool marker parsing tests
└── specs/
    └── changes/
        └── 005-tui-visual-redesign/
            ├── .spec.yaml
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                └── spec.md
```

## Code Architecture & Design Patterns

### 1. Container/Presentational Pattern
- **Applied in:** `App.tsx` (container) and all `components/*` (presentational).
- **Justification:** `App.tsx` owns global state, side effects, and keyboard routing. Child components receive props and theme values and render only. This makes the visual tree testable and limits the blast radius of layout changes.

### 2. Theme Provider Pattern
- **Applied in:** `ThemeProvider.tsx` and `useTheme.ts`.
- **Justification:** Centralizes the color palette and system-preference detection. Components do not import colors directly; they consume `ColorTheme` from context. This guarantees consistency and makes theme switching trivial.

### 3. Strategy Pattern
- **Applied in:** `themes.ts` and `logFormatter.ts`.
- **Justification:** `resolveThemeName` selects a theme strategy based on environment signals. `logFormatter` selects a style strategy based on log-line prefixes. Both keep decision logic out of the render tree.

### 4. Facade Pattern
- **Applied in:** `useKeyboard.ts`.
- **Justification:** Hides the raw `useInput` API behind a declarative callback interface, making keyboard handling in `App.tsx` easier to read and unit-test in isolation.

## Data Model

### Core Types (proposed additions/modifications)

```typescript
// src/common/types.ts
export type TUIOverlayMode =
  | 'NONE'
  | 'HELP'
  | 'MODELS_SELECT'
  | 'SESSIONS_SELECT'
  | 'MCP_STATUS'
  | 'PROVIDER_MODAL';
```

### Theme Types

```typescript
// src/tui/theme/types.ts
export type ThemeName = 'light' | 'dark';

export interface ColorTheme {
  name: ThemeName;
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  accent: string;
  accentSecondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeContextValue {
  theme: ColorTheme;
  name: ThemeName;
}
```

### Component Props Contracts

```typescript
// src/tui/components/Header.tsx
export interface HeaderProps {
  cwd: string;
  gitBranch: string;
  gitStatus: 'clean' | 'modified' | 'none';
  activeModel: string;
  activeProvider: string;
  sessionCount: number;
  contextUsage: string;
}

// src/tui/components/LogViewer.tsx
export interface LogViewerProps {
  logs: string[];
  expandedBlocks: Set<string>;
  focusedBlockId: string | null;
  onToggleBlock: (id: string) => void;
  onFocusBlock: (id: string | null) => void;
}

// src/tui/components/ToolCallRow.tsx
export interface ToolCallRowProps {
  block: ToolCallBlock;
  expanded: boolean;
  focused: boolean;
  onToggle: () => void;
}

// src/tui/components/InputLine.tsx
export interface InputLineProps {
  value: string;
  mode: 'chat' | 'select' | 'hidden';
  prompt?: string;
}

// src/tui/components/StatusBar.tsx
export interface StatusBarProps {
  memoryUsage: string;
  activeModel: string;
  shortcuts: string[];
}

// src/tui/components/SlashSuggestions.tsx
export interface SlashSuggestionsProps {
  suggestions: Array<{ cmd: string; desc: string }>;
  selectedIndex: number;
  scrollOffset: number;
  windowSize: number;
}

// src/tui/components/SandboxModal.tsx
export interface SandboxModalProps {
  toolName: string;
  serverName: string;
  args: Record<string, unknown>;
}

// src/tui/components/modals/*.tsx
export interface ModalProps {
  onClose: () => void;
}
```

## API Contracts

### Theme Resolution

```typescript
// src/tui/theme/themes.ts
export const darkTheme: ColorTheme;
export const lightTheme: ColorTheme;

export function resolveThemeName(): ThemeName;
export function getTheme(name: ThemeName): ColorTheme;
```

### Log Formatting

```typescript
// src/tui/utils/toolLogParser.ts
export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error' | 'rejected';

export interface ToolCallBlock {
  type: 'tool-call';
  id: string;
  toolName: string;
  serverName: string;
  status: ToolCallStatus;
  resultText: string;
  details: string[];
}

export type LogEntry = FormattedLine | ToolCallBlock;

export function parseToolMarkers(lines: string[]): LogEntry[];
export function isToolCallBlock(entry: LogEntry): entry is ToolCallBlock;
```

```typescript
// src/tui/utils/logFormatter.ts
export interface FormattedLine {
  type: 'line';
  text: string;
  variant: 'default' | 'user' | 'system' | 'success' | 'warning' | 'error' | 'info';
  bold: boolean;
}

export type LogEntry = FormattedLine | ToolCallBlock;

export function formatLogs(rawLogs: string[], maxLines: number): LogEntry[];
export function classifyLine(line: string): FormattedLine;
export function isToolCallBlock(entry: LogEntry): entry is ToolCallBlock;
```

### Keyboard Hook

```typescript
// src/tui/hooks/useKeyboard.ts
export interface KeyboardEvent {
  input: string;
  key: {
    upArrow: boolean;
    downArrow: boolean;
    leftArrow: boolean;
    rightArrow: boolean;
    return: boolean;
    escape: boolean;
    tab: boolean;
    backspace: boolean;
    delete: boolean;
    ctrl: boolean;
    meta: boolean;
  };
}

export type KeyboardHandler = (event: KeyboardEvent) => void;

export function useKeyboard(handler: KeyboardHandler): void;
```

## Flow Diagrams

### Theme Initialization Flow
```
[CLI start]
    │
    ▼
[ThemeProvider mounts]
    │
    ▼
[resolveThemeName() checks CODEM_THEME, COLORFGBG, TERM*]
    │
    ├── CODEM_THEME=light ──► lightTheme
    ├── CODEM_THEME=dark  ──► darkTheme
    ├── COLORFGBG suggests light ──► lightTheme
    └── default ──► darkTheme
    │
    ▼
[ColorTheme stored in React context]
    │
    ▼
[Components read theme via useTheme()]
```

### Keyboard Event Routing Flow
```
[user presses key]
    │
    ▼
[useKeyboard forwards event to App.tsx]
    │
    ▼
[App.tsx dispatcher]
    │
    ├── ESC pressed ──► close overlay, reset provider step
    ├── F1-F5 pressed ──► toggle corresponding overlay
    ├── Overlay active ──► route to overlay handler
    ├── Slash suggestions visible ──► route to suggestion handler
    ├── Pending approval ──► route to sandbox handler
    └── default ──► update userInput / submit command
```

### Overlay Rendering Flow
```
[App.tsx renders]
    │
    ├── overlayMode === 'NONE'     ──► render Header + LogViewer + InputLine + StatusBar
    ├── overlayMode === 'HELP'     ──► render HelpModal on top
    ├── overlayMode === 'PROVIDER_MODAL' ──► render ProviderModal wizard
    ├── overlayMode === 'SESSIONS_SELECT' ──► render SessionModal
    ├── overlayMode === 'MODELS_SELECT'   ──► render ModelModal
    └── overlayMode === 'MCP_STATUS'      ──► render MCPStatusModal
```

## State Management

Global TUI state remains in `App.tsx` using React `useState` and `useEffect`. The redesign does not introduce a global store because the state is local to the terminal session and the component tree is shallow.

State buckets:
- `sessions`, `focusedIndex`: conversation sessions and selection.
- `userInput`, `selectedSuggestIndex`, `suggestScrollOffset`: input and autocomplete.
- `overlayMode`, `providerStep`, `selectedProvIndex`, `selectedModelIndex`: overlay navigation.
- `tempProv`, `tempApiKey`, `tempBaseUrl`: transient provider setup data.
- `pendingApproval`: current tool approval request.
- `config`, `activeModel`: persisted provider/model configuration.
- `skills`: loaded skill metadata.
- `gitBranch`, `cwd`, `memUsage`: ambient metadata.
- `expandedBlocks`: IDs of expanded tool-call blocks.
- `focusedBlockId`: currently keyboard-focused tool-call block ID.

Theme state is managed by `ThemeProvider` and consumed via `useTheme`. It does not change at runtime unless the environment is re-detected on a future render cycle.

## Error Handling

- **Theme detection failure:** If `resolveThemeName` cannot parse an environment value, it logs a warning and falls back to `darkTheme`.
- **Invalid color values:** Components pass colors directly to Ink. Ink/Chalk degrade unsupported colors to the nearest named color or strip ANSI if color is unsupported.
- **Missing focused agent:** `LogViewer` renders an empty-state message when no session is focused.
- **Malformed tool markers:** `toolLogParser` treats orphan markers as plain lines to avoid data loss.
- **Worker runtime errors:** Existing behavior is preserved; errors are appended to the active session log and status changes to `ERROR`.

## Performance Considerations

- **Avoid unnecessary re-renders:** Log lines are classified once per append, not on every render. Use `React.memo` on presentational components where prop identity is stable.
- **Limit log buffer:** `formatLogs` slices the most recent 25 lines, matching current behavior.
- **No animations:** By requirement, all transitions are immediate, eliminating frame budget concerns.
- **Theme lookup:** Theme object is created once at startup and shared via context; no per-render object allocation.

## Security Considerations

- The TUI redesign is purely presentational. It does not change the sandbox approval flow or the worker isolation model.
- API keys typed into the provider modal continue to be masked with asterisks.
- No new secrets are stored or logged by the TUI layer.
