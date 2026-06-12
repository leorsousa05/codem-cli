# Design: IA Code Assistance CLI (Moonshot & MCP)

## Architectural Blueprint & Directory Structure

O projeto adota uma arquitetura **Modular Separated Client-Worker Architecture**. O Main Process gerencia a TUI (Interface do Usuário) e a persistência de banco de dados, atuando como o orquestrador seguro. Os Workers executam em threads totalmente paralelas rodando o loop de eventos de IA, atuando como clientes isolados.

```
/home/arch/codes/codem-cli/
├── package.json                   # Dependências e scripts de build/teste
├── tsconfig.json                  # Configuração do TypeScript (ESM/NodeNext target)
├── jest.config.js                 # Configuração do Jest para ESM e ts-jest
├── specs/                         # Documentação viva de design e especificações
│   └── changes/
│       └── 001-codem-cli/
│           ├── .spec.yaml
│           ├── proposal.md
│           ├── design.md
│           ├── tasks.md
│           └── specs/
│               └── spec.md
├── src/
│   ├── index.ts                   # Ponto de entrada do CLI (inicialização)
│   ├── common/
│   │   └── types.ts               # Tipagens estritas do IPC e contratos de dados
│   ├── db/
│   │   └── sqlite.ts              # Driver de persistência SQLite
│   ├── runner/
│   │   └── AgentRunner.ts         # Orquestrador de Worker Threads e IPC
│   ├── worker/
│   │   ├── agent.worker.ts        # Código de bootstrap do Worker Thread
│   │   ├── KimiClient.ts          # Cliente de streaming HTTP da API Moonshot
│   │   └── MCPClient.ts           # Wrapper cliente do Model Context Protocol via Stdio
│   └── tui/
│       ├── index.tsx              # Componente Root da TUI (React Ink)
│       ├── components/
│       │   ├── TelemetryHeader.tsx# Árvore dinâmica de agentes concorrentes
│       │   ├── LogViewer.tsx      # Terminal com delimitadores verticais de log
│       │   ├── SandboxModal.tsx   # Caixa amarela de aprovação (Zero-Trust)
│       │   └── StatusLine.tsx     # Barra de rodapé com metadados de execução
│       └── hooks/
│           └── useKeyboard.ts     # Hook customizado para navegação e foco
```

---

## Architecture & Design Patterns

### 1. Master-Worker Architecture
- **Aplicação:** O thread principal gerencia a entrada/saída (teclado, console renderizado via React Ink) e operações bloqueantes ou críticas de I/O (SQLite3). Os workers (`worker_threads`) cuidam da comunicação de rede pesada e loops de processamento de texto.
- **Justificativa:** Garante que a interface do terminal permaneça fluida a 60 FPS, mesmo quando há stream massivo de dados vindo de múltiplos subagentes simultaneamente. Evita condições de corrida (race conditions) no banco de dados SQLite.

### 2. Observer Pattern
- **Aplicação:** O `AgentRunner` atua como o Subject que notifica os observers (componentes da TUI React Ink e persistência do DB) sempre que uma nova mensagem IPC do tipo `AGENT_OUTPUT`, `AGENT_STATUS` ou `AGENT_TOOL_REQUEST` chega de qualquer Worker.
- **Justificativa:** Desacopla a camada de renderização e persistência de dados da lógica de gerenciamento de threads e ciclos de vida.

### 3. Sandbox (Delegated Capability Pattern)
- **Aplicação:** O Worker não possui recursos locais ou permissões diretas de escrita no file system do host. Sempre que o LLM requer uma ferramenta MCP local, o Worker serializa a requisição como `AGENT_TOOL_REQUEST` e entra em uma trava de espera assíncrona (Promise controlada por callback). A execução local ocorre no Main Thread após consentimento explícito.
- **Justificativa:** Mantém um isolamento de segurança absoluto contra execuções arbitrárias de código pelo modelo de IA.

---

## Formal Contracts (`src/common/types.ts`)

