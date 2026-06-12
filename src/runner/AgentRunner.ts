import { Worker } from 'worker_threads';
import * as path from 'path';
import { IPCMessage } from '../common/types.js';

export class AgentRunner {
  private workers = new Map<string, Worker>();
  private messageListeners = new Set<(message: IPCMessage) => void>();

  public spawn(agentId: string, initialPrompt: string, sandboxMode: 'MANUAL' | 'AUTO' = 'MANUAL'): Promise<void> {
    return new Promise((resolve, reject) => {
      // Resolve compiled JS output inside dist directory
      const activeDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(new URL(import.meta.url).pathname);
      let workerPath = path.resolve(activeDir, 'agentWorker.js');
      // If running inside Jest test directory, point to dist target build
      if (workerPath.includes('src/runner')) {
        workerPath = workerPath.replace('src/runner', 'dist/runner');
      }
      
      const worker = new Worker(workerPath, {
        workerData: { agentId, initialPrompt, sandboxMode }
      });

      worker.on('message', (message: IPCMessage) => {
        this.notifyListeners(message);
      });

      worker.on('error', (err: any) => {
        this.notifyListeners({
          id: Math.random().toString(36).substring(7),
          agentId,
          type: 'AGENT_STATUS',
          payload: { status: 'ERROR', error: err.message || String(err) },
          timestamp: Date.now()
        });
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.notifyListeners({
            id: Math.random().toString(36).substring(7),
            agentId,
            type: 'AGENT_STATUS',
            payload: { status: 'ERROR', error: `Worker exited with status ${code}` },
            timestamp: Date.now()
          });
        }
      });

      this.workers.set(agentId, worker);
      resolve();
    });
  }

  public stop(agentId: string): Promise<void> {
    const worker = this.workers.get(agentId);
    if (worker) {
      worker.postMessage({
        id: Math.random().toString(36).substring(7),
        agentId,
        type: 'AGENT_STOP',
        payload: {},
        timestamp: Date.now()
      } as IPCMessage);
      
      // Force terminate if worker does not exit within 1 second
      setTimeout(() => {
        worker.terminate();
      }, 1000);

      this.workers.delete(agentId);
    }
    return Promise.resolve();
  }

  public sendCommand(agentId: string, command: string): Promise<void> {
    const worker = this.workers.get(agentId);
    if (worker) {
      worker.postMessage({
        id: Math.random().toString(36).substring(7),
        agentId,
        type: 'AGENT_INPUT',
        payload: { command },
        timestamp: Date.now()
      } as IPCMessage);
    }
    return Promise.resolve();
  }

  public sendApproval(agentId: string, requestId: string, approved: boolean): Promise<void> {
    const worker = this.workers.get(agentId);
    if (worker) {
      worker.postMessage({
        id: Math.random().toString(36).substring(7),
        agentId,
        type: 'AGENT_TOOL_RESPONSE',
        payload: { requestId, approved, response: approved ? 'Success' : 'User denied operation' },
        timestamp: Date.now()
      } as IPCMessage);
    }
    return Promise.resolve();
  }

  public onMessage(listener: (message: IPCMessage) => void) {
    this.messageListeners.add(listener);
  }

  private notifyListeners(message: IPCMessage) {
    for (const listener of this.messageListeners) {
      listener(message);
    }
  }
}
