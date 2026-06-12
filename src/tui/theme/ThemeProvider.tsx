import React, { createContext, useMemo, useState } from 'react';
import { ThemeContextValue, ThemeName } from './types.js';
import { getTheme, resolveThemeName } from './themes.js';

export const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme('dark'),
  name: 'dark',
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [name] = useState<ThemeName>(() => resolveThemeName());
  const value = useMemo<ThemeContextValue>(() => ({ theme: getTheme(name), name }), [name]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
