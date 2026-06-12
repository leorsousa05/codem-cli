# Visual Design Specification: codem-cli TUI Redesign

## Aesthetic Direction

**Direction:** Industrial/Utilitarian with a controlled "mission control" identity.

The interface behaves like a precision instrument: every panel has a job, every color has a meaning, and nothing competes for attention. A cool cyan accent provides the only warmth in an otherwise neutral, high-contrast workspace. The result should feel closer to a focused code editor or terminal-native agent CLI than a chat app — structured, scannable, and calm under long sessions.

---

## Color System

All colors are mapped to the `ColorTheme` interface defined by the architect. Values are hex for truecolor terminals; the implementation must provide named-color fallbacks for 256/16-color terminals.

### Dark Theme (default)

| Token | Hex | Role |
|-------|-----|------|
| `background` | `#0c0c0c` | Terminal background; deep void so content pops. |
| `surface` | `#18181b` | Elevated panels: header, status bar, modals, suggestions. |
| `border` | `#27272a` | Panel borders and separators. |
| `text` | `#f4f4f5` | Primary body text. |
| `textMuted` | `#a1a1aa` | Secondary labels, metadata, hints. |
| `textInverse` | `#09090b` | Text on accent or solid backgrounds. |
| `accent` | `#22d3ee` | Primary action color: prompt caret, active model, selected row, brand. |
| `accentSecondary` | `#67e8f9` | Hover/focus states and subtle highlights. |
| `success` | `#4ade80` | Tool success, clean git status. |
| `warning` | `#facc15` | Sandbox approval prompt, warnings. |
| `error` | `#f87171` | Errors, rejected approvals, critical messages. |
| `info` | `#60a5fa` | System messages, informational hints. |

### Light Theme

| Token | Hex | Role |
|-------|-----|------|
| `background` | `#ffffff` | Terminal background. |
| `surface` | `#f4f4f5` | Elevated panels. |
| `border` | `#e4e4e7` | Borders and separators. |
| `text` | `#18181b` | Primary body text. |
| `textMuted` | `#71717a` | Secondary labels, metadata, hints. |
| `textInverse` | `#fafafa` | Text on accent or solid backgrounds. |
| `accent` | `#0891b2` | Primary action color. |
| `accentSecondary` | `#06b6d4` | Hover/focus states. |
| `success` | `#16a34a` | Success states. |
| `warning` | `#ca8a04` | Warnings and approvals. |
| `error` | `#dc2626` | Errors. |
| `info` | `#2563eb` | Info states. |

### Usage Rules

- Only `accent` and `text` may be bold for emphasis.
- `textMuted` must never be used for primary actions.
- `surface` is always separated from `background` by a single-pixel `border`.
- Errors always pair `error` text with no additional decoration beyond bold.
- Borders are single-line; no double borders or heavy boxes.

---

## Typography System

The terminal enforces a monospace grid. Hierarchy is achieved through weight, color, and spacing rather than font size.

| Role | Weight | Color | Decoration | Usage |
|------|--------|-------|------------|-------|
| Brand | Bold | `accent` | None | "codem" in header. |
| Header Meta | Normal | `textMuted` | None | cwd, git branch, session count. |
| Header Value | Bold | `text` | None | Current folder name, model name. |
| Log — User | Bold | `accent` | None | User messages and prompt echo. |
| Log — Assistant | Normal | `text` | None | Agent output. |
| Log — System | Bold | `info` | None | System notifications. |
| Log — Success | Normal | `success` | None | Tool success lines. |
| Log — Warning | Bold | `warning` | None | Approval requests, warnings. |
| Log — Error | Bold | `error` | None | Errors. |
| Input Prompt | Bold | `accent` | None | `>` character. |
| Input Text | Normal | `text` | None | Typed command. |
| Input Caret | Bold | `accent` | None | Blinking `_` caret. |
| Status Hints | Normal | `textMuted` | None | F1–F5 labels. |
| Status Keys | Bold | `accent` | None | F1, F2, etc. |
| Modal Title | Bold | `accent` | None | Overlay titles. |
| Modal Body | Normal | `text` | None | Overlay content. |
| Selected Row | Bold | `accent` | None | Highlighted list item. |
| Muted Row | Normal | `textMuted` | None | Inactive list item. |

---

## Layout Structure

The interface is a single column with three fixed zones and one overlay layer.

### Full Layout (dark mode example)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ codem  ~/project  main ● 2  |  moonshot-v1-8k  kimi  4 sessions  0% ctx    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  System: New session started.                                               │
│                                                                             │
│  > How can I help?                                                          │
│                                                                             │
│  I'll analyze the codebase and suggest improvements.                        │
│                                                                             │
│  ⚠  [APPROVE TOOL]: read_file (native)                                      │
│     Allow execution? (y/n)                                                  │
│                                                                             │
│  ✅ Tool executed: read_file                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
  F1 help  F2 provider  F3 sessions  F4 tools  F5 exit    42 MB
