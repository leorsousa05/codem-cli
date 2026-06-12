import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseStore } from '../db/sqlite.js';
import { AgentSession } from '../common/types.js';

describe('SQLite Storage Integration Tests', () => {
  let store: DatabaseStore;

  beforeEach(async () => {
    store = new DatabaseStore(':memory:');
    await store.initialize();
  });

  afterEach(async () => {
    await store.close();
  });

  test('should create and retrieve sessions', async () => {
    const session: Omit<AgentSession, 'logs'> = {
      id: 'test-agent',
      name: 'Test Agent',
      status: 'IDLE',
      isSubtask: false
    };

    await store.createSession(session);
    const all = await store.getAllSessions();
    
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('test-agent');
    expect(all[0].status).toBe('IDLE');
  });

  test('should update session status', async () => {
    const session: Omit<AgentSession, 'logs'> = {
      id: 'test-agent',
      name: 'Test Agent',
      status: 'IDLE',
      isSubtask: false
    };

    await store.createSession(session);
    await store.updateSessionStatus('test-agent', 'THINKING');
    
    const all = await store.getAllSessions();
    expect(all[0].status).toBe('THINKING');
  });

  test('should append and retrieve logs correctly', async () => {
    const session: Omit<AgentSession, 'logs'> = {
      id: 'test-agent-logs',
      name: 'Test Logs',
      status: 'IDLE',
      isSubtask: false
    };

    await store.createSession(session);
    await store.appendLog('test-agent-logs', 'Log Line 1');
    await store.appendLog('test-agent-logs', 'Log Line 2');

    const logs = await store.getSessionLogs('test-agent-logs');
    expect(logs).toEqual(['Log Line 1', 'Log Line 2']);
  });
});
