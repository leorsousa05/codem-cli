import { ToolCallBlock, ToolCallStatus, parseToolMarkers } from './toolLogParser.js';

export type { ToolCallBlock, ToolCallStatus } from './toolLogParser.js';

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

export type LogEntry = FormattedLine | ToolCallBlock;

export function isToolCallBlock(entry: LogEntry): entry is ToolCallBlock {
  return entry.type === 'tool-call';
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

  if (trimmed.startsWith('System:')) {
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
  const entries = parseToolMarkers(allLines);
  const classified = entries.map((entry) => {
    if (entry.type === 'tool-call') return entry;
    return classifyLine(entry.text);
  });
  return classified.slice(-maxLines);
}