```typescript
export type MessageType =
  | 'AGENT_SPAWN'
  | 'AGENT_SPAWN_SUBTASK'
  | 'AGENT_OUTPUT'
  | 'AGENT_INPUT'
  | 'AGENT_STATUS'
  | 'AGENT_TOOL_REQUEST'
  | 'AGENT_TOOL_RESPONSE'
  | 'AGENT_STOP'
  | 'AGENT_DESTROY_SUBTASK';

export type AgentStatus =
  | 'IDLE'
  | 'THINKING'
  | 'EXECUTING_TOOL'
  | 'AWAITING_APPROVAL'
  | 'STOPPED'
  | 'FINISHED'
  | 'ERROR';

export interface AgentSession {
  id: string;
  parentId?: string;
  name: string;
  status: AgentStatus;
  logs: string[];
  isSubtask: boolean;
}

export interface IPCMessage {
  type: MessageType;
  agentId: string;
  payload?: any;
}

export interface ToolRequestPayload {
  toolName: string;
  arguments: Record<string, any>;
  serverName: string;
}

export interface ToolResponsePayload {
  approved: boolean;
  result?: any;
  error?: string;
}
```

### DB Contracts (`src/db/sqlite.ts`)

```typescript
export interface IDatabaseStore {
  initialize(): Promise<void>;
  createSession(session: Omit<AgentSession, 'logs'>): Promise<void>;
  updateSessionStatus(id: string, status: AgentStatus): Promise<void>;
  appendLog(agentId: string, text: string): Promise<void>;
  getSessionLogs(agentId: string): Promise<string[]>;
  getAllSessions(): Promise<AgentSession[]>;
  close(): Promise<void>;
}
```

### Runner Contracts (`src/runner/AgentRunner.ts`)

```typescript
import { AgentSession, AgentStatus, ToolResponsePayload } from '../common/types';

export interface IAgentRunner {
  spawn(session: AgentSession): void;
  stop(agentId: string): Promise<void>;
  sendCommand(agentId: string, command: string): void;
  sendApproval(agentId: string, payload: ToolResponsePayload): void;
  onMessage(callback: (message: any) => void): void;
}
```

---

## Data Flow & State Management

### State Lifecycle
1. O estado global das sessões (`AgentSession[]`) é mantido em uma Store reativa do React Ink no Main Process.
2. A navegação pelo teclado captura as setas usando o hook `useInput` do Ink, atualizando o ID do agente focado no estado local: `focusedAgentId: string`.
3. O componente `LogViewer` faz o filtro baseado no `focusedAgentId` e exibe instantaneamente apenas as linhas de log vinculadas àquele agente específico.

### IPC Message Payload Exchange Flow
```
[Worker Thread]                                               [Main Process / TUI]
       |                                                               |
       |-- (IPC: MessageType='AGENT_TOOL_REQUEST') ------------------->|
       |   Payload: { toolName, arguments, serverName }                |
       |                                                               |-- Trigger re-render (Show Sandbox Modal)
       |   [Worker Thread enters waiting state via Promise]            |-- User accepts (Presses Enter)
       |<-- (IPC: MessageType='AGENT_TOOL_RESPONSE') ------------------|
       |    Payload: { approved: true, result: ... }                   |
       |                                                               |
       |-- (Executes callback & continues)                            |
```

## Error Handling & Edge Cases

- **Worker Crashing:** Caso a thread paralela falhe com um erro não tratado, o listener `.on('error')` no Main Process captura o erro, altera o status do subagente para `ERROR` e persiste a stack trace como logs daquela sessão.
- **MCP Disconnection:** Se a conexão stdio com um servidor MCP cair, o `MCPClient` emite uma exceção que é capturada pelo Worker, logando o incidente como aviso e retornando a descrição do erro de volta ao prompt do LLM sem quebrar a execução global.

## Security & Sandbox Rules
- Os servidores MCP são declarados no arquivo `~/.codem/mcp.json`. Qualquer ferramenta solicitada pelo LLM deve bater contra este schema local de configuração.
- O Worker não possui acesso ao módulo `fs` do Node ou subprocessos do sistema host (`child_process`). Qualquer interação local deve ser solicitada à thread pai via `AGENT_TOOL_REQUEST`.
