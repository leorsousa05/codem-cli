# Design Specification: Codem CLI TUI

## 1. Aesthetic Direction Statement
We commit to an **Industrial / Utilitarian** terminal aesthetic. Since Codem CLI is a developer-focused, multi-process agent environment, the visual layout mirrors control rooms and mission critical dashboards. The design uses strict grids, monospace fonts, functional borders (Unicode single/double lines), clear status badges, and precise visual dividers to manage high-density workspace screens.

## 2. Color System
The UI uses Dracula-inspired and terminal-focused color mappings:

- **Dominant Background:** Pitch Black (`#000000` / terminal default)
- **Secondary Background/Surface:** Dark Grey (`#1E1E24` / ANSI Dark Grey)
- **Primary Text:** White/Off-white (`#F8F8F2`)
- **Accent/Selection:** Cyan (`#8BE9FD`)
- **Success/Idle:** Green (`#50FA7B`)
- **Executing/Thinking:** Yellow (`#F1FA8C`)
- **Action Required/Error:** Red/Pink (`#FF5555`)
- **Subtle borders:** Muted Grey (`#6272A4`)

## 3. Typography System
- **Font:** Strictly system monospace (`Courier`, `Fira Code`, `JetBrains Mono`, `SF Mono`, `Monospace`).
- **Hierarchy:**
  - **Header/Tab bar:** Inverse video or Cyan-bracketed names (e.g. `[ 1: Root Agent ]  |  [ 2: Sub-Agent* ]`)
  - **Log Output:** Clean regular monospace.
  - **Tool Invocation Prompt:** Styled with `Boxen` borders and Red/Yellow warning signs (`⚠️ APPROVAL REQUIRED`).

## 4. Layout Structure (ASCII Wireframe)

```
+=============================================================================+
| [1: Root Agent]  |  *[2: File Explorer Agent]  |  [3: CMD Executor]         |
+-----------------------------------------------------------------------------+
| Active Agent: File Explorer Agent (ID: ag_02)              | Status: RUNNING|
| Execution Mode: Manual Approval                           | Threads: 3/8   |
+-----------------------------------------------------------------------------+
| > Scanning /src/tui for React components...                                 |
| > Found 5 files. Analyzing dependencies...                                  |
| > [Tool Request] Read file 'src/tui/App.tsx'                                |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |  ⚠️  TOOL APPROVAL REQUEST                                             |  |
|  |  Agent wants to: Read file 'src/tui/App.tsx'                          |  |
|  |                                                                       |  |
|  |  [Y] Approve (Enter)   [N] Deny (Esc)   [A] Always Allow for this session |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+-----------------------------------------------------------------------------+
| [ag_02] Prompt: write typescript code for...                                |
+=============================================================================+
```

## 5. Motion & Interaction Choreography
- **Spinners:** Snappy 4-frame unicode loop (`⠋`, `⠙`, `⠹`, `⠸` etc.) during agent 'THINKING' states.
- **Log Streaming:** Real-time character/line printing mirroring live terminal execution.
- **Tabs Transition:** Instantly update panels on keypress (e.g., `Alt + 1`, `Alt + 2`) without transition delays to preserve instant feedback utility.

## 6. Pre-Implementation Checklist
- [x] Contrast ratios verified (High-contrast ANSI colors)
- [x] Touch targets ≥44px (Not applicable - Keyboard driven TUI)
- [x] Reduced motion alternative defined (No flashy animations, static fallback for spinners if requested)
- [x] Mobile layout preserves personality (CLI is desktop-first, scales gracefully down to 80 columns width)
- [x] Focus states designed (Active input panel highlighted with a double-lined cursor bracket `> ` in Cyan)
- [x] No emoji as structural icons (Uses standard CLI text and ASCII blocks)
