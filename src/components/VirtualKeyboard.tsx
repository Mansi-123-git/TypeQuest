import React from 'react';
import type { FingerId } from '../types/typing';
import { FINGER_META, KEYBOARD_ROWS, getGuidanceForChar } from '../utils/keyboardMap';

interface VirtualKeyboardProps {
  targetChar?: string;
  pressedKeyId: string | null;
  pressedFinger: FingerId | null;
  lastPressCorrect: boolean | null;
  showHands: boolean;
  onToggleHands?: () => void;
  compact?: boolean;
}

const FINGER_COLOR_BADGES: Record<FingerId, string> = {
  L_PINKY: 'bg-rose-50 text-rose-800 border-rose-200',
  L_RING: 'bg-amber-50 text-amber-800 border-amber-200',
  L_MIDDLE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  L_INDEX: 'bg-sky-50 text-sky-800 border-sky-200',
  L_THUMB: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  R_THUMB: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  R_INDEX: 'bg-violet-50 text-violet-800 border-violet-200',
  R_MIDDLE: 'bg-teal-50 text-teal-800 border-teal-200',
  R_RING: 'bg-orange-50 text-orange-800 border-orange-200',
  R_PINKY: 'bg-pink-50 text-pink-800 border-pink-200',
};

interface HandSvgProps {
  side: 'left' | 'right';
  targetFingers: FingerId[];
  pressedFinger: FingerId | null;
}

