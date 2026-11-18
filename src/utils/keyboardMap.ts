import type { FingerId } from '../types/typing';

export interface KeyDef {
  id: string;
  label: string;
  shiftLabel?: string;
  finger: FingerId;
  width?: number; // relative units (1 = standard key)
  isModifier?: boolean;
  isHoming?: boolean;
  keyValue: string; // primary lowercase char or special key name
  shiftValue?: string;
}

export interface FingerMeta {
  id: FingerId;
  label: string;
  shortLabel: string;
  hand: 'left' | 'right';
  homeKey: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  fillHex: string;
  ringHex: string;
}

export const FINGER_META: Record<FingerId, FingerMeta> = {
  L_PINKY: {
    id: 'L_PINKY',
    label: 'Left Pinky',
    shortLabel: 'L Pinky',
    hand: 'left',
    homeKey: 'A',
    bgClass: 'bg-rose-100',
    borderClass: 'border-rose-300',
    textClass: 'text-rose-800',
    fillHex: '#f43f5e',
    ringHex: '#fda4af',
  },
  L_RING: {
    id: 'L_RING',
    label: 'Left Ring Finger',
    shortLabel: 'L Ring',
    hand: 'left',
    homeKey: 'S',
    bgClass: 'bg-amber-100',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-800',
    fillHex: '#f59e0b',
    ringHex: '#fcd34d',
  },
  L_MIDDLE: {
    id: 'L_MIDDLE',
    label: 'Left Middle Finger',
    shortLabel: 'L Middle',
    hand: 'left',
    homeKey: 'D',
    bgClass: 'bg-emerald-100',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-800',
    fillHex: '#10b981',
    ringHex: '#6ee7b7',
  },
  L_INDEX: {
    id: 'L_INDEX',
    label: 'Left Index Finger',
    shortLabel: 'L Index',
    hand: 'left',
    homeKey: 'F',
    bgClass: 'bg-sky-100',
    borderClass: 'border-sky-300',
    textClass: 'text-sky-800',
    fillHex: '#0ea5e9',
    ringHex: '#7dd3fc',
  },
  L_THUMB: {
    id: 'L_THUMB',
    label: 'Left Thumb',
    shortLabel: 'L Thumb',
    hand: 'left',
    homeKey: 'Space',
    bgClass: 'bg-indigo-100',
    borderClass: 'border-indigo-300',
    textClass: 'text-indigo-800',
    fillHex: '#6366f1',
    ringHex: '#a5b4fc',
  },
  R_THUMB: {
    id: 'R_THUMB',
    label: 'Right Thumb',
    shortLabel: 'R Thumb',
    hand: 'right',
    homeKey: 'Space',
    bgClass: 'bg-indigo-100',
    borderClass: 'border-indigo-300',
    textClass: 'text-indigo-800',
    fillHex: '#6366f1',
    ringHex: '#a5b4fc',
  },
  R_INDEX: {
    id: 'R_INDEX',
    label: 'Right Index Finger',
    shortLabel: 'R Index',
    hand: 'right',
    homeKey: 'J',
    bgClass: 'bg-violet-100',
    borderClass: 'border-violet-300',
    textClass: 'text-violet-800',
    fillHex: '#8b5cf6',
    ringHex: '#c4b5fd',
  },
  R_MIDDLE: {
    id: 'R_MIDDLE',
    label: 'Right Middle Finger',
    shortLabel: 'R Middle',
    hand: 'right',
    homeKey: 'K',
    bgClass: 'bg-teal-100',
    borderClass: 'border-teal-300',
    textClass: 'text-teal-800',
    fillHex: '#14b8a6',
    ringHex: '#5eead4',
  },
  R_RING: {
    id: 'R_RING',
    label: 'Right Ring Finger',
    shortLabel: 'R Ring',
    hand: 'right',
    homeKey: 'L',
    bgClass: 'bg-orange-100',
    borderClass: 'border-orange-300',
    textClass: 'text-orange-800',
    fillHex: '#f97316',
    ringHex: '#fdba74',
  },
  R_PINKY: {
    id: 'R_PINKY',
    label: 'Right Pinky',
    shortLabel: 'R Pinky',
    hand: 'right',
    homeKey: ';',
    bgClass: 'bg-pink-100',
    borderClass: 'border-pink-300',
    textClass: 'text-pink-800',
    fillHex: '#ec4899',
    ringHex: '#f9a8d4',
  },
};

