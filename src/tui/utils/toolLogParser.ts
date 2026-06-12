export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error' | 'rejected';

export interface ToolCallBlock {
  type: 'tool-call';
  id: string;
  toolName: string;
  serverName: string;
  status: ToolCallStatus;
  resultText: string;
  details: string[];
}

export interface PlainLine {
  type: 'line';
  text: string;
}

export type LogEntry = PlainLine | ToolCallBlock;

export function isToolCallBlock(entry: LogEntry): entry is ToolCallBlock {
  return entry.type === 'tool-call';
}

const MARKER_START = '[TOOL_START]';
const MARKER_RUN = '[TOOL_RUN]';
const MARKER_RESULT = '[TOOL_RESULT]';
const MARKER_SUCCESS = '[TOOL_SUCCESS]';
const MARKER_ERROR = '[TOOL_ERROR]';
const MARKER_REJECTED = '[TOOL_REJECTED]';

function parseMarker(line: string, prefix: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith(prefix)) return null;
  return trimmed.slice(prefix.length).trim();
}

function parseStart(line: string): { toolName: string; serverName: string } | null {
  const payload = parseMarker(line, MARKER_START);
  if (!payload) return null;
  const parts = payload.split(' ');
  if (parts.length < 2) return null;
  const toolName = parts[0];
  const serverName = parts.slice(1).join(' ');
  return { toolName, serverName };
}

function parseSingleArg(line: string, prefix: string): string | null {
  const payload = parseMarker(line, prefix);
  return payload ? payload.split(' ')[0] : null;
}

function parseResult(line: string): { toolName: string; result: string } | null {
  const payload = parseMarker(line, MARKER_RESULT);
  if (!payload) return null;
  const spaceIdx = payload.indexOf(' ');
  if (spaceIdx === -1) return null;
  const toolName = payload.slice(0, spaceIdx);
  const result = payload.slice(spaceIdx + 1);
  return { toolName, result };
}

function parseError(line: string): { toolName: string; message: string } | null {
  const payload = parseMarker(line, MARKER_ERROR);
  if (!payload) return null;
  const spaceIdx = payload.indexOf(' ');
  if (spaceIdx === -1) return null;
  const toolName = payload.slice(0, spaceIdx);
  const message = payload.slice(spaceIdx + 1);
  return { toolName, message };
}

function summarizeResult(resultJson: string): string {
  try {
    const parsed = JSON.parse(resultJson);
    if (typeof parsed === 'string') return parsed.slice(0, 80);
    if (parsed && typeof parsed === 'object') {
      const keys = Object.keys(parsed);
      if (keys.length === 0) return '{}';
      if (keys.includes('content') && typeof parsed.content === 'string') {
        return parsed.content.slice(0, 80);
      }
      if (keys.includes('stdout') && typeof parsed.stdout === 'string') {
        return parsed.stdout.slice(0, 80);
      }
      return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
    }
    return String(parsed).slice(0, 80);
  } catch {
    return resultJson.slice(0, 80);
  }
}

let blockSequence = 0;

function nextBlockId(): string {
  blockSequence += 1;
  return `tool-${blockSequence}`;
}

function createBlock(
  current: Partial<ToolCallBlock> & { details: string[] }
): ToolCallBlock {
  return {
    type: 'tool-call',
    id: nextBlockId(),
    toolName: current.toolName || 'unknown',
    serverName: current.serverName || 'unknown',
    status: current.status || 'pending',
    resultText: current.resultText || '',
    details: current.details,
  };
}

export function parseToolMarkers(lines: string[]): LogEntry[] {
  blockSequence = 0;
  const entries: LogEntry[] = [];
  let current: Partial<ToolCallBlock> & { details: string[] } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const start = parseStart(line);
    if (start) {
      if (current) {
        entries.push(createBlock(current));
      }
      current = {
        toolName: start.toolName,
        serverName: start.serverName,
        status: 'pending',
        resultText: '',
        details: [line],
      };
      continue;
    }

    const runTool = parseSingleArg(line, MARKER_RUN);
    if (runTool && current) {
      current.status = 'running';
      current.details.push(line);
      continue;
    }

    const result = parseResult(line);
    if (result && current) {
      current.resultText = summarizeResult(result.result);
      current.details.push(line);
      continue;
    }

    const successTool = parseSingleArg(line, MARKER_SUCCESS);
    if (successTool && current) {
      current.status = 'success';
      current.resultText = current.resultText || 'done';
      current.details.push(line);
      entries.push(createBlock(current));
      current = null;
      continue;
    }

    const error = parseError(line);
    if (error && current) {
      current.status = 'error';
      current.resultText = error.message;
      current.details.push(line);
      entries.push(createBlock(current));
      current = null;
      continue;
    }

    const rejectedTool = parseSingleArg(line, MARKER_REJECTED);
    if (rejectedTool && current) {
      current.status = 'rejected';
      current.resultText = 'rejected by user';
      current.details.push(line);
      entries.push(createBlock(current));
      current = null;
      continue;
    }

    if (current) {
      current.details.push(line);
    } else {
      entries.push({ type: 'line', text: line });
    }
  }

  if (current) {
    entries.push(createBlock(current));
  }

  return entries;
}
