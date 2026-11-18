import React from 'react';
import { Clock, Eye, Monitor, PauseCircle, Volume2, X } from 'lucide-react';
import type { FocusSettings } from '../types/typing';

interface FocusControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FocusSettings;
  onChange: (next: FocusSettings) => void;
  screenSecondsRemaining: number | null;
  onResetScreenTimer: () => void;
  wakeLockActive: boolean;
}

export const FocusControlModal: React.FC<FocusControlModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  screenSecondsRemaining,
  onResetScreenTimer,
  wakeLockActive,
}) => {
  if (!isOpen) return null;

  const formatRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timeoutOptions = [0, 5, 15, 25, 30, 45];
  const inactivityOptions = [0, 15, 30, 60];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-control-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 id="focus-control-title" className="text-lg font-semibold text-slate-900">
              Screen Timeout &amp; Focus Control
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage distraction-free typing, eye-rest screen limits, and idle auto-pause.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close focus controls"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Zen Focus Mode */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700 mt-0.5">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">Zen Focus Mode</div>
                <div className="text-xs text-slate-500">
                  Hides navigation chrome and secondary panels while practicing (Esc to exit).
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...settings, zenFocusMode: !settings.zenFocusMode })}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                settings.zenFocusMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {settings.zenFocusMode ? 'Enabled' : 'Off'}
            </button>
          </div>

          {/* Screen Timeout / Break Timer */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-900">Screen Timeout Limit</span>
              </div>
              {settings.screenTimeoutMinutes > 0 && screenSecondsRemaining !== null && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-blue-600 tabular-nums">
                    {formatRemaining(screenSecondsRemaining)} left
                  </span>
                  <button
                    type="button"
                    onClick={onResetScreenTimer}
                    className="text-slate-500 hover:text-slate-900 underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Automatically pauses your session and prompts a short eye-rest break when reached.
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {timeoutOptions.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChange({ ...settings, screenTimeoutMinutes: mins })}
                  className={`py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    settings.screenTimeoutMinutes === mins
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {mins === 0 ? 'Off' : `${mins}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Inactivity Auto-Pause */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-1.5">
              <PauseCircle className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-900">Inactivity Auto-Pause</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Freezes the typing WPM clock automatically if you pause to read notes or rest.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {inactivityOptions.map((secs) => (
                <button
                  key={secs}
                  type="button"
                  onClick={() => onChange({ ...settings, inactivityPauseSeconds: secs })}
                  className={`py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    settings.inactivityPauseSeconds === secs
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {secs === 0 ? 'Off' : `${secs}s idle`}
                </button>
              ))}
            </div>
          </div>

          {/* Keep Screen Awake & Keystroke Sound */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange({ ...settings, keepScreenAwake: !settings.keepScreenAwake })}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                settings.keepScreenAwake
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                <div>
                  <div className="text-xs font-medium">Keep Screen Awake</div>
                  <div className="text-[11px] opacity-75">
                    {wakeLockActive ? 'Wake lock active' : 'Prevent OS sleep'}
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold">
                {settings.keepScreenAwake ? 'On' : 'Off'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ ...settings, soundEnabled: !settings.soundEnabled })}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                settings.soundEnabled
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                <div>
                  <div className="text-xs font-medium">Keystroke Sound</div>
                  <div className="text-[11px] opacity-75">Audio tactile feedback</div>
                </div>
              </div>
              <span className="text-xs font-semibold">
                {settings.soundEnabled ? 'On' : 'Off'}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

interface ScreenTimeoutOverlayProps {
  isOpen: boolean;
  minutesCompleted: number;
  onExtend: (extraMinutes: number) => void;
  onDismiss: () => void;
}

export const ScreenTimeoutOverlay: React.FC<ScreenTimeoutOverlayProps> = ({
  isOpen,
  minutesCompleted,
  onExtend,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-7 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mt-4">
          Screen Timeout Reached ({minutesCompleted} min)
        </h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Your typing timer has been paused automatically. Look 20 feet away for 20 seconds and relax your wrists before continuing.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onExtend(5)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            Extend +5 min
          </button>
          <button
            type="button"
            onClick={() => onExtend(15)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Extend +15 min
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            Turn Off Timer
          </button>
        </div>
      </div>
    </div>
  );
};
