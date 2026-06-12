# Specification Delta: Init Codem CLI

## System Interface Contracts

```typescript
export interface IStorage {
  initialize(): Promise<void>;
  saveMessage(message: AgentMessage): Promise<void>;
  getHistory(sessionId: string): Promise<AgentMessage[]>;
  saveConfig(key: string, value: string): Promise<void>;
  getConfig(key: string): Promise<string | null>;
}

export interface IAgentRunner {
  spawn(agentId: string, initialPrompt: string): Promise<void>;
  stop(agentId: string): Promise<void>;
  sendCommand(agentId: string, command: string): Promise<void>;
  sendApproval(agentId: string, requestId: string, approved: boolean): Promise<void>;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
}
```
