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

export interface KimiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export type TUIOverlayMode = 'NONE' | 'HELP' | 'MODELS_SELECT' | 'SESSIONS_SELECT' | 'MCP_STATUS';

export interface IDatabaseStore {
  initialize(): Promise<void>;
  createSession(session: Omit<AgentSession, 'logs'>): Promise<void>;
  updateSessionStatus(id: string, status: AgentStatus): Promise<void>;
  appendLog(agentId: string, text: string): Promise<void>;
  getSessionLogs(agentId: string): Promise<string[]>;
  getAllSessions(): Promise<AgentSession[]>;
  deleteSession(agentId: string): Promise<void>;
  close(): Promise<void>;
}

export interface IAgentRunner {
  spawn(session: AgentSession): void;
  stop(agentId: string): Promise<void>;
  sendCommand(agentId: string, command: string): void;
  sendApproval(agentId: string, payload: ToolResponsePayload): void;
  onMessage(callback: (message: IPCMessage) => void): void;
}

