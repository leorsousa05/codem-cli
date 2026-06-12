# Proposal: Codem CLI Foundation

## Motivation
Create `codem-cli`, an interactive terminal user interface (TUI) tool inspired by modern AI coding assistants (like Claude Code, Roo Code, Kimi CLI). The primary differentiator is the support for multiple concurrent agents running in isolated workers/subprocesses, displaying each agent in a separate, interactive, and toggleable window/tab in the terminal UI.

## Scope
- Base TUI framework utilizing React Ink.
- Multi-agent runner using Node.js `worker_threads` or `child_process`.
- State storage directory `~/.codem/` (persistent configuration and history via a light JSON/SQLite file).
- Kimi API client integration.
- Custom IPC messaging contract between TUI and agent worker threads.

## Constraints
- Node.js LTS, TypeScript.
- Command line binary must be runnable via `codem`.
- Thread safety and non-blocking IPC for UI responsiveness.
