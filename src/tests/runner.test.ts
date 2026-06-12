import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { AgentRunner } from '../runner/AgentRunner.js';
import { AgentSession } from '../common/types.js';

describe('AgentRunner Lifecycle and IPC Tests', () => {
  let runner: AgentRunner;

  beforeEach(() => {
    runner = new AgentRunner('test-key', 'moonshot-v1-8k');
  });

  afterEach(async () => {
    await runner.shutdownAll();
  });

  test('should register message listeners', () => {
    const callback = jest.fn();
    runner.onMessage(callback);
    expect(runner['messageListeners'].has(callback)).toBe(true);
  });

  test('should track spawned worker threads and clean up on stop', async () => {
    const session: AgentSession = {
      id: 'test-runner-agent',
      name: 'Runner Test Agent',
      status: 'IDLE',
      logs: [],
      isSubtask: false
    };

    // Spawna e verifica que foi adicionado ao mapa de workers ativos
    runner.spawn(session);
    expect(runner['activeWorkers'].has('test-runner-agent')).toBe(true);

    // Encerra e limpa
    await runner.stop('test-runner-agent');
    expect(runner['activeWorkers'].has('test-runner-agent')).toBe(false);
  });
});
