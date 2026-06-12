import { collectStreamOutput } from '../../worker/harness/AgentHarness.js';

function mockResponse(options: {
  parts: Array<{ type: string; text?: string; error?: unknown }>;
  text?: string;
  reasoningText?: string;
  toolCalls?: any[];
}): any {
  return {
    fullStream: (async function* () {
      for (const part of options.parts) {
        yield part;
      }
    })(),
    text: Promise.resolve(options.text ?? ''),
    reasoningText: Promise.resolve(options.reasoningText),
    toolCalls: Promise.resolve(options.toolCalls ?? []),
  };
}

describe('collectStreamOutput', () => {
  it('accumulates text and reasoning deltas', async () => {
    const response = mockResponse({
      parts: [
        { type: 'text-delta', text: 'Hello' },
        { type: 'reasoning-delta', text: 'think ' },
        { type: 'reasoning-delta', text: 'deeply' },
        { type: 'text-delta', text: ' world' },
      ],
      text: 'Hello world',
      reasoningText: 'think deeply',
      toolCalls: [],
    });

    const output = await collectStreamOutput(response);

    expect(output.assistantText).toBe('Hello world');
    expect(output.reasoningText).toBe('think deeply');
    expect(output.streamError).toBeNull();
  });

  it('captures Error stream events', async () => {
    const response = mockResponse({
      parts: [{ type: 'error', error: new Error('stream failed') }],
    });

    const output = await collectStreamOutput(response);

    expect(output.streamError).toBe('stream failed');
    expect(output.assistantText).toBe('');
    expect(output.reasoningText).toBe('');
  });

  it('captures non-Error stream events', async () => {
    const response = mockResponse({
      parts: [{ type: 'error', error: 'plain failure' }],
    });

    const output = await collectStreamOutput(response);

    expect(output.streamError).toBe('plain failure');
  });

  it('resolves text, reasoning and tool calls promises', async () => {
    const toolCall = { toolCallId: 'call-1', toolName: 'readFile', args: { path: 'x' } };
    const response = mockResponse({
      parts: [],
      text: 'final answer',
      reasoningText: 'resolved reasoning',
      toolCalls: [toolCall],
    });

    const output = await collectStreamOutput(response);

    expect(output.resolvedText).toBe('final answer');
    expect(output.resolvedReasoning).toBe('resolved reasoning');
    expect(output.resolvedToolCalls).toEqual([toolCall]);
  });

  it('returns empty output when stream and promises are empty', async () => {
    const response = mockResponse({ parts: [] });

    const output = await collectStreamOutput(response);

    expect(output.assistantText).toBe('');
    expect(output.reasoningText).toBe('');
    expect(output.streamError).toBeNull();
    expect(output.resolvedToolCalls).toEqual([]);
  });
});
