import React from 'react';
import { Box, Text } from 'ink';
import { AgentSession } from '../../../common/types.js';
import { useTheme } from '../../theme/useTheme.js';

export interface SessionModalProps {
  sessions: AgentSession[];
  focusedIndex: number;
}

export const SessionModal: React.FC<SessionModalProps> = ({ sessions, focusedIndex }) => {
  const { theme } = useTheme();

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color={theme.accent}>Select Conversation Session</Text>
      {sessions.map((sess, idx) => {
        const isFocused = idx === focusedIndex;
        return (
          <Text key={sess.id}>
            <Text color={isFocused ? theme.accent : theme.text} bold={isFocused}>
              {isFocused ? '> ' : '  '}
              [{sess.id.slice(-6)}] {sess.name}
            </Text>
            <Text color={theme.textMuted}> ({sess.status})</Text>
          </Text>
        );
      })}
    </Box>
  );
};
