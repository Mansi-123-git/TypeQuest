import React, { useMemo, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { SPEED_TEST_PASSAGES } from '../data/lessons';
import type { DifficultyLevel, TypingSessionResult } from '../types/typing';
import { TypingEngine } from './TypingEngine';

interface SpeedTestViewProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  inactivityPauseSeconds: number;
  isExternallyPaused: boolean;
  zenFocusMode: boolean;
  onSessionComplete: (result: TypingSessionResult) => void;
}

export const SpeedTestView: React.FC<SpeedTestViewProps> = ({
  soundEnabled,
  onToggleSound,
  inactivityPauseSeconds,
  isExternallyPaused,
  zenFocusMode,
  onSessionComplete,
}) => {
  const [duration, setDuration] = useState<30 | 60 | 120>(60);
  const [level, setLevel] = useState<DifficultyLevel>('intermediate');
  const [format, setFormat] = useState<'words' | 'sentences' | 'paragraphs'>('paragraphs');
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);

  const selectedPassage = useMemo(() => {
    const exactMatches = SPEED_TEST_PASSAGES.filter(
      (p) => p.level === level && p.format === format
    );
    const levelMatches = SPEED_TEST_PASSAGES.filter((p) => p.level === level);
    const pool = exactMatches.length > 0 ? exactMatches : levelMatches.length > 0 ? levelMatches : SPEED_TEST_PASSAGES;
    return pool[shuffleSeed % pool.length];
  }, [level, format, shuffleSeed]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Test Configuration Bar */}
      {!zenFocusMode && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Duration */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Duration:</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {([30, 60, 120] as const).map((secs) => (
                  <button
                    key={secs}
                    type="button"
                    onClick={() => setDuration(secs)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      duration === secs
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {secs}s
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Level:</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap cursor-pointer ${
                      level === lvl
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Content:</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['words', 'sentences', 'paragraphs'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap cursor-pointer ${
                      format === fmt
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShuffleSeed((s) => s + 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            New Passage
          </button>
        </div>
      )}

      <TypingEngine
        key={`${selectedPassage.id}-${duration}-${shuffleSeed}`}
        title={`${duration}-Second Speed Test`}
        subtitle={`${selectedPassage.title} · ${level.charAt(0).toUpperCase() + level.slice(1)} ${format}`}
        text={selectedPassage.text}
        mode="speedtest"
        level={level}
        durationSeconds={duration}
        showKeyboardDefault={false}
        showHandsDefault={false}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        inactivityPauseSeconds={inactivityPauseSeconds}
        isExternallyPaused={isExternallyPaused}
        zenFocusMode={zenFocusMode}
        onSessionComplete={onSessionComplete}
        onNext={() => setShuffleSeed((s) => s + 1)}
        nextLabel="Try Another Passage"
      />
    </div>
  );
};
