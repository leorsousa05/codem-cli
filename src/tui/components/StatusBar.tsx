import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/useTheme.js';
import { TUIOverlayMode } from '../../common/types.js';
import { getStatusHint } from '../utils/statusHints.js';

export interface StatusBarProps {
  memoryUsage: string;
  overlayMode: TUIOverlayMode;
  suggestions: Array<{ cmd: string; desc: string }>;
  pendingApproval: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  memoryUsage,
  overlayMode,
  suggestions,
  pendingApproval,
}) => {
  const { theme } = useTheme();
  const hint = getStatusHint(overlayMode, suggestions, pendingApproval);

  return (
    <Box
      flexDirection="row"
      borderStyle="single"
      borderColor={theme.border}
      borderTop
      paddingX={2}
    >
      <Box>
        <Text color={theme.textMuted}>{hint}</Text>
      </Box>
      <Box flexGrow={1} />
      <Box>
        <Text color={theme.textMuted}>{memoryUsage}</Text>
      </Box>
    </Box>
  );
};