const HandSvg: React.FC<HandSvgProps> = ({ side, targetFingers, pressedFinger }) => {
  const isLeft = side === 'left';

  const fingers: {
    id: FingerId;
    x: number;
    y: number;
    w: number;
    h: number;
    rotate?: number;
    label: string;
  }[] = isLeft
    ? [
        { id: 'L_PINKY', x: 18, y: 42, w: 18, h: 58, rotate: -6, label: 'A' },
        { id: 'L_RING', x: 42, y: 20, w: 20, h: 74, rotate: -2, label: 'S' },
        { id: 'L_MIDDLE', x: 68, y: 12, w: 21, h: 82, rotate: 0, label: 'D' },
        { id: 'L_INDEX', x: 95, y: 22, w: 20, h: 72, rotate: 4, label: 'F' },
        { id: 'L_THUMB', x: 123, y: 66, w: 20, h: 48, rotate: 28, label: '␣' },
      ]
    : [
        { id: 'R_THUMB', x: 17, y: 66, w: 20, h: 48, rotate: -28, label: '␣' },
        { id: 'R_INDEX', x: 45, y: 22, w: 20, h: 72, rotate: -4, label: 'J' },
        { id: 'R_MIDDLE', x: 71, y: 12, w: 21, h: 82, rotate: 0, label: 'K' },
        { id: 'R_RING', x: 98, y: 20, w: 20, h: 74, rotate: 2, label: 'L' },
        { id: 'R_PINKY', x: 124, y: 42, w: 18, h: 58, rotate: 6, label: ';' },
      ];

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 160 152"
        className="w-36 h-32 sm:w-44 sm:h-36 select-none"
        aria-label={`${isLeft ? 'Left' : 'Right'} virtual hand guide`}
      >
        {/* Palm */}
        <path
          d={
            isLeft
              ? 'M22,94 Q20,142 66,144 Q112,146 122,102 L116,86 L24,86 Z'
              : 'M38,102 Q48,146 94,144 Q140,142 138,94 L136,86 L44,86 Z'
          }
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeWidth="2"
        />

        {/* Fingers */}
        {fingers.map((f) => {
          const meta = FINGER_META[f.id];
          const isTarget = targetFingers.includes(f.id);
          const isPressed = pressedFinger === f.id;
          const cx = f.x + f.w / 2;
          const cy = f.y + f.h;
          const pressScale = isPressed ? 'scale(0.92) translate(0px, 5px)' : 'scale(1)';

          return (
            <g
              key={f.id}
              transform={`rotate(${f.rotate || 0} ${cx} ${cy})`}
              style={{
                transformOrigin: `${cx}px ${cy}px`,
                transition: 'transform 110ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <g style={{ transform: pressScale, transformOrigin: `${cx}px ${cy}px`, transition: 'transform 90ms ease-out' }}>
                {isTarget && (
                  <rect
                    x={f.x - 3}
                    y={f.y - 3}
                    width={f.w + 6}
                    height={f.h + 6}
                    rx={11}
                    fill="none"
                    stroke={meta.fillHex}
                    strokeWidth="2.5"
                    opacity="0.75"
                  />
                )}
                <rect
                  x={f.x}
                  y={f.y}
                  width={f.w}
                  height={f.h}
                  rx={9}
                  fill={meta.fillHex}
                  fillOpacity={isPressed ? 1 : isTarget ? 0.92 : 0.28}
                  stroke={isTarget || isPressed ? '#0f172a' : meta.fillHex}
                  strokeWidth={isTarget || isPressed ? 2 : 1.25}
                />
                {/* Fingernail indicator */}
                <rect
                  x={f.x + 4}
                  y={f.y + 4}
                  width={f.w - 8}
                  height={9}
                  rx={4}
                  fill="#ffffff"
                  fillOpacity={isTarget || isPressed ? 0.55 : 0.35}
                />
                {/* Home Key Label */}
                <text
                  x={cx}
                  y={f.y + f.h - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                  fill={isTarget || isPressed ? '#ffffff' : '#334155'}
                >
                  {f.label}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <span className="text-xs text-slate-500 mt-1">
        {isLeft ? 'Left Hand · Home: A S D F' : 'Right Hand · Home: J K L ;'}
      </span>
    </div>
  );
};

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  targetChar,
  pressedKeyId,
  pressedFinger,
  lastPressCorrect,
  showHands,
  onToggleHands,
  compact = false,
}) => {
  const guidance = getGuidanceForChar(targetChar);
  const targetFingers: FingerId[] = [];
  if (guidance) {
    targetFingers.push(guidance.primaryFinger);
    if (guidance.shiftFinger) targetFingers.push(guidance.shiftFinger);
  }

  const primaryMeta = guidance ? FINGER_META[guidance.primaryFinger] : null;
  const shiftMeta = guidance?.shiftFinger ? FINGER_META[guidance.shiftFinger] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
      {/* Finger Placement Guidance Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          {guidance && primaryMeta ? (
            <>
              <span className="text-slate-500">Next key:</span>
              <span className="font-mono font-semibold px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-900">
                {guidance.displayChar}
              </span>
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span className={`font-medium ${primaryMeta.textClass}`}>
                Use {primaryMeta.label}
              </span>
              {shiftMeta && (
                <>
                  <span className="text-slate-400">+</span>
                  <span className={`font-medium ${shiftMeta.textClass}`}>
                    Hold Shift ({shiftMeta.shortLabel})
                  </span>
                </>
              )}
              <span className="text-xs text-slate-500 hidden sm:inline">
                (Home key: {primaryMeta.homeKey})
              </span>
            </>
          ) : (
            <span className="text-slate-500 text-sm">
              Place index fingers on the <span className="font-mono font-semibold text-slate-800">F</span> and{' '}
              <span className="font-mono font-semibold text-slate-800">J</span> homing bars to begin.
            </span>
          )}
        </div>

        {onToggleHands && (
          <button
            type="button"
            onClick={onToggleHands}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showHands ? 'Hide Virtual Hands' : 'Show Virtual Hands'}
          </button>
        )}
      </div>

      {/* Realistic QWERTY Keyboard */}
      <div className="flex flex-col gap-1.5 select-none max-w-4xl mx-auto">
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1.5 w-full">
            {row.map((key) => {
              const meta = FINGER_META[key.finger];
              const isTargetPrimary = guidance?.keyId === key.id;
              const isTargetShift = guidance?.shiftKeyId === key.id;
              const isTarget = isTargetPrimary || isTargetShift;
              const isPressed = pressedKeyId === key.id;

              let keyBg = `${meta.bgClass} ${meta.borderClass} ${meta.textClass}`;
              if (isPressed && lastPressCorrect === false) {
                keyBg = 'bg-red-600 border-red-700 text-white';
              } else if (isPressed) {
                keyBg = 'bg-slate-900 border-slate-950 text-white';
              } else if (isTarget) {
                keyBg = 'bg-blue-600 border-blue-700 text-white shadow-sm ring-2 ring-blue-300';
              }

              return (
                <div
                  key={key.id}
                  style={{ flexGrow: key.width ?? 1, flexBasis: 0 }}
                  className={`relative flex flex-col items-center justify-center rounded-lg border font-mono transition-transform duration-100 ${
                    compact ? 'h-9 text-xs' : 'h-11 sm:h-12 text-xs sm:text-sm'
                  } ${keyBg} ${isPressed ? 'translate-y-0.5 scale-[0.97]' : ''}`}
                >
                  {key.shiftLabel && (
                    <span className="text-[10px] leading-none opacity-75 mb-0.5">
                      {key.shiftLabel}
                    </span>
                  )}
                  <span className={key.isModifier ? 'text-[11px] font-sans font-medium' : 'font-semibold leading-none'}>
                    {key.label}
                  </span>
                  {key.isHoming && (
                    <span
                      className={`absolute bottom-1.5 w-3 h-0.5 rounded-full ${
                        isTarget || isPressed ? 'bg-white' : 'bg-slate-500'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Two Virtual Hands + Color Guide */}
      {showHands && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14">
            <HandSvg
              side="left"
              targetFingers={targetFingers}
              pressedFinger={pressedFinger}
            />
            <HandSvg
              side="right"
              targetFingers={targetFingers}
              pressedFinger={pressedFinger}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
            {(['L_PINKY', 'L_RING', 'L_MIDDLE', 'L_INDEX', 'L_THUMB', 'R_INDEX', 'R_MIDDLE', 'R_RING', 'R_PINKY'] as FingerId[]).map((fid) => {
              const meta = FINGER_META[fid];
              return (
                <span key={fid} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block border border-black/10"
                    style={{ backgroundColor: meta.fillHex }}
                  />
                  <span>{meta.shortLabel}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
