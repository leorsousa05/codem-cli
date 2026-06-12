import { useInput } from 'ink';

export interface KeyboardEvent {
  input: string;
  key: {
    upArrow: boolean;
    downArrow: boolean;
    leftArrow: boolean;
    rightArrow: boolean;
    return: boolean;
    escape: boolean;
    tab: boolean;
    backspace: boolean;
    delete: boolean;
    ctrl: boolean;
    meta: boolean;
  };
}

export type KeyboardHandler = (event: KeyboardEvent) => void;

export function useKeyboard(handler: KeyboardHandler): void {
  useInput((input, key) => {
    handler({
      input,
      key: {
        upArrow: key.upArrow,
        downArrow: key.downArrow,
        leftArrow: key.leftArrow,
        rightArrow: key.rightArrow,
        return: key.return,
        escape: key.escape,
        tab: key.tab,
        backspace: key.backspace,
        delete: key.delete,
        ctrl: key.ctrl,
        meta: key.meta,
      },
    });
  });
}
