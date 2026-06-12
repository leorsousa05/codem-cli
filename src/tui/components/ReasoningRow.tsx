import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/useTheme.js';
import { ReasoningBlock } from '../utils/logFormatter.js';

export interface ReasoningRowProps {
  block: ReasoningBlock;
  expanded: boolean;
  focused: boolean;
}

export const ReasoningRow: React.FC<ReasoningRowProps> = ({ block, expanded, focused }) => {
  const { theme } = useTheme();
  const indicator = expanded ? '▼' : '▶';

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color={focused ? theme.accent : theme.textMuted} bold={focused}>
          {focused ? '> ' : '  '}
        </Text>
        <Text color={focused ? theme.accent : theme.textMuted}>{indicator}</Text>
        <Text color={theme.text}> </Text>
        <Text color={theme.textMuted}>reasoning</Text>
      </Box>

      {expanded && (
        <Box flexDirection="column" paddingLeft={4}>
          {block.text.split('\n').map((line, idx) => (
            <Text key={idx} color={theme.textMuted}>{line}</Text>
          ))}
        </Box>
      )}
    </Box>
  );
};
