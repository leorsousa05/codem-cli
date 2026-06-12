import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../theme/useTheme.js';

export const MCPStatusModal: React.FC = () => {
  const { theme } = useTheme();

  const tools = [
    'read_file (native)',
    'write_file (native)',
    'execute_bash (native)',
    'filesystem server tools (mcp.json)',
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color={theme.accent}>Connected Tool Integrations</Text>
      {tools.map((tool) => (
        <Text key={tool} color={theme.text}>• {tool}</Text>
      ))}
      <Box marginTop={1}>
        <Text color={theme.textMuted}>ESC to close</Text>
      </Box>
    </Box>
  );
};