export const KEYBOARD_ROWS: KeyDef[][] = [
  [
    { id: 'Backquote', label: '`', shiftLabel: '~', finger: 'L_PINKY', keyValue: '`', shiftValue: '~' },
    { id: 'Digit1', label: '1', shiftLabel: '!', finger: 'L_PINKY', keyValue: '1', shiftValue: '!' },
    { id: 'Digit2', label: '2', shiftLabel: '@', finger: 'L_RING', keyValue: '2', shiftValue: '@' },
    { id: 'Digit3', label: '3', shiftLabel: '#', finger: 'L_MIDDLE', keyValue: '3', shiftValue: '#' },
    { id: 'Digit4', label: '4', shiftLabel: '$', finger: 'L_INDEX', keyValue: '4', shiftValue: '$' },
    { id: 'Digit5', label: '5', shiftLabel: '%', finger: 'L_INDEX', keyValue: '5', shiftValue: '%' },
    { id: 'Digit6', label: '6', shiftLabel: '^', finger: 'R_INDEX', keyValue: '6', shiftValue: '^' },
    { id: 'Digit7', label: '7', shiftLabel: '&', finger: 'R_INDEX', keyValue: '7', shiftValue: '&' },
    { id: 'Digit8', label: '8', shiftLabel: '*', finger: 'R_MIDDLE', keyValue: '8', shiftValue: '*' },
    { id: 'Digit9', label: '9', shiftLabel: '(', finger: 'R_RING', keyValue: '9', shiftValue: '(' },
    { id: 'Digit0', label: '0', shiftLabel: ')', finger: 'R_PINKY', keyValue: '0', shiftValue: ')' },
    { id: 'Minus', label: '-', shiftLabel: '_', finger: 'R_PINKY', keyValue: '-', shiftValue: '_' },
    { id: 'Equal', label: '=', shiftLabel: '+', finger: 'R_PINKY', keyValue: '=', shiftValue: '+' },
    { id: 'Backspace', label: 'Backspace', finger: 'R_PINKY', width: 2, isModifier: true, keyValue: 'Backspace' },
  ],
  [
    { id: 'Tab', label: 'Tab', finger: 'L_PINKY', width: 1.5, isModifier: true, keyValue: 'Tab' },
    { id: 'KeyQ', label: 'Q', finger: 'L_PINKY', keyValue: 'q', shiftValue: 'Q' },
    { id: 'KeyW', label: 'W', finger: 'L_RING', keyValue: 'w', shiftValue: 'W' },
    { id: 'KeyE', label: 'E', finger: 'L_MIDDLE', keyValue: 'e', shiftValue: 'E' },
    { id: 'KeyR', label: 'R', finger: 'L_INDEX', keyValue: 'r', shiftValue: 'R' },
    { id: 'KeyT', label: 'T', finger: 'L_INDEX', keyValue: 't', shiftValue: 'T' },
    { id: 'KeyY', label: 'Y', finger: 'R_INDEX', keyValue: 'y', shiftValue: 'Y' },
    { id: 'KeyU', label: 'U', finger: 'R_INDEX', keyValue: 'u', shiftValue: 'U' },
    { id: 'KeyI', label: 'I', finger: 'R_MIDDLE', keyValue: 'i', shiftValue: 'I' },
    { id: 'KeyO', label: 'O', finger: 'R_RING', keyValue: 'o', shiftValue: 'O' },
    { id: 'KeyP', label: 'P', finger: 'R_PINKY', keyValue: 'p', shiftValue: 'P' },
    { id: 'BracketLeft', label: '[', shiftLabel: '{', finger: 'R_PINKY', keyValue: '[', shiftValue: '{' },
    { id: 'BracketRight', label: ']', shiftLabel: '}', finger: 'R_PINKY', keyValue: ']', shiftValue: '}' },
    { id: 'Backslash', label: '\\', shiftLabel: '|', finger: 'R_PINKY', width: 1.5, keyValue: '\\', shiftValue: '|' },
  ],
  [
    { id: 'CapsLock', label: 'Caps', finger: 'L_PINKY', width: 1.75, isModifier: true, keyValue: 'CapsLock' },
    { id: 'KeyA', label: 'A', finger: 'L_PINKY', keyValue: 'a', shiftValue: 'A' },
    { id: 'KeyS', label: 'S', finger: 'L_RING', keyValue: 's', shiftValue: 'S' },
    { id: 'KeyD', label: 'D', finger: 'L_MIDDLE', keyValue: 'd', shiftValue: 'D' },
    { id: 'KeyF', label: 'F', finger: 'L_INDEX', isHoming: true, keyValue: 'f', shiftValue: 'F' },
    { id: 'KeyG', label: 'G', finger: 'L_INDEX', keyValue: 'g', shiftValue: 'G' },
    { id: 'KeyH', label: 'H', finger: 'R_INDEX', keyValue: 'h', shiftValue: 'H' },
    { id: 'KeyJ', label: 'J', finger: 'R_INDEX', isHoming: true, keyValue: 'j', shiftValue: 'J' },
    { id: 'KeyK', label: 'K', finger: 'R_MIDDLE', keyValue: 'k', shiftValue: 'K' },
    { id: 'KeyL', label: 'L', finger: 'R_RING', keyValue: 'l', shiftValue: 'L' },
    { id: 'Semicolon', label: ';', shiftLabel: ':', finger: 'R_PINKY', keyValue: ';', shiftValue: ':' },
    { id: 'Quote', label: "'", shiftLabel: '"', finger: 'R_PINKY', keyValue: "'", shiftValue: '"' },
    { id: 'Enter', label: 'Enter', finger: 'R_PINKY', width: 2.25, isModifier: true, keyValue: '\n' },
  ],
  [
    { id: 'ShiftLeft', label: 'Shift', finger: 'L_PINKY', width: 2.25, isModifier: true, keyValue: 'ShiftLeft' },
    { id: 'KeyZ', label: 'Z', finger: 'L_PINKY', keyValue: 'z', shiftValue: 'Z' },
    { id: 'KeyX', label: 'X', finger: 'L_RING', keyValue: 'x', shiftValue: 'X' },
    { id: 'KeyC', label: 'C', finger: 'L_MIDDLE', keyValue: 'c', shiftValue: 'C' },
    { id: 'KeyV', label: 'V', finger: 'L_INDEX', keyValue: 'v', shiftValue: 'V' },
    { id: 'KeyB', label: 'B', finger: 'L_INDEX', keyValue: 'b', shiftValue: 'B' },
    { id: 'KeyN', label: 'N', finger: 'R_INDEX', keyValue: 'n', shiftValue: 'N' },
    { id: 'KeyM', label: 'M', finger: 'R_INDEX', keyValue: 'm', shiftValue: 'M' },
    { id: 'Comma', label: ',', shiftLabel: '<', finger: 'R_MIDDLE', keyValue: ',', shiftValue: '<' },
    { id: 'Period', label: '.', shiftLabel: '>', finger: 'R_RING', keyValue: '.', shiftValue: '>' },
    { id: 'Slash', label: '/', shiftLabel: '?', finger: 'R_PINKY', keyValue: '/', shiftValue: '?' },
    { id: 'ShiftRight', label: 'Shift', finger: 'R_PINKY', width: 2.75, isModifier: true, keyValue: 'ShiftRight' },
  ],
  [
    { id: 'ControlLeft', label: 'Ctrl', finger: 'L_PINKY', width: 1.5, isModifier: true, keyValue: 'ControlLeft' },
    { id: 'AltLeft', label: 'Alt', finger: 'L_THUMB', width: 1.25, isModifier: true, keyValue: 'AltLeft' },
    { id: 'Space', label: 'Space', finger: 'R_THUMB', width: 8.5, keyValue: ' ' },
    { id: 'AltRight', label: 'Alt', finger: 'R_THUMB', width: 1.25, isModifier: true, keyValue: 'AltRight' },
    { id: 'ControlRight', label: 'Ctrl', finger: 'R_PINKY', width: 1.5, isModifier: true, keyValue: 'ControlRight' },
  ],
];

