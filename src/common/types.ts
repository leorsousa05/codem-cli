export type MessageType = 
  | 'AGENT_SPAWN'
  | 'AGENT_OUTPUT'
  | 'AGENT_INPUT'
  | 'AGENT_STATUS'
  | 'AGENT_TOOL_REQUEST'
  | 'AGENT_TOOL_RESPONSE'
  | 'AGENT_STOP';

export type AgentStatus =
  | 'IDLE'
  | 'THINKING'
  | 'EXECUTING_TOOL'
  | 'AWAITING_APPROVAL'
  | 'STOPPED'
  | 'FINISHED'
  | 'ERROR';

export type ToolType = 
  | 'FILE_READ' 
  | 'FILE_WRITE' 
  | 'SHELL_EXECUTE' 
  | 'MCP_CALL';

export interface IPCMessage {
  id: string;
  agentId: string;
  type: MessageType;
  payload: any;
  timestamp: number;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
}

export interface AgentSession {
  id: string;
  name: string;
  status: AgentStatus;
  logs: string[];
}

export interface ToolRequestPayload {
  requestId: string;
  toolType: ToolType;
  target: string;
  params: any;
}
