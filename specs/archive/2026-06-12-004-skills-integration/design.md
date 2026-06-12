# Design — Skills Integration

## Architecture Overview

**Pattern:** Pipeline Extension + Pure Module Loader  
**Layer placement:**
- `SkillLoader` lives in `src/common/` (shared between TUI and worker — no circular deps)
- TUI consumes only `SkillMeta[]` (lightweight, loaded once at boot)
- Worker receives full skill content via IPC and delegates to `AgentHarness`

```
~/.agents/skills/
  engineer/SKILL.md
  architect/SKILL.md
  ...

┌─────────────────────────────────────────────────────┐
│                      TUI Process                    │
│                                                     │
│  boot → SkillLoader.loadAll()                       │
│       → SkillMeta[] stored in state                 │
│                                                     │
│  user types /skill → autocomplete shows skills      │
│  user selects skill                                 │
│       → SkillLoader.readContent(path)               │
│       → runner.sendSkill(agentId, name, content)    │
│       → IPC: AGENT_SKILL_INJECT                     │
└──────────────────────┬──────────────────────────────┘
                       │ MessagePort
┌──────────────────────▼──────────────────────────────┐
│                   Worker Thread                     │
│                                                     │
│  on(AGENT_SKILL_INJECT)                             │
│       → harness.injectSkill(name, content)          │
│       → messages.push({ role: 'user', content })    │
│       → sendOutput(confirmation)                    │
└─────────────────────────────────────────────────────┘
```

---

## Contracts & Types

### `src/common/skills.ts` (NEW)

```typescript
export interface SkillMeta {
  name: string;         // from YAML frontmatter `name:`
  description: string;  // from YAML frontmatter `description:`
  path: string;         // absolute path to the SKILL.md file
}

// Scans ~/.agents/skills/*/SKILL.md
// Returns [] if directory does not exist
export function loadSkills(): SkillMeta[];

// Reads and returns the full content of a SKILL.md
// Returns '' if file not readable
export function readSkillContent(skillPath: string): string;

// Internal — parses YAML-like frontmatter block
// Input: full file content string
// Output: { name, description } — falls back to { name: dirName, description: '' }
function parseFrontmatter(content: string, fallbackName: string): Pick<SkillMeta, 'name' | 'description'>;
```

**Frontmatter parsing strategy (no external deps):**
```
Regex: /^---\r?\n([\s\S]*?)\r?\n---/
Extract lines from capture group
Split each line on first `: ` to get key/value
Trim both key and value
```

---

### `src/common/types.ts` — Extension

Add to the `IPCMessage` discriminated union:

```typescript
| {
    type: 'AGENT_SKILL_INJECT';
    agentId: string;
    payload: {
      skillName: string;
      content: string;
    };
  }
```

---

### `src/runner/AgentRunner.ts` — New Method

```typescript
// Sends AGENT_SKILL_INJECT to the worker for the given agentId
sendSkill(agentId: string, skillName: string, content: string): void;
```

Implementation delegates to the existing `WorkerHandle` map (same pattern as `sendCommand`).

---

### `src/worker/harness/AgentHarness.ts` — New Method

```typescript
// Injects skill content as a user-role context message
// Format: "[SKILL: <skillName>]\n<content>"
// Does NOT trigger an LLM turn — just mutates this.messages
injectSkill(skillName: string, content: string): void;
```

Message format injected into `this.messages`:
```typescript
{
  role: 'user',
  content: `[SKILL: ${skillName}]\n\nThe following are your operational instructions for this session. Follow them precisely.\n\n${content}`
}
```

---

### `src/tui/index.tsx` — State Extensions

