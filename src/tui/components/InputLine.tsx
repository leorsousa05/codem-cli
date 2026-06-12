import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/useTheme.js';

export interface InputLineProps {
  value: string;
  mode?: 'chat' | 'select' | 'hidden';
  prompt?: string;
}

export const InputLine: React.FC<InputLineProps> = ({
  value,
  mode = 'chat',
  prompt = '>',
}) => {
  const { theme } = useTheme();
  const displayValue = mode === 'hidden' ? '*'.repeat(value.length) : value;

  return (
    <Box paddingX={1}>
      {mode === 'select' && (
        <Text color={theme.textMuted}>[SELECT SESSION] </Text>
      )}
      <Text bold color={theme.accent}>{prompt}</Text>
      <Text color={theme.text}> {displayValue}</Text>
      <Text bold color={theme.accent}>_</Text>
    </Box>
  );
};
