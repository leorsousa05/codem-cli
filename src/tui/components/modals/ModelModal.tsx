import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../theme/useTheme.js';

export interface ModelModalProps {
  models: string[];
  selectedIndex: number;
  activeModel: string;
  provider: string;
}

export const ModelModal: React.FC<ModelModalProps> = ({ models, selectedIndex, activeModel, provider }) => {
  const { theme } = useTheme();

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color={theme.accent}>Select Model — {provider.toUpperCase()}</Text>
      <Box flexDirection="column" marginTop={1}>
        {models.map((model, idx) => {
          const isFocused = idx === selectedIndex;
          const isActive = model === activeModel;
          return (
            <Text key={model}>
              <Text color={isFocused ? theme.accent : isActive ? theme.success : theme.text} bold={isFocused}>
                {isFocused ? '> ' : '  '}
                {model}
                {isActive ? '  ✓' : ''}
              </Text>
            </Text>
          );
        })}
      </Box>
    </Box>
  );
};
