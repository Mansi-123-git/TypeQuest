import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX, CheckCircle2, AlertCircle } from 'lucide-react';
import type { DifficultyLevel, FingerId, SessionMode, TypingSessionResult } from '../types/typing';
import { findKeyByEvent } from '../utils/keyboardMap';
import { playKeySound } from '../utils/sound';
import { VirtualKeyboard } from './VirtualKeyboard';

interface TypingEngineProps {
  title: string;
  subtitle?: string;
  text: string;
  mode: SessionMode;
  level?: DifficultyLevel;
  durationSeconds?: number; // undefined = complete entire passage; number = timed test
  showKeyboardDefault?: boolean;
  showHandsDefault?: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  inactivityPauseSeconds: number;
  isExternallyPaused?: boolean;
  zenFocusMode: boolean;
  onSessionComplete: (result: TypingSessionResult) => void;
  onNext?: () => void;
  nextLabel?: string;
}

export const TypingEngine: React.FC<TypingEngineProps> = ({
  title,
  subtitle,
  text,
  mode,
  level,
  durationSeconds,
  showKeyboardDefault = true,
  showHandsDefault = true,
  soundEnabled,
  onToggleSound,
  inactivityPauseSeconds,
  isExternallyPaused = false,
  zenFocusMode,
  onSessionComplete,
  onNext,
  nextLabel = 'Next Lesson',
}) => {
  const isTimed = typeof durationSeconds === 'number' && durationSeconds > 0;

  // For timed tests, repeat text cleanly if user types fast enough to reach the end
  const activeText = useMemo(() => {
    const clean = text.replace(/\r\n/g, '\n').trim();
    if (!isTimed) return clean;
    if (clean.length >= 1200) return clean;
    return `${clean} ${clean} ${clean}`;
  }, [text, isTimed]);

  const [typed, setTyped] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [pauseReason, setPauseReason] = useState<'manual' | 'inactivity' | 'timeout' | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState<number>(0);
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [keyErrors, setKeyErrors] = useState<Record<string, number>>({});
  const [showKeyboard, setShowKeyboard] = useState<boolean>(showKeyboardDefault);
  const [showHands, setShowHands] = useState<boolean>(showHandsDefault);
  const [pressedKeyId, setPressedKeyId] = useState<string | null>(null);
  const [pressedFinger, setPressedFinger] = useState<FingerId | null>(null);
  const [lastPressCorrect, setLastPressCorrect] = useState<boolean | null>(null);
  const [completedResult, setCompletedResult] = useState<TypingSessionResult | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const activeCharRef = useRef<HTMLSpanElement>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastTickRef = useRef<number | null>(null);
  const completedRef = useRef<boolean>(false);

  // Reset when text/duration/title changes
  const resetSession = useCallback(() => {
    setTyped('');
    setStatus('idle');
    setPauseReason(null);
    setElapsedMs(0);
    setTotalKeystrokes(0);
    setMistakeCount(0);
    setKeyErrors({});
    setPressedKeyId(null);
    setPressedFinger(null);
    setLastPressCorrect(null);
    setCompletedResult(null);
    completedRef.current = false;
    lastTickRef.current = null;
    lastActivityRef.current = Date.now();
    stageRef.current?.focus();
  }, []);

  useEffect(() => {
    resetSession();
  }, [text, durationSeconds, title, resetSession]);

  useEffect(() => {
    setShowHands(showHandsDefault);
  }, [showHandsDefault]);

  // External screen timeout pause
  useEffect(() => {
    if (isExternallyPaused && status === 'running') {
      setStatus('paused');
      setPauseReason('timeout');
    }
  }, [isExternallyPaused, status]);

  const finishSession = useCallback(
    (finalTyped: string, finalElapsedMs: number, finalKeystrokes: number, finalMistakes: number, finalErrors: Record<string, number>) => {
      if (completedRef.current) return;
      completedRef.current = true;
      setStatus('completed');

      let correctChars = 0;
      for (let i = 0; i < finalTyped.length; i++) {
        if (finalTyped[i] === activeText[i]) correctChars++;
      }

      const effectiveSeconds = Math.max(1, Math.round(finalElapsedMs / 1000));
      const minutes = Math.max(finalElapsedMs / 60000, 1 / 60);
      const wpm = Math.max(0, Math.round(correctChars / 5 / minutes));
      const rawWpm = Math.max(0, Math.round(finalKeystrokes / 5 / minutes));
      const accuracy =
        finalKeystrokes > 0
          ? Math.max(0, Math.min(100, Math.round(((finalKeystrokes - finalMistakes) / finalKeystrokes) * 100)))
          : 100;

      if (soundEnabled) {
        playKeySound('complete');
      }

      const result: TypingSessionResult = {
        id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        mode,
        title,
        level,
        wpm,
        rawWpm,
        accuracy,
        mistakes: finalMistakes,
        correctChars,
        totalChars: finalTyped.length,
        durationSeconds: isTimed && durationSeconds ? durationSeconds : effectiveSeconds,
        keyErrors: finalErrors,
        timestamp: new Date().toISOString(),
      };

      setCompletedResult(result);
      onSessionComplete(result);
    },
    [activeText, durationSeconds, isTimed, level, mode, onSessionComplete, soundEnabled, title]
  );

  // High-precision timer loop
  useEffect(() => {
    if (status !== 'running') {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();
    const interval = window.setInterval(() => {
      const nowPerf = performance.now();
      const delta = lastTickRef.current ? nowPerf - lastTickRef.current : 100;
      lastTickRef.current = nowPerf;

      // Check inactivity auto-pause
      if (inactivityPauseSeconds > 0 && Date.now() - lastActivityRef.current >= inactivityPauseSeconds * 1000) {
        setStatus('paused');
        setPauseReason('inactivity');
        return;
      }

      setElapsedMs((prev) => {
        const next = prev + delta;
        if (isTimed && durationSeconds && next >= durationSeconds * 1000) {
          finishSession(typed, durationSeconds * 1000, totalKeystrokes, mistakeCount, keyErrors);
          return durationSeconds * 1000;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [status, inactivityPauseSeconds, isTimed, durationSeconds, finishSession, typed, totalKeystrokes, mistakeCount, keyErrors]);

  // Auto-scroll active character smoothly into view
  useEffect(() => {
    if (activeCharRef.current) {
      activeCharRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [typed.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (status === 'completed' || isExternallyPaused) return;

    // Ignore modifier-only keys or browser shortcuts
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) {
      const keyDef = findKeyByEvent(e.nativeEvent);
      if (keyDef) {
        setPressedKeyId(keyDef.id);
        setPressedFinger(keyDef.finger);
        setLastPressCorrect(true);
      }
      return;
    }

    e.preventDefault();
    lastActivityRef.current = Date.now();

    if (status === 'idle' || status === 'paused') {
      setStatus('running');
      setPauseReason(null);
    }

    const keyDef = findKeyByEvent(e.nativeEvent);

    if (e.key === 'Backspace') {
      if (keyDef) {
        setPressedKeyId(keyDef.id);
        setPressedFinger(keyDef.finger);
        setLastPressCorrect(true);
      }
      setTyped((prev) => prev.slice(0, -1));
      return;
    }

    const typedChar = e.key === 'Enter' ? '\n' : e.key.length === 1 ? e.key : '';
    if (!typedChar) return;

    const currentIndex = typed.length;
    if (currentIndex >= activeText.length) return;

    const expectedChar = activeText[currentIndex];
    const isCorrect = typedChar === expectedChar;

    if (keyDef) {
      setPressedKeyId(keyDef.id);
      setPressedFinger(keyDef.finger);
      setLastPressCorrect(isCorrect);
    }

    if (soundEnabled) {
      playKeySound(isCorrect ? 'correct' : 'error');
    }

    const nextTyped = typed + typedChar;
    const nextKeystrokes = totalKeystrokes + 1;
    const nextMistakes = isCorrect ? mistakeCount : mistakeCount + 1;
    let nextErrors = keyErrors;

    if (!isCorrect) {
      const errKey = expectedChar === '\n' ? 'Enter' : expectedChar;
      nextErrors = { ...keyErrors, [errKey]: (keyErrors[errKey] || 0) + 1 };
      setKeyErrors(nextErrors);
    }

    setTyped(nextTyped);
    setTotalKeystrokes(nextKeystrokes);
    setMistakeCount(nextMistakes);

    if (!isTimed && nextTyped.length >= activeText.length) {
      finishSession(nextTyped, Math.max(elapsedMs, 500), nextKeystrokes, nextMistakes, nextErrors);
    }
  };

  const handleKeyUp = () => {
    setPressedKeyId(null);
    setPressedFinger(null);
    setLastPressCorrect(null);
  };

  // Live metrics calculation
  const correctCharsCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === activeText[i]) count++;
    }
    return count;
  }, [typed, activeText]);

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingSeconds =
    isTimed && durationSeconds ? Math.max(0, durationSeconds - elapsedSeconds) : elapsedSeconds;

  const liveWpm = useMemo(() => {
    if (elapsedMs < 1200 && typed.length < 5) return 0;
    const minutes = Math.max(elapsedMs / 60000, 1 / 60);
    return Math.max(0, Math.round(correctCharsCount / 5 / minutes));
  }, [correctCharsCount, elapsedMs, typed.length]);

  const liveAccuracy = useMemo(() => {
    if (totalKeystrokes === 0) return 100;
    return Math.max(0, Math.min(100, Math.round(((totalKeystrokes - mistakeCount) / totalKeystrokes) * 100)));
  }, [totalKeystrokes, mistakeCount]);

  const progressPercent = Math.min(100, Math.round((typed.length / Math.max(1, activeText.length)) * 100));

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  const targetChar = activeText[typed.length];

  // Identify current word span for subtle word highlighting
  const currentWordRange = useMemo(() => {
    const idx = typed.length;
    if (idx >= activeText.length) return { start: -1, end: -1 };
    let start = idx;
    while (start > 0 && activeText[start - 1] !== ' ' && activeText[start - 1] !== '\n') {
      start--;
    }
    let end = idx;
    while (end < activeText.length && activeText[end] !== ' ' && activeText[end] !== '\n') {
      end++;
    }
    return { start, end };
  }, [typed.length, activeText]);

  const topWeakKeys = useMemo(() => {
    if (!completedResult) return [];
    return Object.entries(completedResult.keyErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [completedResult]);

  return (
    <div className="space-y-4">
      {/* Exercise Header & Live HUD */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && !zenFocusMode && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>

          {/* Live Metrics Strip */}
          <div className="flex flex-wrap items-center gap-5 sm:gap-7">
            <div>
              <div className="text-xs text-slate-500">Speed</div>
              <div className="font-mono text-xl font-semibold text-indigo-700 tabular-nums">
                {liveWpm} <span className="text-xs font-sans font-normal text-slate-500">WPM</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Accuracy</div>
              <div className="font-mono text-xl font-semibold text-emerald-700 tabular-nums">
                {liveAccuracy}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Mistakes</div>
              <div className={`font-mono text-xl font-semibold tabular-nums ${mistakeCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {mistakeCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{isTimed ? 'Remaining' : 'Elapsed'}</div>
              <div className="font-mono text-xl font-semibold text-amber-600 tabular-nums">
                {formatTimer(remainingSeconds)}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 via-blue-500 to-teal-500 transition-all duration-150"
            style={{
              width: `${
                isTimed && durationSeconds
                  ? Math.min(100, Math.round((elapsedSeconds / durationSeconds) * 100))
                  : progressPercent
              }%`,
            }}
          />
        </div>

        {/* Action Controls */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {status === 'idle' && <span>Click the typing box below and start typing on your keyboard</span>}
            {status === 'running' && <span>Active · {progressPercent}% through text</span>}
            {status === 'paused' && (
              <span className="text-amber-700 font-medium">
                {pauseReason === 'inactivity'
                  ? 'Auto-paused due to inactivity — press any key to resume'
                  : pauseReason === 'timeout'
                  ? 'Paused for screen break'
                  : 'Paused — click Resume or press any key'}
              </span>
            )}
            {status === 'completed' && (
              <span className="text-emerald-700 font-medium">Session completed</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status === 'running' || status === 'paused' ? (
              <button
                type="button"
                onClick={() => {
                  if (status === 'running') {
                    setStatus('paused');
                    setPauseReason('manual');
                  } else {
                    lastActivityRef.current = Date.now();
                    setStatus('running');
                    setPauseReason(null);
                    stageRef.current?.focus();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {status === 'running' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {status === 'running' ? 'Pause' : 'Resume'}
              </button>
            ) : null}

            <button
              type="button"
              onClick={resetSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restart
            </button>

            <button
              type="button"
              onClick={() => setShowKeyboard((v) => !v)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {showKeyboard ? 'Hide Keyboard' : 'Show Keyboard'}
            </button>

            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundEnabled ? 'Mute keystroke sound' : 'Enable keystroke sound'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {soundEnabled ? 'Sound On' : 'Muted'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Typing Stage OR Completion Report */}
      {status === 'completed' && completedResult ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Performance Report</h3>
                <p className="text-sm text-slate-500">
                  {completedResult.title} · Saved to Personal Progress
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={resetSession}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Practice Again
              </button>
              {onNext && (
                <button
                  type="button"
                  onClick={onNext}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {nextLabel}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-xs text-slate-500">Net Speed</div>
              <div className="font-mono text-3xl font-bold text-slate-900 mt-1 tabular-nums">
                {completedResult.wpm} <span className="text-sm font-sans font-normal text-slate-500">WPM</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-xs text-slate-500">Accuracy</div>
              <div className="font-mono text-3xl font-bold text-emerald-700 mt-1 tabular-nums">
                {completedResult.accuracy}%
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-xs text-slate-500">Mistakes</div>
              <div className="font-mono text-3xl font-bold text-red-600 mt-1 tabular-nums">
                {completedResult.mistakes}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-xs text-slate-500">Time</div>
              <div className="font-mono text-3xl font-bold text-slate-900 mt-1 tabular-nums">
                {formatTimer(completedResult.durationSeconds)}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600 pt-4 border-t border-slate-100">
            <div>
              Raw Speed: <span className="font-mono font-semibold text-slate-900">{completedResult.rawWpm} WPM</span>
              <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
              Characters Typed: <span className="font-mono font-semibold text-slate-900">{completedResult.correctChars}/{completedResult.totalChars}</span>
            </div>

            {topWeakKeys.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Error-prone keys:
                </span>
                {topWeakKeys.map(([k, count]) => (
                  <span key={k} className="font-mono text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded">
                    {k === ' ' ? 'Space' : k} ({count})
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-emerald-700 font-medium">Zero mistakes — clean run!</div>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={stageRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          aria-label="Typing practice text area. Click here and begin typing."
          className="relative bg-white border-2 border-slate-200 focus:border-blue-600 focus:outline-none rounded-xl p-6 sm:p-8 transition-colors cursor-text"
        >
          {status === 'paused' && (
            <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center justify-between gap-3">
              <span>
                {pauseReason === 'inactivity'
                  ? 'Clock paused after inactivity. Press any key to continue typing.'
                  : 'Typing session paused. Click Resume or press any key.'}
              </span>
              <button
                type="button"
                onClick={() => {
                  lastActivityRef.current = Date.now();
                  setStatus('running');
                  setPauseReason(null);
                  stageRef.current?.focus();
                }}
                className="px-3 py-1 text-xs font-medium bg-amber-900 text-white rounded-md whitespace-nowrap shrink-0 cursor-pointer"
              >
                Resume
              </button>
            </div>
          )}

          <div className="font-mono text-lg sm:text-[21px] leading-[1.85] tracking-wide max-h-56 overflow-y-auto pr-2 select-none whitespace-pre-wrap break-words">
            {activeText.split('').map((char, idx) => {
              const isTyped = idx < typed.length;
              const isCurrent = idx === typed.length;
              const isInCurrentWord = idx >= currentWordRange.start && idx < currentWordRange.end;

              let charClass = 'text-slate-400';
              if (isTyped) {
                const match = typed[idx] === char;
                if (match) {
                  charClass = 'text-emerald-600 font-medium';
                } else {
                  charClass = 'text-red-600 bg-red-50 underline decoration-red-500 decoration-2 font-semibold rounded-[2px]';
                }
              } else if (isCurrent) {
                charClass = 'text-slate-950 bg-blue-100 rounded-[3px] relative';
              } else if (isInCurrentWord) {
                charClass = 'text-slate-700 underline decoration-slate-200 underline-offset-4';
              }

              const displayChar = char === '\n' ? '↵\n' : char;

              return (
                <span
                  key={idx}
                  ref={isCurrent ? activeCharRef : undefined}
                  className={charClass}
                >
                  {isCurrent && (
                    <span
                      aria-hidden="true"
                      className="typing-caret absolute left-0 top-0.5 bottom-0.5 w-[2px] bg-blue-600"
                    />
                  )}
                  {displayChar}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Virtual Keyboard + Two Virtual Hands */}
      {showKeyboard && status !== 'completed' && (
        <VirtualKeyboard
          targetChar={targetChar}
          pressedKeyId={pressedKeyId}
          pressedFinger={pressedFinger}
          lastPressCorrect={lastPressCorrect}
          showHands={showHands}
          onToggleHands={() => setShowHands((v) => !v)}
        />
      )}
    </div>
  );
};
