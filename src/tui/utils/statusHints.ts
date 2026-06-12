import { TUIOverlayMode } from '../../common/types.js';

export function getStatusHint(
  overlayMode: TUIOverlayMode,
  suggestions: Array<{ cmd: string; desc: string }>,
  pendingApproval: boolean
): string {
  if (overlayMode !== 'NONE') {
    return 'ESC close  •  ↑↓ navigate  •  Enter select';
  }
  if (pendingApproval) {
    return 'y allow  •  n deny';
  }
  if (suggestions.length > 0) {
    return '↑↓ navigate  •  Enter select  •  ESC close';
  }
  return 'type / for commands';
}
