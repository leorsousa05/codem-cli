import { Worker } from 'worker_threads';
import { AgentSession, IPCMessage, IAgentRunner, ToolResponsePayload } from '../common/types.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AgentRunner implements IAgentRunner {
  private activeWorkers: Map<string, Worker> = new Map();
  private messageListeners: Set<(message: IPCMessage) => void> = new Set();
  private apiKey = '';
  private model = 'moonshot-v1-8k';

  constructor(apiKey?: string, model?: string) {
    if (apiKey) this.apiKey = apiKey;
    if (model) this.model = model;
  }

  public setProvider(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  public spawn(session: AgentSession): void {
    // O worker_threads do Node aponta para o arquivo JS compilado
    const workerPath = path.resolve(__dirname, '../worker/agent.worker.js');
    
    const worker = new Worker(workerPath, {
      workerData: {
        agentId: session.id,
        apiKey: this.apiKey,
        model: this.model
      }
    });

    worker.on('message', (message: IPCMessage) => {
      // Repassa eventos locais
      this.notifyListeners(message);
      
      // Lida com interceptação de spawn de subtask a partir do worker
      if (message.type === 'AGENT_SPAWN_SUBTASK') {
        const subtaskSession = message.payload as AgentSession;
        this.spawn(subtaskSession);
      }
    });

    worker.on('error', (err) => {
      this.notifyListeners({
        type: 'AGENT_STATUS',
        agentId: session.id,
        payload: { status: 'ERROR', error: err.message }
      });
      this.notifyListeners({
        type: 'AGENT_OUTPUT',
        agentId: session.id,
        payload: { text: `\n[WORKER RUNTIME ERROR]: ${err.message}\n` }
      });
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        this.notifyListeners({
          type: 'AGENT_STATUS',
          agentId: session.id,
          payload: { status: 'ERROR' }
        });
      }
      this.activeWorkers.delete(session.id);
    });

    this.activeWorkers.set(session.id, worker);
    
    // Dispara sinalizador inicial na TUI
    this.notifyListeners({
      type: 'AGENT_SPAWN',
      agentId: session.id,
      payload: { session }
    });
  }

  public async stop(agentId: string): Promise<void> {
    const worker = this.activeWorkers.get(agentId);
    if (worker) {
      worker.postMessage({ type: 'AGENT_STOP', agentId } as IPCMessage);
      
      // Dá um tempo razoável para fechar graciosamente, senão termina forçado
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          resolve();
        }, 1000);

        worker.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.activeWorkers.delete(agentId);
    }
  }

  public sendCommand(agentId: string, command: string): void {
    const worker = this.activeWorkers.get(agentId);
    if (worker) {
      worker.postMessage({
        type: 'AGENT_INPUT',
        agentId,
        payload: { command }
      } as IPCMessage);
    }
  }

  public sendApproval(agentId: string, payload: ToolResponsePayload): void {
    const worker = this.activeWorkers.get(agentId);
    if (worker) {
      worker.postMessage({
        type: 'AGENT_TOOL_RESPONSE',
        agentId,
        payload
      } as IPCMessage);
    }
  }

  public onMessage(callback: (message: IPCMessage) => void): void {
    this.messageListeners.add(callback);
  }

  private notifyListeners(message: IPCMessage) {
    for (const listener of this.messageListeners) {
      try {
        listener(message);
      } catch {}
    }
  }

  public async shutdownAll(): Promise<void> {
    const ids = Array.from(this.activeWorkers.keys());
    for (const id of ids) {
      await this.stop(id);
    }
  }
}
