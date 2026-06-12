import { ReasoningBlock, PlainLine } from './toolLogParser.js';

const MARKER_START = '[REASONING_START]';
const MARKER_END = '[REASONING_END]';

export function parseReasoningMarkers(lines: string[]): (PlainLine | ReasoningBlock)[] {
  const entries: (PlainLine | ReasoningBlock)[] = [];
  let buffer: string[] = [];
  let inside = false;

  const pushPlain = (text: string) => entries.push({ type: 'line', text });
  const flushBuffer = () => {
    for (const text of buffer) {
      pushPlain(text);
    }
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === MARKER_START) {
      if (inside) {
        pushPlain(MARKER_START);
        continue;
      }
      flushBuffer();
      inside = true;
      continue;
    }

    if (line === MARKER_END) {
      if (!inside) {
        pushPlain(MARKER_END);
        continue;
      }
      const text = buffer.join('\n');
      entries.push({ type: 'reasoning', id: `reasoning-${entries.length}`, text });
      buffer = [];
      inside = false;
      continue;
    }

    if (inside) {
      buffer.push(rawLine);
    } else {
      pushPlain(rawLine);
    }
  }

  if (inside) {
    pushPlain(MARKER_START);
    flushBuffer();
  }

  return entries;
}
