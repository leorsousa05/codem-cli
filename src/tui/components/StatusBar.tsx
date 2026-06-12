import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/useTheme.js';

export interface StatusBarProps {
  memoryUsage: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ memoryUsage }) => {
  const { theme } = useTheme();

  const shortcuts = [
    { key: 'F1', label: 'help' },
    { key: 'F2', label: 'provider' },
    { key: 'F3', label: 'sessions' },
    { key: 'F4', label: 'tools' },
    { key: 'F5', label: 'exit' },
  ];

  return (
    <Box
      flexDirection="row"
      borderStyle="single"
      borderColor={theme.border}
      borderTop
      paddingX={2}
    >
      <Box>
        {shortcuts.map(({ key, label }, index) => (
          <Text key={key}>
            {index > 0 && <Text color={theme.textMuted}>  </Text>}
            <Text bold color={theme.accent}>{key}</Text>
            <Text color={theme.textMuted}> {label}</Text>
          </Text>
        ))}
      </Box>
      <Box flexGrow={1} />
      <Box>
        <Text color={theme.textMuted}>{memoryUsage}</Text>
      </Box>
    </Box>
  );
};
