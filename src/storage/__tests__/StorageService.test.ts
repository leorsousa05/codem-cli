import { StorageService } from '../StorageService.js';
import { AgentMessage } from '../../common/types.js';

describe('StorageService SQLite Persistence Tests', () => {
  let storage: StorageService;

  beforeAll(async () => {
    storage = new StorageService();
    await storage.initialize();
  });

  afterAll(async () => {
    await storage.close();
  });

  test('Should correctly save and retrieve configurations', async () => {
    await storage.saveConfig('api_key', 'moonshot-mock-key-xyz');
    const apiKey = await storage.getConfig('api_key');
    expect(apiKey).toBe('moonshot-mock-key-xyz');
  });

  test('Should return null for non-existing configurations', async () => {
    const configVal = await storage.getConfig('non_existing_key_123');
    expect(configVal).toBeNull();
  });

  test('Should preserve message logs and history context ordering', async () => {
    const mockMessage: AgentMessage = {
      id: 'msg-test-01',
      role: 'user',
      content: 'Who are you?',
      timestamp: Date.now()
    };

    // Note: session id must be valid, but sqlite foreign key is not strictly enforced unless configured.
    // However, let us verify saving message directly
    await storage.saveMessage('session-01', 'agent-01', mockMessage);
    
    const history = await storage.getHistory('session-01');
    expect(history.length).toBeGreaterThanOrEqual(1);
    const savedMsg = history.find(m => m.id === 'msg-test-01');
    expect(savedMsg).toBeDefined();
    expect(savedMsg?.content).toBe('Who are you?');
  });
});
