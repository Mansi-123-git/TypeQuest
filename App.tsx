import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { DictionaryTypingView } from './components/DictionaryTypingView';
import { FocusControlModal, ScreenTimeoutOverlay } from './components/FocusControlModal';
import { ProgressView } from './components/ProgressView';
import { ScanAndTypeView } from './components/ScanAndTypeView';
import { SpeedTestView } from './components/SpeedTestView';
import { TypingGameView } from './components/TypingGameView';
import { TypingTutorView } from './components/TypingTutorView';
import type { AppTab, FocusSettings, TypingLesson, TypingSessionResult } from './types/typing';
import {
  addMasteredWord,
  clearAllSessions,
  loadFocusSettings,
  loadMasteredWords,
  loadSessions,
  saveFocusSettings,
  saveSession,
} from './utils/storage';

const NAV_ITEMS: { id: AppTab; label: string }[] = [
  { id: 'tutor', label: 'Typing Tutor' },
  { id: 'speedtest', label: 'Speed Test' },
  { id: 'game', label: 'Arcade Game' },
  { id: 'scan', label: 'Scan & Type' },
  { id: 'dictionary', label: 'Dictionary' },
  { id: 'progress', label: 'Progress' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('tutor');
  const [sessions, setSessions] = useState<TypingSessionResult[]>(() => loadSessions());
  const [masteredWords, setMasteredWords] = useState<string[]>(() => loadMasteredWords());
  const [focusSettings, setFocusSettings] = useState<FocusSettings>(() => loadFocusSettings());
  const [isFocusModalOpen, setIsFocusModalOpen] = useState<boolean>(false);
  const [customDrillLesson, setCustomDrillLesson] = useState<TypingLesson | null>(null);

  // Screen Timeout countdown state (defaults to 30 minutes)
  const [screenSecondsRemaining, setScreenSecondsRemaining] = useState<number | null>(() =>
    focusSettings.screenTimeoutMinutes > 0 ? focusSettings.screenTimeoutMinutes * 60 : null
  );
  const [timeoutOverlayOpen, setTimeoutOverlayOpen] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const updateFocusSettings = useCallback((next: FocusSettings) => {
    setFocusSettings((prev) => {
      if (prev.screenTimeoutMinutes !== next.screenTimeoutMinutes) {
        setScreenSecondsRemaining(
          next.screenTimeoutMinutes > 0 ? next.screenTimeoutMinutes * 60 : null
        );
        setTimeoutOverlayOpen(false);
      }
      saveFocusSettings(next);
      return next;
    });
  }, []);

  // Esc key exits Zen Focus Mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusSettings.zenFocusMode) {
        updateFocusSettings({ ...focusSettings, zenFocusMode: false });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusSettings, updateFocusSettings]);

  // Screen Timeout Countdown
  useEffect(() => {
    if (focusSettings.screenTimeoutMinutes <= 0 || timeoutOverlayOpen) {
      return;
    }

    const interval = window.setInterval(() => {
      setScreenSecondsRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setTimeoutOverlayOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [focusSettings.screenTimeoutMinutes, timeoutOverlayOpen]);

  // Screen Wake Lock API integration
  useEffect(() => {
    let cancelled = false;

    const releaseLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // ignore
        }
        wakeLockRef.current = null;
      }
      if (!cancelled) setWakeLockActive(false);
    };

    const requestLock = async () => {
      if (!focusSettings.keepScreenAwake) {
        await releaseLock();
        return;
      }
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try {
          const sentinel = await navigator.wakeLock.request('screen');
          if (cancelled) {
            await sentinel.release();
            return;
          }
          wakeLockRef.current = sentinel;
          setWakeLockActive(true);
          sentinel.addEventListener('release', () => {
            if (!cancelled) setWakeLockActive(false);
          });
        } catch {
          if (!cancelled) setWakeLockActive(false);
        }
      }
    };

    requestLock();

    return () => {
      cancelled = true;
      releaseLock();
    };
  }, [focusSettings.keepScreenAwake]);

  const handleSessionComplete = useCallback((result: TypingSessionResult) => {
    const updated = saveSession(result);
    setSessions(updated);
  }, []);

  const handleWordMastered = useCallback((word: string) => {
    const updated = addMasteredWord(word);
    setMasteredWords(updated);
  }, []);

  const handleClearProgress = useCallback(() => {
    const updated = clearAllSessions();
    setSessions(updated);
  }, []);

  const handlePracticeWeakKeys = useCallback((keys: string[]) => {
    const cleanChars = keys
      .map((k) => (k === 'Space' ? ' ' : k))
      .filter((k) => k.length === 1 && k !== ' ');
    const targetPool = cleanChars.length > 0 ? cleanChars.slice(0, 6) : ['f', 'j', 'd', 'k'];

    const drillTokens: string[] = [];
    for (let i = 0; i < 18; i++) {
      const a = targetPool[i % targetPool.length];
      const b = targetPool[(i + 1) % targetPool.length];
      const c = targetPool[(i + 2) % targetPool.length];
      drillTokens.push(`${a}${b}${a}${c}`, `${b}${a}${c}${b}`);
    }

    setCustomDrillLesson({
      id: `weak-drill-${Date.now()}`,
      title: `Weak-Key Drill (${targetPool.join(' ')})`,
      subtitle: 'Targeted accuracy recovery generated from your personal mistake history',
      level: 'beginner',
      category: 'words',
      targetWpm: 30,
      text: drillTokens.join(' '),
      focusKeys: targetPool,
    });
    setActiveTab('tutor');
  }, []);

  const completedLessonIds = useMemo(() => {
    return Array.from(
      new Set(sessions.filter((s) => s.mode === 'tutor').map((s) => s.title))
    );
  }, [sessions]);

  const formatShortTimer = (secs: number | null) => {
    if (secs === null) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        focusSettings.zenFocusMode
          ? 'bg-slate-100'
          : 'bg-gradient-to-b from-indigo-50/40 via-slate-50 to-sky-50/30'
      }`}
    >
      {/* Top Bar (3-Zone Contract) */}
      {!focusSettings.zenFocusMode ? (
        <header className="bg-white/95 backdrop-blur-xs border-b border-indigo-100 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
            {/* Zone 1: Single text element wordmark */}
            <button
              type="button"
              onClick={() => setActiveTab('tutor')}
              className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-teal-600 bg-clip-text text-transparent whitespace-nowrap shrink-0 cursor-pointer"
            >
              TypeQuest
            </button>

            {/* Zone 2: Concise single-line text nav links */}
            <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-5 h-full">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`h-full inline-flex items-center text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-slate-600 hover:text-indigo-600'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: 1 primary action */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setIsFocusModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>
                  {focusSettings.screenTimeoutMinutes > 0 && screenSecondsRemaining !== null
                    ? `Focus · ${formatShortTimer(screenSecondsRemaining)}`
                    : 'Focus & Timeout'}
                </span>
              </button>
            </div>
          </div>

          {/* Mobile Nav Row */}
          <nav
            aria-label="Mobile navigation"
            className="md:hidden flex items-center gap-4 overflow-x-auto px-4 py-2 border-t border-slate-100 bg-white"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1 text-xs font-medium border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </header>
      ) : (
        <div className="max-w-4xl w-full mx-auto px-4 pt-5 flex items-center justify-between gap-4">
          <div className="text-sm font-medium text-slate-600">
            Zen Focus Mode
            {focusSettings.screenTimeoutMinutes > 0 && screenSecondsRemaining !== null && (
              <span className="ml-2 font-mono text-xs text-indigo-600 tabular-nums">
                · Screen break in {formatShortTimer(screenSecondsRemaining)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFocusModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Timer Settings
            </button>
            <button
              type="button"
              onClick={() => updateFocusSettings({ ...focusSettings, zenFocusMode: false })}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              Exit Focus (Esc)
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'tutor' && (
          <TypingTutorView
            soundEnabled={focusSettings.soundEnabled}
            onToggleSound={() =>
              updateFocusSettings({ ...focusSettings, soundEnabled: !focusSettings.soundEnabled })
            }
            inactivityPauseSeconds={focusSettings.inactivityPauseSeconds}
            isExternallyPaused={timeoutOverlayOpen}
            zenFocusMode={focusSettings.zenFocusMode}
            onSessionComplete={handleSessionComplete}
            customDrillLesson={customDrillLesson}
            onClearCustomDrill={() => setCustomDrillLesson(null)}
            completedLessonIds={completedLessonIds}
          />
        )}

        {activeTab === 'speedtest' && (
          <SpeedTestView
            soundEnabled={focusSettings.soundEnabled}
            onToggleSound={() =>
              updateFocusSettings({ ...focusSettings, soundEnabled: !focusSettings.soundEnabled })
            }
            inactivityPauseSeconds={focusSettings.inactivityPauseSeconds}
            isExternallyPaused={timeoutOverlayOpen}
            zenFocusMode={focusSettings.zenFocusMode}
            onSessionComplete={handleSessionComplete}
          />
        )}

        {activeTab === 'game' && (
          <TypingGameView
            soundEnabled={focusSettings.soundEnabled}
            isExternallyPaused={timeoutOverlayOpen}
            zenFocusMode={focusSettings.zenFocusMode}
            onSessionComplete={handleSessionComplete}
          />
        )}

        {activeTab === 'scan' && (
          <ScanAndTypeView
            soundEnabled={focusSettings.soundEnabled}
            onToggleSound={() =>
              updateFocusSettings({ ...focusSettings, soundEnabled: !focusSettings.soundEnabled })
            }
            inactivityPauseSeconds={focusSettings.inactivityPauseSeconds}
            isExternallyPaused={timeoutOverlayOpen}
            zenFocusMode={focusSettings.zenFocusMode}
            onSessionComplete={handleSessionComplete}
          />
        )}

        {activeTab === 'dictionary' && (
          <DictionaryTypingView
            soundEnabled={focusSettings.soundEnabled}
            inactivityPauseSeconds={focusSettings.inactivityPauseSeconds}
            isExternallyPaused={timeoutOverlayOpen}
            zenFocusMode={focusSettings.zenFocusMode}
            onSessionComplete={handleSessionComplete}
            masteredWords={masteredWords}
            onWordMastered={handleWordMastered}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressView
            sessions={sessions}
            masteredWordsCount={masteredWords.length}
            onPracticeWeakKeys={handlePracticeWeakKeys}
            onClearProgress={handleClearProgress}
          />
        )}
      </main>

      {/* Modals for Screen Timeout & Focus Control */}
      <FocusControlModal
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        settings={focusSettings}
        onChange={updateFocusSettings}
        screenSecondsRemaining={screenSecondsRemaining}
        onResetScreenTimer={() => {
          setScreenSecondsRemaining(
            focusSettings.screenTimeoutMinutes > 0 ? focusSettings.screenTimeoutMinutes * 60 : null
          );
          setTimeoutOverlayOpen(false);
        }}
        wakeLockActive={wakeLockActive}
      />

      <ScreenTimeoutOverlay
        isOpen={timeoutOverlayOpen}
        minutesCompleted={focusSettings.screenTimeoutMinutes}
        onExtend={(extraMinutes) => {
          setScreenSecondsRemaining(extraMinutes * 60);
          setTimeoutOverlayOpen(false);
        }}
        onDismiss={() => {
          updateFocusSettings({ ...focusSettings, screenTimeoutMinutes: 0 });
          setTimeoutOverlayOpen(false);
        }}
      />
    </div>
  );
}
