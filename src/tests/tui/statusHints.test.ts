import { getStatusHint } from '../../tui/utils/statusHints.js';

describe('getStatusHint', () => {
  it('returns overlay hint when a modal is open', () => {
    const hint = getStatusHint('HELP', [], false);
    expect(hint).toContain('ESC close');
    expect(hint).toContain('↑↓ navigate');
  });

  it('returns approval hint when a tool is awaiting approval', () => {
    const hint = getStatusHint('NONE', [], true);
    expect(hint).toBe('y allow  •  n deny');
  });

  it('returns suggestion hint when slash suggestions are visible', () => {
    const hint = getStatusHint('NONE', [{ cmd: '/help', desc: '' }], false);
    expect(hint).toContain('Enter select');
    expect(hint).toContain('ESC close');
  });

  it('returns default hint in normal chat mode', () => {
    const hint = getStatusHint('NONE', [], false);
    expect(hint).toBe('type / for commands');
  });
});
