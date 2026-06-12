import { AgentRunner } from '../AgentRunner.js';
import { IPCMessage } from '../../common/types.js';

describe('AgentRunner Work Threads Execution Tests', () => {
  let runner: AgentRunner;

  beforeEach(() => {
    runner = new AgentRunner();
  });

  afterEach(async () => {
    await runner.stop('agent-test-runner');
  });

  test('Should spawn mock worker and trigger lifecycle IPC status updates', (done) => {
    const messagesReceived: IPCMessage[] = [];

    runner.onMessage((msg) => {
      if (msg.agentId === 'agent-test-runner') {
        messagesReceived.push(msg);
        
        if (msg.type === 'AGENT_TOOL_REQUEST') {
          expect(messagesReceived.some(m => m.type === 'AGENT_STATUS' && m.payload.status === 'THINKING')).toBe(true);
          expect(msg.payload.toolType).toBe('FILE_READ');
          done();
        }
      }
    });

    runner.spawn('agent-test-runner', 'Inspect setup dependencies', 'MANUAL');
  }, 10000);
});
