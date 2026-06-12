import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/useTheme.js';
import { formatLogs, LogVariant, isToolCallBlock } from '../utils/logFormatter.js';
import { ToolCallRow } from './ToolCallRow.js';

export interface LogViewerProps {
  logs: string[];
  expandedBlocks: Set<string>;
  focusedBlockId: string | null;
  maxLines?: number;
}

export const MAX_LINES = 25;

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  expandedBlocks,
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
          if (isToolCallBlock(entry)) {
            return (
              <ToolCallRow
                key={entry.id}
                block={entry}
                expanded={expandedBlocks.has(entry.id)}
                focused={focusedBlockId === entry.id}
              />
            );
          }

          return (
            <Box key={index}>
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