```typescript
// New state
const SUGGEST_WINDOW = 6;  // constant, items visible at once
const [suggestScrollOffset, setSuggestScrollOffset] = useState<number>(0);
const [skills, setSkills] = useState<SkillMeta[]>([]);

// skills loaded in useEffect, merged into slashCommands dynamically:
const allSuggestions = useMemo(() => {
  const base = slashCommands.filter(c => c.cmd.startsWith(userInput));
  const skillSuggestions = userInput === '/skill' || userInput === '/skill '
    ? skills.map(s => ({ cmd: `/skill ${s.name}`, desc: s.description }))
    : skills
        .filter(s => `/skill ${s.name}`.startsWith(userInput))
        .map(s => ({ cmd: `/skill ${s.name}`, desc: s.description }));
  return [...base, ...skillSuggestions];
}, [userInput, skills]);

// Visible window slice
const visibleSuggestions = allSuggestions.slice(
  suggestScrollOffset,
  suggestScrollOffset + SUGGEST_WINDOW
);
```

**Scroll behavior in `useInput`:**
```
↓ / Tab:
  if selectedSuggestIndex < allSuggestions.length - 1:
    selectedSuggestIndex++
    if selectedSuggestIndex >= suggestScrollOffset + SUGGEST_WINDOW:
      suggestScrollOffset++

↑:
  if selectedSuggestIndex > 0:
    selectedSuggestIndex--
    if selectedSuggestIndex < suggestScrollOffset:
      suggestScrollOffset--

On userInput change: reset both selectedSuggestIndex and suggestScrollOffset to 0
```

**Dropdown render additions:**
- Show scroll indicator: `▲ X more` above list if `suggestScrollOffset > 0`
- Show scroll indicator: `▼ X more` below list if `suggestScrollOffset + WINDOW < allSuggestions.length`

---

## Data Flow — Full Sequence

```
1. TUI boots
   └─ useEffect → loadSkills() → setSkills(metas)

2. User types "/skill eng"
   └─ getSuggestions() → filtered by prefix → allSuggestions = ['/skill engineer']
   └─ visibleSuggestions = allSuggestions.slice(0, 6)
   └─ Dropdown renders with scroll indicators

3. User presses ↓ / Enter
   └─ selectedCmd = '/skill engineer'

4. executeSlashAction('/skill engineer')
   └─ args = 'engineer'
   └─ skill = skills.find(s => s.name === 'engineer')
   └─ content = readSkillContent(skill.path)
   └─ runner.sendSkill(activeAgent.id, 'engineer', content)
   └─ TUI appends "System: Skill 'engineer' activated\n" to session logs

5. IPC: AGENT_SKILL_INJECT → worker
   └─ harness.injectSkill('engineer', content)
   └─ this.messages.push({ role: 'user', content: '[SKILL: engineer]\n...' })
   └─ sendOutput("⚡ Skill 'engineer' injected. Ready.\n")
   └─ sendStatus('IDLE')

6. User sends next message
   └─ harness.runLoop(prompt) → LLM sees injected skill in history
```

---

## File Structure Changes

```
src/
├── common/
│   ├── config.ts           (unchanged)
│   ├── types.ts            (+ AGENT_SKILL_INJECT)
│   └── skills.ts           ← NEW
├── runner/
│   └── AgentRunner.ts      (+ sendSkill method)
├── tui/
│   └── index.tsx           (+ skills state, scroll, /skill command, dropdown render)
└── worker/
    ├── agent.worker.ts     (+ AGENT_SKILL_INJECT handler)
    └── harness/
        └── AgentHarness.ts (+ injectSkill method)

specs/
└── changes/
    └── 004-skills-integration/
        ├── .spec.yaml
        ├── proposal.md
        ├── design.md          ← this file
        └── tasks.md
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| `~/.agents/skills` does not exist | `loadSkills()` returns `[]`, no crash |
| `SKILL.md` missing frontmatter | `parseFrontmatter` returns `{ name: dirName, description: '' }` |
| `SKILL.md` not readable | `readSkillContent` returns `''`, skill is filtered out from list |
| No skills found | `/skill` command shows "No skills available" in log, no autocomplete items |
| User types `/skill nonexistent` | `executeSlashAction` logs `"System: Skill 'nonexistent' not found.\n"` |
| Worker has no harness (not configured) | Worker returns existing error: "AI Provider not configured..." |
| Skill content is very large | No truncation — passed as-is; model context limits are provider's responsibility |
