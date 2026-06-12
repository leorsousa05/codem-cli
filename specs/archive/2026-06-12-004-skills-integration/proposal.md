# Proposal — Skills Integration

## Motivation

The Codem CLI agent currently operates without awareness of structured behavioral skills.
Users working in multi-domain projects (frontend, backend, DevOps, architecture) need a way to
inject reusable context personas into the agent without re-typing prompts every time.

The global `~/.agents/skills/` directory already contains structured `SKILL.md` files used by
other tooling. Codem CLI must become a first-class consumer of that directory.

## Scope

### In Scope
- Scanning `~/.agents/skills/` at TUI boot and reading frontmatter from each `SKILL.md`
- Exposing skills in the `/` autocomplete dropdown as `/skill <name>`
- Virtual scroll on the autocomplete dropdown (fixed window, arrow navigation)
- Sending selected skill content to the active worker via IPC
- Injecting skill content into `AgentHarness` message history before the next user turn

### Out of Scope
- Creating or editing skills from within the CLI
- Hot-reload of skills while the app is running
- Skills stored in project-local directories (only `~/.agents/skills/` global path)
- Per-session skill stacking (only the most recently injected skill is "active" in terms of UX feedback; multiple injections accumulate in history normally)

## Constraints

- No new npm dependencies: frontmatter parsed with inline regex, not `js-yaml` or `gray-matter`
- Must not break existing slash commands (`/new`, `/model`, `/provider`, `/session`, `/clear`, `/exit`)
- Scroll window size: 6 items visible at a time (configurable via constant)
- Compatible with all existing providers (openai, anthropic, gemini, kimi) — injection as `user` role message, not additional `system`

## Success Criteria

1. User types `/skill` and sees a scrollable list of available skills
2. User presses `↓` beyond the visible window and the list scrolls
3. User selects a skill — the full SKILL.md content is injected into the active agent as a context-setting message
4. TUI shows a `System: Skill '<name>' activated` confirmation in the chat log
5. The agent's next response reflects the injected skill persona