```

### Zoning Rules

1. **Header** — 1 row, full width, single-line border bottom.
2. **Log Viewer** — Flexible height, fills remaining space between header and input/status.
3. **Input Line** — 1 row, full width, flush against bottom status bar.
4. **Status Bar** — 1 row, full width, border top.
5. **Overlays** — Rendered centered with a `surface` background and `border`, leaving a 2-cell margin on all sides.

### Spacing Scale

| Token | Cells | Usage |
|-------|-------|-------|
| `xs` | 0 | Inline separators, no padding inside compact rows. |
| `sm` | 1 | Internal padding inside modals and dropdowns. |
| `md` | 2 | Padding inside header and status bar. |
| `lg` | 3 | Margin around centered overlays. |

---

## Component Specs

### Header

- **Height:** 1 row.
- **Background:** `surface`.
- **Border:** bottom 1px `border`.
- **Layout:** two logical groups separated by the remaining space.
  - Left: `codem` (brand, bold accent) + `cwd` (muted) + `current-folder` (bold text) + `git-branch` (muted) + `git-status` (success/warning/error dot).
  - Right: `model` (bold text) + `provider` (muted, uppercase) + `session-count` (muted) + `context-usage` (muted).
- **Padding:** `md` (2 cells) horizontal.
- **Separator:** single space between items; `|` (muted) between cwd/git and model/provider groups.

### Log Viewer

- **Background:** `background`.
- **Padding:** `sm` (1 cell) horizontal; no vertical padding.
- **Behavior:** displays last 25 lines; new lines append at bottom.
- **Line spacing:** no blank line between log entries unless the raw log contains one.
- **Line classification:** uses `logFormatter` variants mapped to the typography table above.

### Input Line

- **Height:** 1 row.
- **Background:** `background`.
- **Layout:** `>` prompt (bold accent) + 1 space + typed text + `_` caret (bold accent).
- **Mode indicator:** when in `select` mode, prefix with `[SELECT SESSION]` in muted text before the prompt.
- **Hidden mode:** during API key input, render only prompt + asterisks + caret.

### Status Bar

- **Height:** 1 row.
- **Background:** `surface`.
- **Border:** top 1px `border`.
- **Layout:** left-aligned shortcut hints, right-aligned memory usage.
- **Format:** `F1` (bold accent) `help` (muted) `F2` (bold accent) `provider` (muted) ... `42 MB` (muted).
- **Padding:** `md` (2 cells) horizontal.

### Slash Suggestions

- **Position:** directly above the input line, full width.
- **Background:** `surface`.
- **Border:** 1px `border` on all sides.
- **Padding:** `sm` (1 cell) all sides.
- **Item format:** `  /cmd` (default muted) or `> /cmd` (selected, bold accent) + `—` (muted) + description (muted).
- **Scroll indicators:** `▲ N more` / `▼ N more` in `textMuted` when suggestions exceed the window.

### Sandbox Modal

- **Position:** inline inside log viewer when `pendingApproval` exists.
- **Background:** `surface`.
- **Border:** 1px `warning` on left only; no full box.
- **Padding:** `sm` (1 cell) horizontal.
- **Content:**
  - Line 1: `[APPROVE TOOL]: {toolName} ({serverName})` — bold warning.
  - Line 2: `args: {formatted JSON}` — muted.
  - Line 3: `Allow execution? (y/n)` — bold warning.

### Overlays (Help, Provider, Session, Model, MCP Status)

- **Position:** centered, 2-cell margin from all edges.
- **Background:** `surface`.
- **Border:** 1px `border`.
- **Padding:** `md` (2 cells) all sides.
- **Title:** bold accent, top of modal.
- **Close hint:** bottom line, muted, `ESC to close`.
- **List items:** `>` prefix for selected row (bold accent); three spaces for inactive rows (text/textMuted).
- **Provider modal steps:** show current step title in accent, input box with `border` color, helper text in muted.

---

## Motion Choreography

**No motion.** All state changes are immediate.

- No fade, slide, or blink beyond the static input caret.
- Modal open/close is instantaneous.
- List selection updates color instantly.
- Status changes update text color immediately.

This respects the user's explicit constraint and keeps the terminal rendering cheap.

---

## Asset List

No external assets required.

- All icons and indicators are text-based (`>`, `●`, `✓`, `⚠`, `✅`, `▲`, `▼`, `|`).
- No emoji are used as structural UI elements.

---

## Pre-Implementation Checklist

- [x] Contrast ratios verified: all body text ≥ 4.5:1 against `background`.
- [x] Semantic color mapping covers all `ColorTheme` tokens.
- [x] No animations defined; static alternatives not required.
- [x] Layout preserves personality at small terminal widths (≥ 80 cols).
- [x] Focus states defined via `accent` bold selection indicator.
- [x] No emoji used as structural icons.

---

## Implementation Notes for Engineer

1. Use the exact hex values above in `src/tui/theme/themes.ts`. Provide named-color fallbacks (e.g., `chalk` color names) when `supportsColor` is not truecolor.
2. `Header` should truncate path/model strings with an ellipsis if the terminal is too narrow; never wrap.
3. `LogViewer` must keep the most recent line at the bottom; do not center content vertically.
4. `InputLine` caret should be a static `_` character; no blinking required unless trivial in Ink.
5. All overlays must close on `ESC` and on their respective F-key toggle.
6. Keep borders single-line using Ink's `borderStyle="single"` or `"round"` consistently; prefer `single` for the utilitarian mood.
