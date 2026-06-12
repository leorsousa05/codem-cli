# Spec Delta: IA Code Assistance CLI (Moonshot & MCP)

## Current State
Nenhum código existente (projeto novo iniciado a partir do zero).

## Changes

### ADDED
- `src/common/types.ts`: Contratos e tipagens completas de mensagens, sessões e payload do protocolo de IPC.
- `src/db/sqlite.ts`: Conexão, tabelas de sessões/logs e queries de persistência utilizando SQLite3.
- `src/runner/AgentRunner.ts`: Módulo orquestrador de workers baseados em `worker_threads` do Node, suportando envio de comandos, aprovação de sandbox e destruição ordenada.
- `src/worker/agent.worker.ts`: Script secundário que roda nas threads paralelas executando loops de IA (Kimi API via Axios streaming) e integrações MCP.
- `src/tui/index.tsx`: Interface visual de console construída com React Ink (Cyberpunk HUD, navegação por setas/tab, statusline e caixa de aprovação do sandbox).

### MODIFIED
Nenhum (projeto novo).

### REMOVED
Nenhum.

## Migration Notes
Não há migração de dados ou código necessária, pois trata-se do bootstrap de uma nova ferramenta CLI.

## Backward Compatibility
Não aplicável (v1.0.0).
