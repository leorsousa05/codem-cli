import { resolveThemeName, getTheme } from '../../tui/theme/themes.js';

describe('theme', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CODEM_THEME;
    delete process.env.COLORFGBG;
    delete process.env.TERM;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('resolveThemeName', () => {
    it('returns dark by default', () => {
      expect(resolveThemeName()).toBe('dark');
    });

    it('returns light when CODEM_THEME=light', () => {
      process.env.CODEM_THEME = 'light';
      expect(resolveThemeName()).toBe('light');
    });

    it('returns dark when CODEM_THEME=dark', () => {
      process.env.CODEM_THEME = 'dark';
      expect(resolveThemeName()).toBe('dark');
    });

    it('detects light terminal background via COLORFGBG', () => {
      process.env.COLORFGBG = '0;15';
      expect(resolveThemeName()).toBe('light');
    });

    it('detects light terminal via TERM name', () => {
      process.env.TERM = 'xterm-256color-light';
      expect(resolveThemeName()).toBe('light');
    });
  });

  describe('getTheme', () => {
    it('returns a theme with all required tokens for dark', () => {
      const theme = getTheme('dark');
      expect(theme.name).toBe('dark');
      expect(theme.background).toBeDefined();
      expect(theme.accent).toBeDefined();
      expect(theme.text).toBeDefined();
    });

    it('returns a theme with all required tokens for light', () => {
      const theme = getTheme('light');
      expect(theme.name).toBe('light');
      expect(theme.background).toBeDefined();
      expect(theme.accent).toBeDefined();
      expect(theme.text).toBeDefined();
    });
  });
});
