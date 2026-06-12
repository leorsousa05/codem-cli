import React from 'react';
import { Box, Text } from 'ink';
import { AppConfig } from '../../../common/config.js';
import { useTheme } from '../../theme/useTheme.js';

export type ProviderKey = 'openai' | 'anthropic' | 'gemini' | 'kimi';
export type ProviderStep = 'SELECT_PROVIDER' | 'ENTER_API_KEY' | 'ENTER_BASE_URL' | 'ENTER_MODEL';

export interface ProviderModalProps {
  config: AppConfig | null;
  step: ProviderStep;
  selectedProvIndex: number;
  selectedModelIndex: number;
  tempProv: ProviderKey;
  userInput: string;
  models: string[];
  providerList: ProviderKey[];
}

export const ProviderModal: React.FC<ProviderModalProps> = ({
  config,
  step,
  selectedProvIndex,
  selectedModelIndex,
  tempProv,
  userInput,
  models,
  providerList,
}) => {
  const { theme } = useTheme();

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color={theme.accent}>Configure AI Provider</Text>

      {step === 'SELECT_PROVIDER' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.text}>Select the active provider:</Text>
          {providerList.map((prov, idx) => {
            const isFocused = idx === selectedProvIndex;
            const isActive = config?.activeProvider === prov;
            return (
              <Text key={prov}>
                <Text color={isFocused ? theme.accent : theme.text} bold={isFocused}>
                  {isFocused ? '> ' : '  '}
                  {prov.toUpperCase()}
                </Text>
                <Text color={theme.textMuted}>{isActive ? ' (active)' : ''}</Text>
              </Text>
            );
          })}
        </Box>
      )}

      {step === 'ENTER_API_KEY' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.text}>Type API Key for {tempProv.toUpperCase()}:</Text>
          <Box borderStyle="single" borderColor={theme.border} paddingX={1} marginY={1}>
            <Text color={theme.warning}>{'*'.repeat(userInput.length)}</Text>
          </Box>
          <Text color={theme.textMuted}>Press Enter to confirm API key</Text>
        </Box>
      )}

      {step === 'ENTER_BASE_URL' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.text}>Type Custom Base URL (Optional):</Text>
          <Text color={theme.textMuted}>Press Enter to skip and use default API endpoint</Text>
          <Box borderStyle="single" borderColor={theme.border} paddingX={1} marginY={1}>
            <Text color={theme.text}>{userInput || ' '}</Text>
          </Box>
        </Box>
      )}

      {step === 'ENTER_MODEL' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.text}>Select the default Model for {tempProv.toUpperCase()}:</Text>
          {models.map((model, idx) => {
            const isFocused = idx === selectedModelIndex;
            return (
              <Text key={model}>
                <Text color={isFocused ? theme.accent : theme.text} bold={isFocused}>
                  {isFocused ? '> ' : '  '}
                  {model}
                </Text>
              </Text>
            );
          })}
        </Box>
      )}

    </Box>
  );
};
