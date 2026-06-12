import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/useTheme.js';
import { formatLogs, LogVariant, isToolCallBlock, isReasoningBlock, LogEntry } from '../utils/logFormatter.js';
import { ToolCallRow } from './ToolCallRow.js';
import { ReasoningRow } from './ReasoningRow.js';

export interface LogViewerProps {
  logs: string[];
  expandedBlocks: Set<string>;
  expandedReasonings: Set<string>;
  focusedBlockId: string | null;
  maxLines?: number;
}

export const MAX_LINES = 25;

type Actor = 'assistant' | 'user' | 'system' | 'tool' | 'reasoning';

function actorForEntry(entry: LogEntry): Actor {
  if (isReasoningBlock(entry)) return 'reasoning';
  if (isToolCallBlock(entry)) return 'tool';
  if (entry.variant === 'user') return 'user';
  if (entry.variant === 'system' || entry.variant === 'info' || entry.variant === 'error') {
    return 'system';
  }
  return 'assistant';
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  expandedBlocks,
  expandedReasonings,
  focusedBlockId,
  maxLines = MAX_LINES,
}) => {
  const { theme } = useTheme();
  const entries = formatLogs(logs, maxLines);

  const colorForVariant = (variant: LogVariant): string => {
    switch (variant) {
      case 'user':
        return theme.accent;
      case 'system':
        return theme.info;
      case 'success':
        return theme.success;
      case 'warning':
        return theme.warning;
      case 'error':
        return theme.error;
      case 'info':
        return theme.info;
      default:
        return theme.text;
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {entries.length === 0 ? (
        <Text color={theme.textMuted}>No active logs</Text>
      ) : (
        entries.map((entry, index) => {
          const actorChanged = index > 0 && actorForEntry(entry) !== actorForEntry(entries[index - 1]);

          if (isToolCallBlock(entry)) {
            return (
              <Box key={entry.id} marginTop={actorChanged ? 1 : 0}>
                <ToolCallRow
                  block={entry}
                  expanded={expandedBlocks.has(entry.id)}
                  focused={focusedBlockId === entry.id}
                />
              </Box>
            );
          }

          if (isReasoningBlock(entry)) {
            return (
              <Box key={entry.id} marginTop={actorChanged ? 1 : 0}>
                <ReasoningRow
                  block={entry}
                  expanded={expandedReasonings.has(entry.id)}
                  focused={focusedBlockId === entry.id}
                />
              </Box>
            );
          }

          return (
            <Box key={index} marginTop={actorChanged ? 1 : 0}>
              <Text color={colorForVariant(entry.variant)} bold={entry.bold}>
                {entry.text}
              </Text>
            </Box>
          );
        })
      )}
    </Box>
  );
};
