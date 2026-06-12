export type ThemeName = 'light' | 'dark';

export interface ColorTheme {
  name: ThemeName;
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  accent: string;
  accentSecondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeContextValue {
  theme: ColorTheme;
  name: ThemeName;
}
