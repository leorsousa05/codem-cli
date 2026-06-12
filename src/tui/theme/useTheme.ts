import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider.js';

export function useTheme() {
  return useContext(ThemeContext);
}
