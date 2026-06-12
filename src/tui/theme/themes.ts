import chalk from 'chalk';
import { ColorTheme, ThemeName } from './types.js';

const darkThemeTruecolor: ColorTheme = {
  name: 'dark',
  background: '#0c0c0c',
  surface: '#18181b',
  border: '#27272a',
  text: '#f4f4f5',
  textMuted: '#a1a1aa',
  textInverse: '#09090b',
  accent: '#22d3ee',
  accentSecondary: '#67e8f9',
  success: '#4ade80',
  warning: '#facc15',
  error: '#f87171',
  info: '#60a5fa',
};

const darkThemeBasic: ColorTheme = {
  name: 'dark',
  background: 'black',
  surface: 'black',
  border: 'gray',
  text: 'white',
  textMuted: 'gray',
  textInverse: 'black',
  accent: 'cyan',
  accentSecondary: 'cyan',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
};

const lightThemeTruecolor: ColorTheme = {
  name: 'light',
  background: '#ffffff',
  surface: '#f4f4f5',
  border: '#e4e4e7',
  text: '#18181b',
  textMuted: '#71717a',
  textInverse: '#fafafa',
  accent: '#0891b2',
  accentSecondary: '#06b6d4',
  success: '#16a34a',
  warning: '#ca8a04',
  error: '#dc2626',
  info: '#2563eb',
};

const lightThemeBasic: ColorTheme = {
  name: 'light',
  background: 'white',
  surface: 'white',
  border: 'gray',
  text: 'black',
  textMuted: 'gray',
  textInverse: 'white',
  accent: 'cyan',
  accentSecondary: 'cyan',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  info: 'blue',
};

function supportsTruecolor(): boolean {
  const forced = process.env.FORCE_COLOR;
  if (forced === '0' || forced === 'false') return false;
  if (forced === '3' || forced === 'true') return true;
  return (chalk.level ?? 0) >= 3;
}

function detectLightMode(): boolean {
  const colorFgbg = process.env.COLORFGBG;
  if (colorFgbg) {
    const parts = colorFgbg.split(';');
    const bg = parts.length >= 2 ? parseInt(parts[1], 10) : -1;
    if (bg >= 7 && bg <= 15) return true;
  }
  const term = process.env.TERM?.toLowerCase() ?? '';
  if (term.includes('light')) return true;
  return false;
}

export function resolveThemeName(): ThemeName {
  const envTheme = process.env.CODEM_THEME?.toLowerCase();
  if (envTheme === 'light') return 'light';
  if (envTheme === 'dark') return 'dark';
  return detectLightMode() ? 'light' : 'dark';
}

export function getTheme(name: ThemeName): ColorTheme {
  const truecolor = supportsTruecolor();
  if (name === 'light') return truecolor ? lightThemeTruecolor : lightThemeBasic;
  return truecolor ? darkThemeTruecolor : darkThemeBasic;
}
