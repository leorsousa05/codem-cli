import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/useTheme.js';

export interface HeaderProps {
  cwd: string;
  gitBranch: string;
  gitStatus: 'clean' | 'modified' | 'none';
  activeModel: string;
  activeProvider: string;
  sessionCount: number;
  contextUsage: string;
}

export const Header: React.FC<HeaderProps> = ({
  cwd,
  gitBranch,
  gitStatus,
  activeModel,
  activeProvider,
  sessionCount,
  contextUsage,
}) => {
  const { theme } = useTheme();
  const folder = cwd.split('/').pop() || 'project';
  const gitStatusColor = gitStatus === 'clean' ? theme.success : gitStatus === 'modified' ? theme.warning : theme.textMuted;

  return (
    <Box
      flexDirection="row"
      borderStyle="single"
      borderColor={theme.border}
      borderBottom
      paddingX={2}
    >
      <Box>
        <Text bold color={theme.accent}>codem</Text>
        <Text color={theme.textMuted}>  {cwd}</Text>
        <Text bold color={theme.text}>  {folder}</Text>
        <Text color={theme.textMuted}>  {gitBranch}</Text>
        <Text color={gitStatusColor}>  ●</Text>
      </Box>
      <Box flexGrow={1} />
      <Box>
        <Text color={theme.textMuted}>| </Text>
        <Text bold color={theme.text}>{activeModel}</Text>
        <Text color={theme.textMuted}>  {activeProvider.toUpperCase()}</Text>
        <Text color={theme.textMuted}>  {sessionCount} sessions</Text>
        <Text color={theme.textMuted}>  {contextUsage}</Text>
      </Box>
    </Box>
  );
};
