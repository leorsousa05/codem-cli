import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../theme/useTheme.js';

export const HelpModal: React.FC = () => {
  const { theme } = useTheme();

  const items = [
    { key: 'F1', desc: 'Toggle this Help Menu' },
    { key: 'F2', desc: 'Configure LLM Providers (API Key, Model, Custom Base URL)' },
    { key: 'F3', desc: 'Switch active Database Sessions' },
    { key: 'F4', desc: 'List connected MCP & Native system tools' },
    { key: 'F5', desc: 'Safely shut down and exit' },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color={theme.accent}>Codem CLI Help & Keyboard Shortcuts</Text>
      {items.map(({ key, desc }) => (
        <Text key={key}>
          <Text bold color={theme.accent}>{key}</Text>
          <Text color={theme.text}> — {desc}</Text>
        </Text>
      ))}
      <Box marginTop={1}>
        <Text color={theme.textMuted}>Type "/" for slash command autocomplete</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.textMuted}>ESC to close</Text>
      </Box>
    </Box>
  );
};
