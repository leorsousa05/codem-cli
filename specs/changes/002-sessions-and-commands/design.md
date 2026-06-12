# Design: Interactive Sessions Management and Slash Commands Menu

## Directory Structure

Abaixo está mapeada a árvore ASCII de todos os arquivos relevantes que serão criados ou alterados na implementação desta funcionalidade.

```
/home/arch/codes/codem-cli/
├── src/
│   ├── common/
│   │   └── types.ts               # MODIFICADO: Contratos de TUIMode e novas assinaturas de banco
│   ├── db/
│   │   └── sqlite.ts              # MODIFICADO: Métodos de exclusão, busca de logs estruturados e carga
│   └── tui/
│       └── index.tsx              # MODIFICADO: State Machine de renderização e manipuladores de input
```

---

## Architectural Patterns & Design Choices

### 1. State Machine (State Pattern)
- **Aplicação:** O fluxo da TUI é controlado por uma variável de estado explícita chamada `tuiMode` do tipo `TUIMode`. A máquina de estados define:
  1. O que é renderizado em tela (se o histórico de chat normal, a lista de sessões antigas ou o popup de slash commands).
  2. Como a captura de entrada do teclado no hook `useInput` do React Ink interpreta cada tecla (setas para navegação no menu vs digitação de texto no prompt).
- **Justificativa:** Previne conflitos onde a digitação de texto do usuário acaba disparando atalhos de navegação na árvore de agentes, isolando os comportamentos de forma limpa.

### 2. Command Menu Pattern (Slash Menu)
- **Aplicação:** A detecção do caractere `/` no modo `'CHAT'` intercepta o evento, limpa a entrada atual e chaveia o modo para `'COMMANDS_MENU'`, renderizando uma lista interativa.
- **Justificativa:** Reduz a necessidade de digitação complexa e erros sintáticos do usuário, facilitando o acesso rápido a comandos do sistema.

---

## Formal Contracts & Types (`src/common/types.ts`)

```typescript
export type TUIMode = 'CHAT' | 'COMMANDS_MENU' | 'SESSIONS_MENU' | 'PROVIDER_SETUP';

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

export interface IDatabaseStore {
  initialize(): Promise<void>;
  createSession(session: Omit<AgentSession, 'logs'>): Promise<void>;
  updateSessionStatus(id: string, status: AgentStatus): Promise<void>;
  appendLog(agentId: string, text: string): Promise<void>;
  getSessionLogs(agentId: string): Promise<string[]>;
  getAllSessions(): Promise<AgentSession[]>;
  deleteSession(agentId: string): Promise<void>; // Novo método
  close(): Promise<void>;
}
```

---

## Data Flow & State Management

### TUI Mode Transition Machine
```
   [CHAT MODE] ──( usuário digita "/" )──> [COMMANDS_MENU]
        │                                       │
   (Esc / Enter)                           (Setas + Enter)
        │                                       │
        ▼                                       ├─► Seleciona "/provider" ──► [PROVIDER_SETUP]
   [CHAT MODE] <────────────────────────────────┼─► Seleciona "/session" ───► [SESSIONS_MENU]
                                                └─► Seleciona "/new" ───────► Cria nova sessão no DB & CHAT
```

### Flow of Session Loading:
1. O usuário seleciona uma sessão no menu `SESSIONS_MENU` e dá `Enter`.
2. A TUI dispara `dbStore.getSessionLogs(selectedId)`.
3. A Promise retorna a lista ordenada de strings do histórico daquela sessão.
4. A TUI atualiza o estado local `sessions` (limpando mensagens anteriores do agente antigo e substituindo pelo log do histórico carregado).
5. O `focusedAgentId` é atualizado para o ID selecionado.
6. A TUI atualiza o `tuiMode` para `'CHAT'`, devolvendo o controle da digitação do teclado ao prompt do usuário.

---

## Error Handling & Exception Specifications

- **SQLite Query Failures:** Se `dbStore.getSessionLogs` falhar, a TUI captura a exceção, adiciona um log de erro visual vermelho no console e reverte o estado para `'CHAT'` sem quebrar a execução.
- **Empty Database Sessions:** Se o banco de dados for reiniciado ou estiver vazio de sessões históricas, o menu `/session` exibe um aviso "No previous sessions found." e permite ao usuário retornar ao chat com o botão `Esc`.
- **Worker Isolation during switch:** Ao trocar de sessão ativa, o Runner mantém os workers de sessões antigas suspensos (IDLE ou STOPPED) para evitar poluição visual de logs cruzados.