export interface TargetKeyGuidance {
  keyId: string;
  shiftKeyId: 'ShiftLeft' | 'ShiftRight' | null;
  primaryFinger: FingerId;
  shiftFinger: FingerId | null;
  displayChar: string;
}

const CHAR_LOOKUP = new Map<string, { key: KeyDef; needsShift: boolean }>();

for (const row of KEYBOARD_ROWS) {
  for (const key of row) {
    if (!key.isModifier || key.keyValue === '\n') {
      CHAR_LOOKUP.set(key.keyValue, { key, needsShift: false });
      if (key.shiftValue) {
        CHAR_LOOKUP.set(key.shiftValue, { key, needsShift: true });
      }
    }
  }
}

export function getGuidanceForChar(char: string | undefined): TargetKeyGuidance | null {
  if (!char) return null;
  const match = CHAR_LOOKUP.get(char);
  if (!match) {
    return null;
  }

  const { key, needsShift } = match;
  let shiftKeyId: 'ShiftLeft' | 'ShiftRight' | null = null;
  let shiftFinger: FingerId | null = null;

  if (needsShift) {
    const keyHand = FINGER_META[key.finger].hand;
    if (keyHand === 'left') {
      shiftKeyId = 'ShiftRight';
      shiftFinger = 'R_PINKY';
    } else {
      shiftKeyId = 'ShiftLeft';
      shiftFinger = 'L_PINKY';
    }
  }

  const displayChar =
    char === ' ' ? 'Spacebar' : char === '\n' ? 'Enter' : char;

  return {
    keyId: key.id,
    shiftKeyId,
    primaryFinger: key.finger,
    shiftFinger,
    displayChar,
  };
}

export function findKeyByEvent(e: KeyboardEvent): KeyDef | null {
  if (e.code) {
    for (const row of KEYBOARD_ROWS) {
      for (const k of row) {
        if (k.id === e.code) return k;
      }
    }
  }
  const match = CHAR_LOOKUP.get(e.key);
  return match ? match.key : null;
}
