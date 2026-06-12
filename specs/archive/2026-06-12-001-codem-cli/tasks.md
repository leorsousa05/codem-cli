# Tasks: IA Code Assistance CLI (Moonshot & MCP)

## Setup
- [x] Create spec folder structure
- [x] Initialize `.spec.yaml`
- [x] Configure `package.json` with Jest, typescript, ink, sqlite3, and @modelcontextprotocol/sdk.
- [x] Configure `tsconfig.json` for ESM/NodeNext compiler target.

## Implementation
- [x] Implement data types in `src/common/types.ts`
- [x] Implement database layer in `src/db/sqlite.ts`
- [x] Implement `AgentRunner.ts` logic to control Node.js worker threads
- [x] Implement Worker side logic in `src/worker/agent.worker.ts` with streaming HTTP requests (Axios) and stdio MCP clients
- [x] Create TUI Cyberpunk interface in `src/tui/index.tsx` using React Ink and custom keyboard listener

## Testing
- [x] Unit tests for `AgentRunner` lifecycle and IPC messaging
- [x] Integration tests for `sqlite` store using memory database (`:memory:`)
- [x] Edge case: Test graceful worker teardown on premature CLI exit

## Verification
- [x] Run test suite: `npm run test`
- [x] Manual verification: Execute CLI and spawn interactive subtasks

## Documentation
- [x] Update README with installation instructions and CLI usage
- [x] Add ADR for SQLite Threading choice if needed

## Completion
- [x] Archive change folder
- [x] Update `.spec.yaml` status to completed

