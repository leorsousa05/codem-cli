import { parseReasoningMarkers } from '../../tui/utils/reasoningParser.js';

describe('parseReasoningMarkers', () => {
  it('returns plain lines when no reasoning markers exist', () => {
    const result = parseReasoningMarkers(['hello', 'world']);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('line');
  });

  it('groups reasoning between start and end markers', () => {
    const result = parseReasoningMarkers([
      '[REASONING_START]',
      'step 1',
      'step 2',
      '[REASONING_END]',
      'answer',
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('reasoning');
    if (result[0].type === 'reasoning') {
      expect(result[0].text).toBe('step 1\nstep 2');
    }
    expect(result[1].type).toBe('line');
  });

  it('ignores orphan end marker', () => {
    const result = parseReasoningMarkers(['[REASONING_END]', 'answer']);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('line');
    expect(result[1].type).toBe('line');
  });

  it('treats unclosed reasoning as plain lines', () => {
    const result = parseReasoningMarkers(['[REASONING_START]', 'step 1']);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('line');
    expect(result[1].type).toBe('line');
  });
});
