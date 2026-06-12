import {
  ToolCallBlock,
  ToolCallStatus,
  ReasoningBlock,
  parseToolMarkers,
  LogEntry as ParserLogEntry,
} from './toolLogParser.js';
import { parseReasoningMarkers } from './reasoningParser.js';

export type { ToolCallBlock, ToolCallStatus, ReasoningBlock } from './toolLogParser.js';

export type LogVariant =
  | 'default'
  | 'user'
  | 'system'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export interface FormattedLine {
  type: 'line';
  text: string;
  variant: LogVariant;
  bold: boolean;
}

export type LogEntry = FormattedLine | ToolCallBlock | ReasoningBlock;

export function isToolCallBlock(entry: LogEntry): entry is ToolCallBlock {
  return entry.type === 'tool-call';
}

export function isReasoningBlock(entry: LogEntry): entry is ReasoningBlock {
  return entry.type === 'reasoning';
}

export function classifyLine(line: string): FormattedLine {
  const trimmed = line.trim();

  if (trimmed.startsWith('[USER]:')) {
    return { type: 'line', text: `> ${trimmed.substring(7).trim()}`, variant: 'user', bold: true };
  }

  if (
    trimmed.startsWith('[CRITICAL ERROR]:') ||
    trimmed.startsWith('[WORKER RUNTIME ERROR]:')
  ) {
    return { type: 'line', text: trimmed, variant: 'error', bold: true };
  }

  if (trimmed.startsWith('System:') || trimmed.startsWith('[SYSTEM]:')) {
    return { type: 'line', text: trimmed, variant: 'system', bold: true };
  }

  if (trimmed.startsWith('History cleared') || trimmed.startsWith('New session created')) {
    return { type: 'line', text: trimmed, variant: 'info', bold: false };
  }

  return { type: 'line', text: trimmed, variant: 'default', bold: false };
}

export function formatLogs(rawLogs: string[], maxLines: number): LogEntry[] {
  if (!rawLogs) return [];
  const allLines = rawLogs.flatMap((log) => log.split('\n'));
  const reasoningEntries = parseReasoningMarkers(allLines);

  const result: LogEntry[] = [];
  let plainBuffer: string[] = [];

  const flushPlain = () => {
    if (plainBuffer.length === 0) return;
    const parsed = parseToolMarkers(plainBuffer);
    for (const entry of parsed) {
      if (entry.type === 'tool-call') {
        result.push(entry);
      } else {
        result.push(classifyLine(entry.text));
      }
    }
    plainBuffer = [];
  };

  for (const entry of reasoningEntries) {
    if (entry.type === 'reasoning') {
      flushPlain();
      result.push(entry);
    } else {
      plainBuffer.push(entry.text);
    }
  }

  flushPlain();
  return result.slice(-maxLines);
}
