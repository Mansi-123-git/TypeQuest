import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Loader2, Lock, RefreshCw, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { STARTER_DICTIONARY, getWordOfTheDay } from '../data/dictionary';
import type { DictionaryWord, DifficultyLevel, FingerId, TypingSessionResult } from '../types/typing';
import { findKeyByEvent } from '../utils/keyboardMap';
import { playKeySound } from '../utils/sound';
import { VirtualKeyboard } from './VirtualKeyboard';

interface DictionaryTypingViewProps {
  soundEnabled: boolean;
  inactivityPauseSeconds: number;
  isExternallyPaused: boolean;
  zenFocusMode: boolean;
  onSessionComplete: (result: TypingSessionResult) => void;
  masteredWords: string[];
  onWordMastered: (word: string) => void;
}

const DIFFICULTY_ACCENTS: Record<DifficultyLevel, string> = {
  beginner: 'text-emerald-700',
  intermediate: 'text-indigo-700',
  advanced: 'text-violet-700',
};

export const DictionaryTypingView: React.FC<DictionaryTypingViewProps> = ({
  soundEnabled,
  inactivityPauseSeconds,
  isExternallyPaused,
  zenFocusMode,
  onSessionComplete,
  masteredWords,
  onWordMastered,
}) => {
  const [wordsPool, setWordsPool] = useState<DictionaryWord[]>(STARTER_DICTIONARY);
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | DifficultyLevel>('all');
  const [practiceTargetMode, setPracticeTargetMode] = useState<'word' | 'word-and-sentence'>('word');
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  const wordOfTheDay = useMemo(() => getWordOfTheDay(wordsPool), [wordsPool]);

  const deck = useMemo(() => {
    const filtered =
      difficultyFilter === 'all'
        ? wordsPool
        : wordsPool.filter((w) => w.difficulty === difficultyFilter);
    return filtered.length > 0 ? filtered : wordsPool;
  }, [wordsPool, difficultyFilter]);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [typed, setTyped] = useState<string>('');
  const [completedWordsInRound, setCompletedWordsInRound] = useState<DictionaryWord[]>([]);
  const [wordMeaningUnlocked, setWordMeaningUnlocked] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState<number>(0);
  const [mistakes, setMistakes] = useState<number>(0);
  const [correctCharsTotal, setCorrectCharsTotal] = useState<number>(0);
  const [keyErrors, setKeyErrors] = useState<Record<string, number>>({});
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [roundCompleted, setRoundCompleted] = useState<TypingSessionResult | null>(null);

  const [pressedKeyId, setPressedKeyId] = useState<string | null>(null);
  const [pressedFinger, setPressedFinger] = useState<FingerId | null>(null);
  const [lastPressCorrect, setLastPressCorrect] = useState<boolean | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastTickRef = useRef<number | null>(null);

  const ROUND_SIZE = Math.min(8, deck.length);
  const currentWord = deck[currentIndex % deck.length] || wordOfTheDay;

  const expectedText = useMemo(() => {
    if (practiceTargetMode === 'word') return currentWord.word;
    return `${currentWord.word} - ${currentWord.exampleSentence}`;
  }, [currentWord, practiceTargetMode]);

  const resetRound = useCallback(() => {
    setTyped('');
    setCompletedWordsInRound([]);
    setWordMeaningUnlocked(false);
    setStreak(0);
    setTotalKeystrokes(0);
    setMistakes(0);
    setCorrectCharsTotal(0);
    setKeyErrors({});
    setElapsedMs(0);
    setIsActive(false);
    setIsPaused(false);
    setRoundCompleted(null);
    lastActivityRef.current = Date.now();
    stageRef.current?.focus();
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
    resetRound();
  }, [difficultyFilter, practiceTargetMode, resetRound]);

  useEffect(() => {
    if (isExternallyPaused && isActive) {
      setIsPaused(true);
    }
  }, [isExternallyPaused, isActive]);

  // Pause active typing timer while user reads the unlocked meaning after word completion
  useEffect(() => {
    if (!isActive || isPaused || wordMeaningUnlocked || roundCompleted) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();
    const timer = window.setInterval(() => {
      const nowPerf = performance.now();
      const delta = lastTickRef.current ? nowPerf - lastTickRef.current : 100;
      lastTickRef.current = nowPerf;

      if (inactivityPauseSeconds > 0 && Date.now() - lastActivityRef.current >= inactivityPauseSeconds * 1000) {
        setIsPaused(true);
        return;
      }

      setElapsedMs((prev) => prev + delta);
    }, 100);

    return () => window.clearInterval(timer);
  }, [isActive, isPaused, wordMeaningUnlocked, roundCompleted, inactivityPauseSeconds]);

  const speakWord = (word: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  };

  const handleGenerateFreshWords = async () => {
    setIsGenerating(true);
    setGenError(null);
    try {
      const level = difficultyFilter === 'all' ? 'intermediate' : difficultyFilter;
      const response = await fetch('/api/dictionary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          difficulty: level,
          count: 6,
          excludeWords: wordsPool.map((w) => w.word),
        }),
      });
      const data = (await response.json()) as {
        words?: Omit<DictionaryWord, 'id'>[];
        error?: string;
      };
      if (!response.ok || !Array.isArray(data.words) || data.words.length === 0) {
        throw new Error(data.error || 'Could not load new dictionary words.');
      }

      const fresh: DictionaryWord[] = data.words.map((item, idx) => ({
        ...item,
        id: `ai-${Date.now()}-${idx}`,
        difficulty:
          item.difficulty === 'beginner' || item.difficulty === 'advanced'
            ? item.difficulty
            : 'intermediate',
      }));

      setWordsPool((prev) => [...fresh, ...prev]);
      setCurrentIndex(0);
      resetRound();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate words.');
    } finally {
      setIsGenerating(false);
    }
  };

  const advanceAfterMeaning = useCallback(() => {
    if (!wordMeaningUnlocked) return;

    if (completedWordsInRound.length >= ROUND_SIZE) {
      const minutes = Math.max(elapsedMs / 60000, 1 / 60);
      const wpm = Math.max(0, Math.round(correctCharsTotal / 5 / minutes));
      const rawWpm = Math.max(0, Math.round(totalKeystrokes / 5 / minutes));
      const accuracy =
        totalKeystrokes > 0
          ? Math.max(0, Math.min(100, Math.round(((totalKeystrokes - mistakes) / totalKeystrokes) * 100)))
          : 100;

      if (soundEnabled) playKeySound('complete');

      const result: TypingSessionResult = {
        id: `dict-${Date.now()}`,
        mode: 'dictionary',
        title: `Dictionary Typing (${ROUND_SIZE} words)`,
        level: difficultyFilter === 'all' ? 'intermediate' : difficultyFilter,
        wpm,
        rawWpm,
        accuracy,
        mistakes,
        correctChars: correctCharsTotal,
        totalChars: correctCharsTotal,
        durationSeconds: Math.max(1, Math.round(elapsedMs / 1000)),
        keyErrors,
        timestamp: new Date().toISOString(),
      };

      setRoundCompleted(result);
      onSessionComplete(result);
      return;
    }

    setWordMeaningUnlocked(false);
    setTyped('');
    setCurrentIndex((i) => (i + 1) % deck.length);
    lastActivityRef.current = Date.now();
    stageRef.current?.focus();
  }, [
    ROUND_SIZE,
    completedWordsInRound.length,
    correctCharsTotal,
    deck.length,
    difficultyFilter,
    elapsedMs,
    keyErrors,
    mistakes,
    onSessionComplete,
    soundEnabled,
    totalKeystrokes,
    wordMeaningUnlocked,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (roundCompleted || isExternallyPaused) return;

    if (wordMeaningUnlocked) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advanceAfterMeaning();
      }
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) {
      const kDef = findKeyByEvent(e.nativeEvent);
      if (kDef) {
        setPressedKeyId(kDef.id);
        setPressedFinger(kDef.finger);
        setLastPressCorrect(true);
      }
      return;
    }

    e.preventDefault();
    lastActivityRef.current = Date.now();
    if (!isActive) setIsActive(true);
    if (isPaused) setIsPaused(false);

    const kDef = findKeyByEvent(e.nativeEvent);

    if (e.key === 'Backspace') {
      if (kDef) {
        setPressedKeyId(kDef.id);
        setPressedFinger(kDef.finger);
        setLastPressCorrect(true);
      }
      setTyped((prev) => prev.slice(0, -1));
      return;
    }

    if (e.key.length !== 1) return;

    const idx = typed.length;
    if (idx >= expectedText.length) return;

    const expectedChar = expectedText[idx];
    const isCorrect = e.key === expectedChar;

    if (kDef) {
      setPressedKeyId(kDef.id);
      setPressedFinger(kDef.finger);
      setLastPressCorrect(isCorrect);
    }

    if (soundEnabled) playKeySound(isCorrect ? 'correct' : 'error');

    const nextTyped = typed + e.key;
    const nextKeystrokes = totalKeystrokes + 1;
    const nextMistakes = isCorrect ? mistakes : mistakes + 1;
    const nextCorrectTotal = isCorrect ? correctCharsTotal + 1 : correctCharsTotal;
    let nextErrors = keyErrors;

    if (!isCorrect) {
      nextErrors = { ...keyErrors, [expectedChar]: (keyErrors[expectedChar] || 0) + 1 };
      setKeyErrors(nextErrors);
      setStreak(0);
    }

    setTyped(nextTyped);
    setTotalKeystrokes(nextKeystrokes);
    setMistakes(nextMistakes);
    setCorrectCharsTotal(nextCorrectTotal);

    // Unlock the full Hindi & English meaning card as soon as the word is typed accurately!
    if (nextTyped === expectedText) {
      if (soundEnabled) playKeySound('complete');
      onWordMastered(currentWord.word);
      setStreak((s) => s + 1);
      setCompletedWordsInRound((prev) => [...prev, currentWord]);
      setWordMeaningUnlocked(true);
    }
  };

  const handleKeyUp = () => {
    setPressedKeyId(null);
    setPressedFinger(null);
    setLastPressCorrect(null);
  };

  const liveWpm = useMemo(() => {
    if (elapsedMs < 1200 || correctCharsTotal < 3) return 0;
    const minutes = Math.max(elapsedMs / 60000, 1 / 60);
    return Math.round(correctCharsTotal / 5 / minutes);
  }, [correctCharsTotal, elapsedMs]);

  const liveAccuracy = useMemo(() => {
    if (totalKeystrokes === 0) return 100;
    return Math.max(0, Math.min(100, Math.round(((totalKeystrokes - mistakes) / totalKeystrokes) * 100)));
  }, [totalKeystrokes, mistakes]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Top Word of the Day Spotlight + AI Word Generator */}
      {!zenFocusMode && (
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-600 text-white rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 text-white flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-blue-100">
                Word of the Day · {wordOfTheDay.difficulty.charAt(0).toUpperCase() + wordOfTheDay.difficulty.slice(1)}
              </div>
              <div className="flex flex-wrap items-baseline gap-2.5 mt-0.5">
                <span className="text-xl font-bold tracking-tight">{wordOfTheDay.word}</span>
                <span className="font-mono text-xs text-blue-100">{wordOfTheDay.pronunciation}</span>
                <span className="text-white/50" aria-hidden="true">·</span>
                <span className="text-sm font-medium text-amber-200">{wordOfTheDay.hindiMeaning}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDifficultyFilter('all');
                const idx = wordsPool.findIndex((w) => w.id === wordOfTheDay.id);
                setCurrentIndex(idx >= 0 ? idx : 0);
                setTyped('');
                setWordMeaningUnlocked(false);
                stageRef.current?.focus();
              }}
              className="px-3.5 py-2 text-xs font-medium text-white bg-white/15 hover:bg-white/25 border border-white/25 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Practice Word of the Day
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateFreshWords}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-amber-300 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isGenerating ? 'Generating AI Words...' : 'Generate AI Words'}
            </button>
          </div>
        </div>
      )}

      {genError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {genError}
        </div>
      )}

      {/* Filter & Live Stats Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setDifficultyFilter(lvl)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap cursor-pointer ${
                  difficultyFilter === lvl
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setPracticeTargetMode('word')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                practiceTargetMode === 'word'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Word Only
            </button>
            <button
              type="button"
              onClick={() => setPracticeTargetMode('word-and-sentence')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                practiceTargetMode === 'word-and-sentence'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Word + Sentence
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm">
          <div>
            <span className="text-xs text-slate-500 mr-1.5">Word</span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {Math.min(completedWordsInRound.length + (wordMeaningUnlocked ? 0 : 1), ROUND_SIZE)}/{ROUND_SIZE}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 mr-1.5">WPM</span>
            <span className="font-mono font-semibold text-indigo-700 tabular-nums">{liveWpm}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 mr-1.5">Accuracy</span>
            <span className="font-mono font-semibold text-emerald-700 tabular-nums">{liveAccuracy}%</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 mr-1.5">Mastered</span>
            <span className="font-mono font-semibold text-amber-600 tabular-nums">{masteredWords.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowKeyboard((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            {showKeyboard ? 'Hide Keyboard' : 'Show Keyboard'}
          </button>
        </div>
      </div>

      {/* Main Dictionary Typing Stage OR Round Report */}
      {roundCompleted ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Dictionary Round Complete</h2>
                <p className="text-sm text-slate-500">
                  {ROUND_SIZE} vocabulary words typed &amp; reviewed with Hindi meanings.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCurrentIndex((i) => (i + 1) % deck.length);
                resetRound();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Next Vocabulary Round
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/70">
              <div className="text-xs text-indigo-700">Speed</div>
              <div className="font-mono text-3xl font-bold text-indigo-950 mt-1 tabular-nums">
                {roundCompleted.wpm} <span className="text-sm font-sans font-normal text-indigo-700">WPM</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
              <div className="text-xs text-emerald-700">Accuracy</div>
              <div className="font-mono text-3xl font-bold text-emerald-800 mt-1 tabular-nums">
                {roundCompleted.accuracy}%
              </div>
            </div>
            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/70">
              <div className="text-xs text-rose-700">Mistakes</div>
              <div className="font-mono text-3xl font-bold text-rose-700 mt-1 tabular-nums">
                {roundCompleted.mistakes}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70">
              <div className="text-xs text-amber-800">Words Mastered</div>
              <div className="font-mono text-3xl font-bold text-amber-900 mt-1 tabular-nums">
                {ROUND_SIZE}
              </div>
            </div>
          </div>

          {/* Vocabulary Recap Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Words &amp; Meanings Completed in This Round</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {completedWordsInRound.map((w, i) => (
                <div key={`${w.id}-${i}`} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{w.word}</span>
                    <span className="font-mono text-xs text-slate-500">{w.pronunciation}</span>
                  </div>
                  <div className="text-sm font-medium text-indigo-700 mt-1">{w.hindiMeaning}</div>
                  <div className="text-xs text-slate-600 mt-1">{w.definition}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={stageRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          aria-label="Dictionary word typing area. Click and type the displayed English word."
          className={`bg-white border-2 rounded-xl p-6 sm:p-8 focus:outline-none transition-colors cursor-text ${
            wordMeaningUnlocked
              ? 'border-emerald-500 bg-emerald-50/15'
              : 'border-slate-200 focus:border-indigo-600'
          }`}
        >
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className={`font-semibold capitalize ${DIFFICULTY_ACCENTS[currentWord.difficulty]}`}>
                {currentWord.difficulty}
              </span>
              <span aria-hidden="true">·</span>
              <span>{currentWord.partOfSpeech}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-700">{currentWord.pronunciation}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakWord(currentWord.word);
                  stageRef.current?.focus();
                }}
                className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Listen
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Clean Streak: <strong className="text-slate-900 font-mono">{streak}</strong></span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTyped('');
                  setWordMeaningUnlocked(false);
                  setCurrentIndex((i) => (i + 1) % deck.length);
                  stageRef.current?.focus();
                }}
                className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Skip Word
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetRound();
                }}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          {isPaused && (
            <div className="mt-4 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              Clock auto-paused due to inactivity. Type any letter to continue.
            </div>
          )}

          {/* Typing Target Display */}
          <div className="py-7 text-center">
            <div className="text-xs text-slate-500 mb-2">
              {wordMeaningUnlocked
                ? 'Word completed accurately — review its Hindi meaning below!'
                : practiceTargetMode === 'word'
                ? 'Type the English word accurately to unlock its Hindi meaning:'
                : 'Type the word and example sentence accurately to unlock its meaning:'}
            </div>

            <div
              className={`font-mono tracking-wide select-none break-words ${
                practiceTargetMode === 'word'
                  ? 'text-4xl sm:text-5xl font-bold'
                  : 'text-xl sm:text-2xl font-medium leading-relaxed max-w-3xl mx-auto'
              }`}
            >
              {expectedText.split('').map((char, idx) => {
                const isTyped = idx < typed.length;
                const isCurrent = !wordMeaningUnlocked && idx === typed.length;

                let cls = 'text-slate-400';
                if (isTyped) {
                  cls =
                    typed[idx] === char
                      ? 'text-emerald-600'
                      : 'text-red-600 bg-red-50 underline decoration-red-500 rounded';
                } else if (isCurrent) {
                  cls = 'text-slate-950 bg-indigo-100 rounded relative';
                }

                return (
                  <span key={idx} className={cls}>
                    {isCurrent && (
                      <span
                        aria-hidden="true"
                        className="typing-caret absolute left-0 top-1 bottom-1 w-[2.5px] bg-indigo-600"
                      />
                    )}
                    {char}
                  </span>
                );
              })}
            </div>

            {!wordMeaningUnlocked && typed.length > 0 && typed.length === expectedText.length && typed !== expectedText && (
              <p className="text-xs text-red-600 font-medium mt-3">
                Press Backspace to fix the highlighted mistake so the word is typed correctly.
              </p>
            )}
          </div>

          {/* Meaning Section: English Definition clue during typing -> Full Hindi Meaning + Example unlocked on completion! */}
          {wordMeaningUnlocked ? (
            <div className="pt-5 border-t border-emerald-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Meaning Unlocked for &ldquo;{currentWord.word}&rdquo;</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    advanceAfterMeaning();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                >
                  <span>
                    {completedWordsInRound.length >= ROUND_SIZE
                      ? 'View Round Summary (Enter)'
                      : 'Next Word (Enter)'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="text-xs font-medium text-amber-800">Hindi Meaning (हिंदी अर्थ)</div>
                  <div className="text-xl sm:text-2xl font-semibold text-slate-900 mt-1">
                    {currentWord.hindiMeaning}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Pronunciation: <span className="font-medium">{currentWord.hindiTransliteration}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200">
                  <div className="text-xs font-medium text-indigo-800">English Meaning &amp; Usage</div>
                  <p className="text-sm sm:text-base text-slate-900 mt-1 leading-relaxed">
                    {currentWord.definition}
                  </p>
                  <p className="text-xs text-slate-600 mt-2 italic">
                    &ldquo;{currentWord.exampleSentence}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5 border-t border-slate-100">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-xs font-medium text-slate-500">Short English Definition</div>
                <p className="text-sm sm:text-base text-slate-900 mt-1 leading-relaxed">
                  {currentWord.definition}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/40 border border-dashed border-indigo-200 flex items-center gap-3 text-indigo-900">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-indigo-900">
                    Hindi Meaning &amp; Example Sentence
                  </div>
                  <div className="text-xs text-indigo-700/85 mt-0.5">
                    Complete typing <span className="font-mono font-semibold">{currentWord.word}</span> accurately to reveal its Hindi meaning.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showKeyboard && !roundCompleted && !wordMeaningUnlocked && (
        <VirtualKeyboard
          targetChar={expectedText[typed.length]}
          pressedKeyId={pressedKeyId}
          pressedFinger={pressedFinger}
          lastPressCorrect={lastPressCorrect}
          showHands={false}
          compact={true}
        />
      )}
    </div>
  );
};
