# Tasks — Skills Integration

## Implementation Order

Tasks must be executed in this order due to dependency chain.

---

### Task 1 — `src/common/types.ts`: Add AGENT_SKILL_INJECT to IPCMessage union
- [ ] Add `AGENT_SKILL_INJECT` variant to the `IPCMessage` discriminated union
- [ ] Fields: `agentId: string`, `payload: { skillName: string; content: string }`
- **Dependency:** None — foundational type, must be done first

---

### Task 2 — `src/common/skills.ts`: Create SkillLoader module (NEW FILE)
- [ ] Export `interface SkillMeta { name, description, path }`
- [ ] Implement `parseFrontmatter(content, fallbackName)` — regex-based, no deps
- [ ] Implement `loadSkills(): SkillMeta[]`
  - Resolve `~/.agents/skills/` via `os.homedir()`
  - Return `[]` if directory doesn't exist (no throw)
  - For each entry: verify it's a directory, check `SKILL.md` exists, parse frontmatter
  - Filter out entries where content is unreadable
- [ ] Implement `readSkillContent(skillPath: string): string`
  - Return `''` on any read error (no throw)
- **Dependency:** Task 1

---

### Task 3 — `src/worker/harness/AgentHarness.ts`: Add injectSkill method
- [ ] Add `public injectSkill(skillName: string, content: string): void`
- [ ] Push `{ role: 'user', content: '[SKILL: <skillName>]\n\nThe following are your operational instructions for this session. Follow them precisely.\n\n<content>' }` to `this.messages`
- [ ] Method is synchronous — no LLM call, no IPC
- **Dependency:** Task 1

---

### Task 4 — `src/worker/agent.worker.ts`: Handle AGENT_SKILL_INJECT
- [ ] In the `parentPort.on('message', ...)` handler, add case for `AGENT_SKILL_INJECT`
- [ ] If `harness` is null: `sendOutput('Error: AI Provider not configured...\n')` and return
- [ ] Call `harness.injectSkill(payload.skillName, payload.content)`
- [ ] `sendOutput("⚡ Skill '${skillName}' injected. Ready.\n")`
- [ ] `sendStatus('IDLE')`
- **Dependency:** Tasks 1, 3

---

### Task 5 — `src/runner/AgentRunner.ts`: Add sendSkill method
- [ ] Add `sendSkill(agentId: string, skillName: string, content: string): void`
- [ ] Follow same pattern as existing `sendCommand`: look up worker by `agentId`, post `AGENT_SKILL_INJECT` message
- [ ] If worker not found: log warning (same as other methods)
- **Dependency:** Tasks 1, 4

---

### Task 6 — `src/tui/index.tsx`: Skills state, scroll, /skill command, render
- [ ] Import `loadSkills`, `readSkillContent`, `SkillMeta` from `../common/skills.js`
- [ ] Add `const SUGGEST_WINDOW = 6` constant
- [ ] Add state: `const [skills, setSkills] = useState<SkillMeta[]>([])`
- [ ] Add state: `const [suggestScrollOffset, setSuggestScrollOffset] = useState<number>(0)`
- [ ] In `useEffect`: call `loadSkills()` synchronously (it's sync), `setSkills(result)`
- [ ] Refactor `getSuggestions()`:
  - Merge base slash commands with skill suggestions (prefix filter on `/skill <name>`)
  - Return combined sorted list
- [ ] Rename `suggestions` usage to use full list; compute `visibleSuggestions = suggestions.slice(suggestScrollOffset, suggestScrollOffset + SUGGEST_WINDOW)`
- [ ] Update `useInput` autocomplete navigation:
  - `↓`/Tab: increment `selectedSuggestIndex`, update `suggestScrollOffset` if index exits window bottom
  - `↑`: decrement `selectedSuggestIndex`, update `suggestScrollOffset` if index exits window top
  - On `userInput` change: reset both `selectedSuggestIndex` and `suggestScrollOffset` to 0
- [ ] Add `/skill` to `executeSlashAction`:
  - If no args: log `"System: No skill specified. Available: ${skills.map(s => s.name).join(', ')}\n"`
  - Find skill by name; if not found: log `"System: Skill '<name>' not found.\n"`
  - `readSkillContent(skill.path)` → `runner.sendSkill(agentId, name, content)`
  - Log `"System: Skill '<name>' activated.\n"` in current session
- [ ] Update autocomplete dropdown render:
  - Render `visibleSuggestions` instead of `suggestions`
  - Add `<Text color="gray">▲ {suggestScrollOffset} more</Text>` above list if `suggestScrollOffset > 0`
  - Add `<Text color="gray">▼ {remaining} more</Text>` below list if more items exist below window
- [ ] Add `/skill` to `slashCommands` array: `{ cmd: '/skill', desc: 'Activate a skill from ~/.agents/skills' }`
- **Dependency:** Tasks 2, 5

---

### Task 7 — Verification
- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Manually verify: `~/.agents/skills` is scanned and skills appear in autocomplete
- [ ] Verify scroll: if >6 skills or commands visible, `↓` scrolls the window
- [ ] Verify injection: select a skill → worker logs `⚡ Skill '...' injected. Ready.`
- [ ] Verify missing skill dir: remove `~/.agents/skills`, restart — no crash, skill list empty
- **Dependency:** All above tasks
