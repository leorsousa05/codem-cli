import { classifyLine, formatLogs, isToolCallBlock } from '../../tui/utils/logFormatter.js';

describe('logFormatter', () => {
  describe('classifyLine', () => {
    it('classifies user lines with accent and bold', () => {
      const line = classifyLine('[USER]: hello world');
      expect(line.variant).toBe('user');
      expect(line.bold).toBe(true);
      expect(line.text).toBe('> hello world');
    });

    it('classifies system lines as system and bold', () => {
      const line = classifyLine('System: model updated');
      expect(line.variant).toBe('system');
      expect(line.bold).toBe(true);
    });

    it('classifies error lines as error and bold', () => {
      const line = classifyLine('[CRITICAL ERROR]: something broke');
      expect(line.variant).toBe('error');
      expect(line.bold).toBe(true);
    });

    it('classifies default lines as default', () => {
      const line = classifyLine('Just a normal assistant response');
      expect(line.variant).toBe('default');
      expect(line.bold).toBe(false);
    });
  });

  describe('formatLogs', () => {
    it('returns empty array for empty logs', () => {
      expect(formatLogs([], 10)).toEqual([]);
    });

    it('limits output to maxLines', () => {
      const logs = Array.from({ length: 30 }, (_, i) => `line ${i}\n`);
      const result = formatLogs(logs, 5);
      expect(result).toHaveLength(5);
      const first = result[0] as { text: string };
      const last = result[4] as { text: string };
      expect(first.text).toBe('line 25');
      expect(last.text).toBe('line 29');
    });

    it('splits multiline log entries', () => {
      const logs = ['first\nsecond\nthird'];
      const result = formatLogs(logs, 10);
      expect(result).toHaveLength(3);
      expect((result[0] as { text: string }).text).toBe('first');
      expect((result[1] as { text: string }).text).toBe('second');
      expect((result[2] as { text: string }).text).toBe('third');
    });

    it('groups tool markers into a ToolCallBlock', () => {
      const logs = [
        '[TOOL_START] read_file native',
        '[TOOL_RUN] read_file',
        '[TOOL_RESULT] read_file {"content":"hello"}',
        '[TOOL_SUCCESS] read_file',
      ];
      const result = formatLogs(logs, 10);
      expect(result).toHaveLength(1);
      const block = result[0];
      expect(isToolCallBlock(block)).toBe(true);
      if (isToolCallBlock(block)) {
        expect(block.toolName).toBe('read_file');
        expect(block.serverName).toBe('native');
        expect(block.status).toBe('success');
        expect(block.details).toHaveLength(4);
      }
    });
  });
});
