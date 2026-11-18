import React, { useMemo, useState } from 'react';
import { Award, Clock, Target, Trash2, TrendingUp } from 'lucide-react';
import type { TypingSessionResult } from '../types/typing';
import { aggregateWeakKeys } from '../utils/storage';

interface ProgressViewProps {
  sessions: TypingSessionResult[];
  masteredWordsCount: number;
  onPracticeWeakKeys: (keys: string[]) => void;
  onClearProgress: () => void;
}

const MODE_LABELS: Record<TypingSessionResult['mode'], string> = {
  tutor: 'Typing Tutor',
  speedtest: 'Speed Test',
  game: 'Arcade Game',
  scan: 'Scan & Type',
  dictionary: 'Dictionary',
};

export const ProgressView: React.FC<ProgressViewProps> = ({
  sessions,
  masteredWordsCount,
  onPracticeWeakKeys,
  onClearProgress,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  const stats = useMemo(() => {
    if (sessions.length === 0) {
      return {
        bestWpm: 0,
        avgWpm: 0,
        avgAccuracy: 0,
        totalMinutes: 0,
      };
    }
    const bestWpm = Math.max(...sessions.map((s) => s.wpm));
    const avgWpm = Math.round(sessions.reduce((acc, s) => acc + s.wpm, 0) / sessions.length);
    const avgAccuracy = Math.round(
      sessions.reduce((acc, s) => acc + s.accuracy, 0) / sessions.length
    );
    const totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    return {
      bestWpm,
      avgWpm,
      avgAccuracy,
      totalMinutes: Math.max(1, Math.round(totalSeconds / 60)),
    };
  }, [sessions]);

  const weakKeys = useMemo(() => aggregateWeakKeys(sessions), [sessions]);
  const recentForChart = useMemo(() => sessions.slice(0, 12).reverse(), [sessions]);
  const maxChartWpm = Math.max(40, ...recentForChart.map((s) => s.wpm));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-indigo-700 font-medium">
            <span>Best Speed</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="font-mono text-3xl font-bold text-indigo-950 mt-2 tabular-nums">
            {stats.bestWpm} <span className="text-sm font-sans font-normal text-indigo-600">WPM</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-50 to-white border border-sky-200/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-sky-700 font-medium">
            <span>Average Speed</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="font-mono text-3xl font-bold text-sky-950 mt-2 tabular-nums">
            {stats.avgWpm} <span className="text-sm font-sans font-normal text-sky-600">WPM</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>Average Accuracy</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono text-3xl font-bold text-emerald-800 mt-2 tabular-nums">
            {stats.avgAccuracy}%
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200/80 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
            <span>Practice Time</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-mono text-3xl font-bold text-amber-950 mt-2 tabular-nums">
            {stats.totalMinutes} <span className="text-sm font-sans font-normal text-amber-700">min</span>
          </div>
          <div className="text-xs text-amber-800/80 mt-1">
            {sessions.length} sessions · {masteredWordsCount} dictionary words
          </div>
        </div>
      </div>

      {/* WPM Trend & Weak Keys */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">Recent Speed Trend (WPM)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tracks your net WPM across your latest 12 completed exercises.
          </p>

          {recentForChart.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-slate-400">
              Complete a typing lesson, speed test, or scan exercise to see your speed chart.
            </div>
          ) : (
            <div className="mt-6 h-44 flex items-end gap-2.5 pt-6 border-b border-slate-100">
              {recentForChart.map((sess) => {
                const heightPct = Math.max(12, Math.round((sess.wpm / maxChartWpm) * 100));
                return (
                  <div key={sess.id} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="font-mono text-[11px] font-semibold text-slate-700 tabular-nums">
                      {sess.wpm}
                    </span>
                    <div
                      className="w-full max-w-[36px] bg-blue-600 rounded-t-md transition-all duration-300"
                      style={{ height: `${heightPct}%` }}
                      title={`${sess.title}: ${sess.wpm} WPM (${sess.accuracy}% accuracy)`}
                    />
                    <span className="text-[10px] text-slate-400 truncate max-w-full">
                      {MODE_LABELS[sess.mode].split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Keys Needing Practice</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Most frequently mistyped characters across your sessions.
            </p>

            {weakKeys.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                No key error patterns recorded yet.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {weakKeys.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/70"
                  >
                    <span className="font-mono text-sm font-semibold text-slate-900">
                      {item.key}
                    </span>
                    <span className="font-mono text-xs text-red-600 tabular-nums">
                      {item.errors} misses
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {weakKeys.length > 0 && (
            <button
              type="button"
              onClick={() => onPracticeWeakKeys(weakKeys.map((w) => w.key))}
              className="mt-5 w-full py-2.5 px-4 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Launch Targeted Weak-Key Drill
            </button>
          )}
        </div>
      </div>

      {/* Session History Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Session History</h2>
            <p className="text-xs text-slate-500">All results are stored locally in your browser.</p>
          </div>

          {sessions.length > 0 && (
            <div>
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-700">Clear all records?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearProgress();
                      setConfirmClear(false);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear History
                </button>
              )}
            </div>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No completed sessions yet. Start practicing in Typing Tutor, Speed Test, Scan &amp; Type, or Dictionary!
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th className="py-3 pr-4 font-medium">Mode</th>
                  <th className="py-3 pr-4 font-medium">Exercise</th>
                  <th className="py-3 pr-4 font-medium text-right">WPM</th>
                  <th className="py-3 pr-4 font-medium text-right">Accuracy</th>
                  <th className="py-3 pr-4 font-medium text-right">Mistakes</th>
                  <th className="py-3 pr-4 font-medium text-right">Time</th>
                  <th className="py-3 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.slice(0, 30).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">{MODE_LABELS[s.mode]}</td>
                    <td className="py-3 pr-4 font-medium text-slate-900 max-w-xs truncate">{s.title}</td>
                    <td className="py-3 pr-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {s.wpm}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-emerald-700 tabular-nums">
                      {s.accuracy}%
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-red-600 tabular-nums">
                      {s.mistakes}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-slate-600 tabular-nums">
                      {s.durationSeconds}s
                    </td>
                    <td className="py-3 text-right text-xs text-slate-500 whitespace-nowrap">
                      {new Date(s.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
