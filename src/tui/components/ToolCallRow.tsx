import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/useTheme.js';
import { ToolCallBlock, ToolCallStatus } from '../utils/toolLogParser.js';

export interface ToolCallRowProps {
  block: ToolCallBlock;
  expanded: boolean;
  focused: boolean;
}

export const ToolCallRow: React.FC<ToolCallRowProps> = ({ block, expanded, focused }) => {
  const { theme } = useTheme();

  const statusColor = (status: ToolCallStatus): string => {
    switch (status) {
      case 'success':
        return theme.success;
      case 'error':
        return theme.error;
      case 'rejected':
        return theme.warning;
      case 'running':
        return theme.info;
      default:
        return theme.textMuted;
    }
  };

  const statusLabel = (status: ToolCallStatus): string => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'rejected':
        return 'rejected';
      case 'running':
        return 'running';
      default:
        return 'pending';
    }
  };

  const expandIndicator = expanded ? '▼' : '▶';

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color={focused ? theme.accent : theme.textMuted} bold={focused}>
          {focused ? '> ' : '  '}
        </Text>
        <Text color={focused ? theme.accent : theme.textMuted}>{expandIndicator}</Text>
        <Text color={theme.text}> </Text>
        <Text color={theme.accent} bold>{block.toolName}</Text>
        <Text color={theme.textMuted}> ({block.serverName}) — </Text>
        <Text color={statusColor(block.status)} bold>{statusLabel(block.status)}</Text>
        {block.resultText && (
          <Text color={theme.textMuted}>: {block.resultText}</Text>
        )}
      </Box>

      {expanded && (
        <Box flexDirection="column" paddingLeft={4}>
          {block.details.map((detail, idx) => (
            <Text key={idx} color={theme.textMuted}>{detail}</Text>
          ))}
        </Box>
      )}
    </Box>
  );
};
