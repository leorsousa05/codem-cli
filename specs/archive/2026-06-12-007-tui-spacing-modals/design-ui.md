# UI/UX Design Spec: TUI Spacing, Modal Layout and Slash-Command Hints

## 1. Aesthetic Direction Statement

The interface follows an **industrial/utilitarian terminal aesthetic**: raw structure, monospace typography, functional color accents, and zero decorative noise. The goal is clarity and density control — every line exists to communicate state or action. This direction fits a developer CLI where the user needs to scan logs, approve tools, and run slash commands without visual friction.

## 2. Color System

Reuse the existing `ColorTheme` tokens. No new colors.

| Token | Usage |
|-------|-------|
| `accent` | prompt caret, focused rows, modal title, active command hints |
| `text` | primary content |
| `textMuted` | secondary metadata, hints, borders |
| `border` | header/rule lines, modal frame |
| `success` | clean git status, tool success |
| `warning` | pending approval, modified git status |
| `error` | critical errors, tool failures |
| `info` | system messages, status labels |

Modal frame uses `border` with a slightly stronger accent on the title.

## 3. Typography System

Terminal-native monospace stack. No external fonts.

| Level | Family | Weight | Usage |
|-------|--------|--------|-------|
| UI labels | monospace | bold | header labels, modal titles, focused items |
| Body | monospace | normal | log text, hints, arguments |
| Muted | monospace | normal | metadata, footer hints |

All text is rendered through Ink/Chalk. No italic styles (terminal support is inconsistent).

## 4. Component Specs

### 4.1 StatusBar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  /provider  /model  /session  /help  /tools  /exit              173 MB      │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Height: 1 line.
- Left side: dynamic hint string.
- Right side: `memoryUsage` aligned to the right.
- Color: hint text in `textMuted`, except the command names use `accent` bold.
- Context-aware hints:
  - Overlay open: `ESC close  ↑↓ navigate  Enter select`
  - Slash suggestions open: `↑↓ navigate  Enter select  ESC close`
  - Approval pending: `y allow  n deny`
  - Default: `type / for commands`

### 4.2 LogViewer / Spacing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Hello! How can I help you today?                                            │
│                                                                             │
│ > list me this repo files                                                   │
│                                                                             │
│ ▶ list_files (native) — success: total 288                                  │
│                                                                             │
│ Here is a list of files and directories in the project:                     │
│ ...                                                                         │
│                                                                             │
│ >                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Each rendered entry (plain line, tool block, user prompt) sits inside a `Box` with `marginY={1}`.
- Extra empty line inserted when the actor changes:
  - assistant text → user prompt
  - assistant text → tool block
  - tool block → assistant text
  - system message → any other actor
- User prompt uses `> ` prefix with accent color and bold.
- Do not add extra spacing between consecutive lines that belong to the same assistant message.

### 4.3 Modal Popup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                          ┌──────────────────────────────┐                   │
│                          │ Configure AI Provider        │                   │
│                          │                              │                   │
│                          │ Select the active provider:  │                   │
│                          │ > KIMI                       │                   │
│                          │   OPENAI (active)            │                   │
│                          │   ANTHROPIC                  │                   │
│                          │   GEMINI                     │                   │
│                          │                              │                   │
│                          └──────────────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Rendered as a centered popup over the main UI.
- Outer container: full viewport, flex row/column centered, transparent background (Ink does not support dimming; the popup itself provides separation).
- Inner box: single-line border in `border`, padding `X=2 Y=1`, content width auto (shrink to fit content).
- Title: bold, `accent` color.
- Footer hint removed from individual modals; moved to `StatusBar`.
- ESC closes the popup.

### 4.4 Header

Unchanged from current design.

## 5. Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Header                                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Log Viewer (scrollable)                                                     │
│                                                                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ > _                                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Status Bar                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

When an overlay is open, the main layout remains visible underneath and the popup is rendered centered on top.

## 6. Motion Choreography

No motion. The product explicitly forbids animations. All state changes are immediate.

## 7. Asset List

None. The interface uses text, box borders, and semantic color tokens only.

## 8. Pre-Implementation Checklist

- [ ] Contrast ratios preserved (existing tokens already meet terminal contrast).
- [ ] No emoji used as structural icons.
- [ ] Status bar hints do not overflow on 80-column terminals.
- [ ] Modal popup is usable at 80×24 terminal size.
- [ ] Reduced motion not applicable (no animations).
- [ ] Focus states maintained via `>` indicator and bold accent color.
