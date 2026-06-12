import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../theme/useTheme.js';

export interface SlashSuggestionsProps {
  suggestions: Array<{ cmd: string; desc: string }>;
  selectedIndex: number;
  scrollOffset: number;
  windowSize: number;
}

export const SlashSuggestions: React.FC<SlashSuggestionsProps> = ({
  suggestions,
  selectedIndex,
  scrollOffset,
  windowSize,
}) => {
  const { theme } = useTheme();
  const visible = suggestions.slice(scrollOffset, scrollOffset + windowSize);
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + windowSize < suggestions.length;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.border}
      paddingX={1}
      marginBottom={1}
    >
      {hasMoreAbove && (
        <Text color={theme.textMuted}>  ▲ {scrollOffset} more</Text>
      )}
      {visible.map((sug, idx) => {
        const absoluteIdx = scrollOffset + idx;
        const isFocused = absoluteIdx === selectedIndex;
        return (
          <Text key={sug.cmd}>
            <Text color={isFocused ? theme.accent : theme.textMuted} bold={isFocused}>
              {isFocused ? '> ' : '  '}
            </Text>
            <Text color={isFocused ? theme.accent : theme.text} bold={isFocused}>
              {sug.cmd}
            </Text>
            <Text color={theme.textMuted}> — {sug.desc}</Text>
          </Text>
        );
      })}
      {hasMoreBelow && (
        <Text color={theme.textMuted}>
          {'  '}▼ {suggestions.length - scrollOffset - windowSize} more
        </Text>
      )}
    </Box>
  );
};
