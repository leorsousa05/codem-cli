import { parseToolMarkers, isToolCallBlock, ToolCallBlock, LogEntry } from '../../tui/utils/toolLogParser.js';

function assertBlock(entry: LogEntry): ToolCallBlock {
  expect(isToolCallBlock(entry)).toBe(true);
  return entry as ToolCallBlock;
}

describe('toolLogParser', () => {
  it('returns plain lines for non-tool content', () => {
    const result = parseToolMarkers(['hello', 'world']);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('line');
    expect((result[0] as { text: string }).text).toBe('hello');
  });

  it('groups a complete successful tool call', () => {
    const result = parseToolMarkers([
      '[TOOL_START] read_file native',
      '[TOOL_RUN] read_file',
      '[TOOL_RESULT] read_file {"content":"hello"}',
      '[TOOL_SUCCESS] read_file',
    ]);
    expect(result).toHaveLength(1);
    const block = assertBlock(result[0]);
    expect(block.toolName).toBe('read_file');
    expect(block.serverName).toBe('native');
    expect(block.status).toBe('success');
    expect(block.resultText).toBe('hello');
    expect(block.details).toHaveLength(4);
  });

  it('groups a tool call error', () => {
    const result = parseToolMarkers([
      '[TOOL_START] execute_bash native',
      '[TOOL_RUN] execute_bash',
      '[TOOL_ERROR] execute_bash command failed',
    ]);
    expect(result).toHaveLength(1);
    const block = assertBlock(result[0]);
    expect(block.toolName).toBe('execute_bash');
    expect(block.status).toBe('error');
    expect(block.resultText).toBe('command failed');
  });

  it('groups a rejected tool call', () => {
    const result = parseToolMarkers([
      '[TOOL_START] write_file native',
      '[TOOL_REJECTED] write_file',
    ]);
    expect(result).toHaveLength(1);
    const block = assertBlock(result[0]);
    expect(block.toolName).toBe('write_file');
    expect(block.status).toBe('rejected');
    expect(block.resultText).toBe('rejected by user');
  });

  it('handles MCP server names with spaces', () => {
    const result = parseToolMarkers([
      '[TOOL_START] list_files filesystem server',
      '[TOOL_RUN] list_files',
      '[TOOL_SUCCESS] list_files',
    ]);
    const block = assertBlock(result[0]);
    expect(block.toolName).toBe('list_files');
    expect(block.serverName).toBe('filesystem server');
  });

  it('treats orphan end markers as plain lines', () => {
    const result = parseToolMarkers(['[TOOL_SUCCESS] read_file']);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('line');
  });
});
