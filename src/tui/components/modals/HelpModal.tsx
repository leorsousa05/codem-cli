import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../theme/useTheme.js';

export const HelpModal: React.FC = () => {
  const { theme } = useTheme();

  const items = [
    { cmd: '/provider', desc: 'Configure LLM Providers (API Key, Model, Custom Base URL)' },
    { cmd: '/model', desc: 'Change the default model for active provider' },
    { cmd: '/session', desc: 'Switch active Database Sessions' },
    { cmd: '/skill', desc: 'Activate a skill from ~/.agents/skills' },
    { cmd: '/tools', desc: 'List connected MCP & Native system tools' },
    { cmd: '/new', desc: 'Start a new clean chat session' },
    { cmd: '/clear', desc: 'Clear history logs of the current session' },
    { cmd: '/exit', desc: 'Shut down and exit' },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color={theme.accent}>Codem CLI Help & Slash Commands</Text>
      {items.map(({ cmd, desc }) => (
        <Text key={cmd}>
          <Text bold color={theme.accent}>{cmd}</Text>
          <Text color={theme.text}> — {desc}</Text>
        </Text>
      ))}
    </Box>
  );
};
