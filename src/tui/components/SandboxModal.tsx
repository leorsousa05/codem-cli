import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/useTheme.js';

export interface SandboxModalProps {
  toolName: string;
  serverName: string;
  args: Record<string, unknown>;
}

export const SandboxModal: React.FC<SandboxModalProps> = ({ toolName, serverName, args }) => {
  const { theme } = useTheme();

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.warning}
      borderLeft
      paddingX={1}
      marginY={1}
    >
      <Text bold color={theme.warning}>
        [APPROVE TOOL]: {toolName} ({serverName})
      </Text>
      <Text color={theme.textMuted}>args: {JSON.stringify(args)}</Text>
      <Text bold color={theme.warning}>Allow execution? (y/n)</Text>
    </Box>
  );
};
