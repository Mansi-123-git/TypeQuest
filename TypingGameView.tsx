import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Clock, Flame, Heart, Pause, Play, RotateCcw, Sparkles, Swords, Zap } from 'lucide-react';
import { STARTER_DICTIONARY } from '../data/dictionary';
import type { DictionaryWord, DifficultyLevel, TypingSessionResult } from '../types/typing';
import { playKeySound } from '../utils/sound';
import { loadGameHighScore, saveGameHighScore } from '../utils/storage';

interface TypingGameViewProps {
  soundEnabled: boolean;
  isExternallyPaused: boolean;
  zenFocusMode: boolean;
  onSessionComplete: (result: TypingSessionResult) => void;
}

type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type GameModeType = 'arcade' | 'vocabulary';
type RuleMode = 'sudden-death' | 'three-lives';
type FruitKind = 'watermelon' | 'orange' | 'apple' | 'mango' | 'berry' | 'golden' | 'ice';

interface FruitStyle {
  kind: FruitKind;
  emoji: string;
  juiceHex: string;
  bgClass: string;
}

const FRUIT_STYLES: FruitStyle[] = [
  { kind: 'watermelon', emoji: '🍉', juiceHex: '#ef4444', bgClass: 'from-rose-500 to-emerald-600' },
  { kind: 'orange', emoji: '🍊', juiceHex: '#f97316', bgClass: 'from-orange-400 to-amber-500' },
  { kind: 'apple', emoji: '🍎', juiceHex: '#dc2626', bgClass: 'from-red-500 to-rose-600' },
  { kind: 'mango', emoji: '🥭', juiceHex: '#eab308', bgClass: 'from-amber-400 to-yellow-500' },
  { kind: 'berry', emoji: '🍇', juiceHex: '#8b5cf6', bgClass: 'from-violet-500 to-purple-600' },
];

const GOLDEN_FRUIT: FruitStyle = {
  kind: 'golden',
  emoji: '🌟',
  juiceHex: '#facc15',
  bgClass: 'from-amber-300 to-yellow-500',
};

const ICE_FRUIT: FruitStyle = {
  kind: 'ice',
  emoji: '🫐',
  juiceHex: '#38bdf8',
  bgClass: 'from-sky-400 to-cyan-500',
};

interface FlyingFruit {
  uid: string;
  text: string;
  x: number;
  y: number;
  targetY: number;
  phase: number;
  rotation: number;
  vRot: number;
  timeLeft: number;
  maxTime: number;
  fruit: FruitStyle;
  dictEntry?: DictionaryWord;
}

interface SlicedEffect {
  uid: string;
  x: number;
  y: number;
  text: string;
  points: number;
  fruit: FruitStyle;
  hindi?: string;
  age: number;
}

interface EngineState {
  status: GameState;
  fruits: FlyingFruit[];
  slicedEffects: SlicedEffect[];
  activeTargetId: string | null;
  typedBuffer: string;
  score: number;
  lives: number;
  combo: number;
  bestCombo: number;
  wordsCleared: number;
  totalKeystrokes: number;
  correctChars: number;
  mistakes: number;
  elapsedPlaySec: number;
  slowMoLeft: number;
  spawnTimer: number;
  outReason: string;
  lastSlicedBanner: { word: string; points: number; hindi?: string } | null;
}

const ARCADE_WORDS: Record<DifficultyLevel, string[]> = {
  beginner: [
    'home', 'desk', 'lamp', 'fast', 'calm', 'hand', 'mind', 'book', 'star', 'rain',
    'tree', 'work', 'play', 'note', 'page', 'step', 'road', 'wind', 'time', 'word',
    'lime', 'pear', 'plum', 'kiwi', 'date', 'fig', 'mint', 'leaf', 'seed', 'stem',
  ],
  intermediate: [
    'slice', 'melon', 'mango', 'peach', 'berry', 'citrus', 'splash', 'blade', 'flash',
    'rhythm', 'steady', 'bright', 'stream', 'orchard', 'harvest', 'nectar', 'crisp',
    'polish', 'swift', 'golden', 'shadow', 'breeze', 'summit', 'velvet', 'spark',
  ],
  advanced: [
    'ephemeral', 'ubiquitous', 'equanimity', 'eloquent', 'meticulous', 'pragmatic',
    'catalyst', 'synthesize', 'trajectory', 'labyrinth', 'kaleidoscope', 'resilient',
    'perspicacious', 'equilibrium', 'quintessential', 'momentum', 'discernment', 'fortitude',
  ],
};

function getComboMultiplier(combo: number): number {
  if (combo >= 15) return 5;
  if (combo >= 10) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

function createInitialEngine(lives: number): EngineState {
  return {
    status: 'TITLE_MENU',
    fruits: [],
    slicedEffects: [],
    activeTargetId: null,
    typedBuffer: '',
    score: 0,
    lives,
    combo: 0,
    bestCombo: 0,
    wordsCleared: 0,
    totalKeystrokes: 0,
    correctChars: 0,
    mistakes: 0,
    elapsedPlaySec: 0,
    slowMoLeft: 0,
    spawnTimer: 0,
    outReason: '',
    lastSlicedBanner: null,
  };
}

export const TypingGameView: React.FC<TypingGameViewProps> = ({
  soundEnabled,
  isExternallyPaused,
  zenFocusMode,
  onSessionComplete,
}) => {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [gameMode, setGameMode] = useState<GameModeType>('arcade');
  const [ruleMode, setRuleMode] = useState<RuleMode>('sudden-death');
  const [givenCutSeconds, setGivenCutSeconds] = useState<number>(4);
  const [highScore, setHighScore] = useState<number>(() => loadGameHighScore());
  const [missFlash, setMissFlash] = useState<boolean>(false);

  const engineRef = useRef<EngineState>(createInitialEngine(1));
  const [ui, setUi] = useState<EngineState>(() => createInitialEngine(1));

  const arenaRef = useRef<HTMLDivElement>(null);
  const lastFrameRef = useRef<number | null>(null);

  const syncUi = useCallback(() => {
    const s = engineRef.current;
    setUi({
      ...s,
      fruits: [...s.fruits],
      slicedEffects: [...s.slicedEffects],
    });
  }, []);

  const createFruit = useCallback(
    (existingFruits: FlyingFruit[], wordsCleared: number): FlyingFruit => {
      const usedFirstChars = new Set(existingFruits.map((f) => f.text[0]?.toLowerCase()));
      let text = 'slice';
      let dictEntry: DictionaryWord | undefined;

      if (gameMode === 'vocabulary') {
        const pool = STARTER_DICTIONARY.filter((d) =>
          difficulty === 'beginner' ? d.difficulty !== 'advanced' : true
        );
        const candidates = pool.filter((d) => !usedFirstChars.has(d.word[0]));
        const pickFrom = candidates.length > 0 ? candidates : pool;
        dictEntry = pickFrom[Math.floor(Math.random() * pickFrom.length)];
        text = dictEntry.word;
      } else {
        const pool = ARCADE_WORDS[difficulty];
        const candidates = pool.filter((w) => !usedFirstChars.has(w[0]));
        const pickFrom = candidates.length > 0 ? candidates : pool;
        text = pickFrom[Math.floor(Math.random() * pickFrom.length)];
      }

      const roll = Math.random();
      const fruit =
        roll < 0.09
          ? GOLDEN_FRUIT
          : roll < 0.17
          ? ICE_FRUIT
          : FRUIT_STYLES[Math.floor(Math.random() * FRUIT_STYLES.length)];

      let x = 16 + Math.random() * 68;
      for (let attempt = 0; attempt < 6; attempt++) {
        const candidateX = 15 + Math.random() * 70;
        const tooClose = existingFruits.some((cf) => Math.abs(cf.x - candidateX) < 16);
        if (!tooClose) {
          x = candidateX;
          break;
        }
      }

      const wave = Math.floor(wordsCleared / 6) + 1;
      const targetY = 20 + Math.random() * 38;
      const waveReduction = Math.min(1.5, (wave - 1) * 0.2);
      const maxTime = Math.max(2.2, givenCutSeconds - waveReduction);

      return {
        uid: `fruit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        x,
        y: 94,
        targetY,
        phase: Math.random() * Math.PI * 2,
        rotation: (Math.random() - 0.5) * 18,
        vRot: (Math.random() - 0.5) * 30,
        timeLeft: maxTime,
        maxTime,
        fruit,
        dictEntry,
      };
    },
    [difficulty, gameMode, givenCutSeconds]
  );

  const finalizeGameOver = useCallback(
    (reason: string) => {
      const s = engineRef.current;
      if (s.status === 'GAME_OVER') return;

      s.status = 'GAME_OVER';
      s.outReason = reason;

      const updatedHigh = saveGameHighScore(s.score);
      setHighScore(updatedHigh);

      const durationSeconds = Math.max(1, Math.round(s.elapsedPlaySec));
      const minutes = Math.max(s.elapsedPlaySec / 60, 1 / 60);
      const wpm = Math.max(0, Math.round(s.correctChars / 5 / minutes));
      const rawWpm = Math.max(0, Math.round(s.totalKeystrokes / 5 / minutes));
      const accuracy =
        s.totalKeystrokes > 0
          ? Math.max(
              0,
              Math.min(100, Math.round(((s.totalKeystrokes - s.mistakes) / s.totalKeystrokes) * 100))
            )
          : 100;

      syncUi();

      onSessionComplete({
        id: `game-${Date.now()}`,
        mode: 'game',
        title: `Fruit Word Slicer (${difficulty})`,
        level: difficulty,
        wpm,
        rawWpm,
        accuracy,
        mistakes: s.mistakes,
        correctChars: s.correctChars,
        totalChars: s.totalKeystrokes,
        durationSeconds,
        keyErrors: {},
        timestamp: new Date().toISOString(),
      });
    },
    [difficulty, onSessionComplete, syncUi]
  );

  useEffect(() => {
    if (isExternallyPaused && engineRef.current.status === 'PLAYING') {
      engineRef.current.status = 'PAUSED';
      syncUi();
    }
  }, [isExternallyPaused, syncUi]);

  const startGame = useCallback(() => {
    const initialLives = ruleMode === 'sudden-death' ? 1 : 3;
    const fresh = createInitialEngine(initialLives);
    fresh.status = 'PLAYING';
    fresh.fruits = [createFruit([], 0)];
    engineRef.current = fresh;
    lastFrameRef.current = null;
    setMissFlash(false);
    syncUi();
    window.setTimeout(() => arenaRef.current?.focus(), 40);
  }, [createFruit, ruleMode, syncUi]);

  const returnToMenu = useCallback(() => {
    const fresh = createInitialEngine(ruleMode === 'sudden-death' ? 1 : 3);
    engineRef.current = fresh;
    lastFrameRef.current = null;
    syncUi();
  }, [ruleMode, syncUi]);

  const setPaused = useCallback(
    (pause: boolean) => {
      const s = engineRef.current;
      if (pause && s.status === 'PLAYING') {
        s.status = 'PAUSED';
        syncUi();
      } else if (!pause && s.status === 'PAUSED') {
        s.status = 'PLAYING';
        lastFrameRef.current = null;
        syncUi();
        arenaRef.current?.focus();
      }
    },
    [syncUi]
  );

  // 60fps Deterministic Game Loop (single engineRef source of truth)
  useEffect(() => {
    if (ui.status !== 'PLAYING') {
      lastFrameRef.current = null;
      return;
    }

    let rafId = 0;

    const tick = (now: number) => {
      const s = engineRef.current;
      if (s.status !== 'PLAYING') return;

      if (lastFrameRef.current === null) {
        lastFrameRef.current = now;
      }
      const rawDt = Math.min(0.08, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      s.elapsedPlaySec += rawDt;

      if (s.slowMoLeft > 0) {
        s.slowMoLeft = Math.max(0, s.slowMoLeft - rawDt);
      }

      const timerScale = s.slowMoLeft > 0 ? 0.45 : 1;
      const wave = Math.floor(s.wordsCleared / 6) + 1;
      s.spawnTimer += rawDt;
      const spawnInterval = Math.max(0.95, 1.85 - wave * 0.1);

      const expiredWords: string[] = [];

      s.fruits = s.fruits
        .map((f) => {
          const dy = f.targetY - f.y;
          const nextPhase = f.phase + rawDt * 3.0;
          const bob = Math.sin(nextPhase) * 0.45;
          const nextY = Math.abs(dy) > 0.5 ? f.y + dy * Math.min(1, rawDt * 7.5) : f.targetY + bob;
          return {
            ...f,
            y: nextY,
            phase: nextPhase,
            rotation: f.rotation + f.vRot * rawDt,
            timeLeft: f.timeLeft - rawDt * timerScale,
          };
        })
        .filter((f) => {
          if (f.timeLeft <= 0) {
            expiredWords.push(f.text);
            if (f.uid === s.activeTargetId) {
              s.activeTargetId = null;
              s.typedBuffer = '';
            }
            return false;
          }
          return true;
        });

      s.slicedEffects = s.slicedEffects
        .map((ef) => ({ ...ef, age: ef.age + rawDt }))
        .filter((ef) => ef.age < 0.8);

      if (expiredWords.length > 0) {
        if (soundEnabled) playKeySound('error');
        s.combo = 0;
        s.lives = Math.max(0, s.lives - expiredWords.length);
        setMissFlash(true);
        window.setTimeout(() => setMissFlash(false), 280);

        if (s.lives <= 0) {
          finalizeGameOver(`Out! You did not cut "${expiredWords[0]}" in time.`);
          return;
        }
      }

      if ((s.spawnTimer >= spawnInterval && s.fruits.length < 4) || s.fruits.length === 0) {
        s.spawnTimer = 0;
        s.fruits.push(createFruit(s.fruits, s.wordsCleared));
      }

      syncUi();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [ui.status, createFruit, finalizeGameOver, soundEnabled, syncUi]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const s = engineRef.current;
    if (s.status !== 'PLAYING' || isExternallyPaused) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'Escape') {
      s.activeTargetId = null;
      s.typedBuffer = '';
      syncUi();
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (s.typedBuffer.length <= 1) {
        s.activeTargetId = null;
        s.typedBuffer = '';
      } else {
        s.typedBuffer = s.typedBuffer.slice(0, -1);
      }
      syncUi();
      return;
    }

    if (e.key.length !== 1) return;

    e.preventDefault();
    const char = e.key.toLowerCase();
    s.totalKeystrokes += 1;

    if (s.activeTargetId) {
      const target = s.fruits.find((f) => f.uid === s.activeTargetId);
      if (!target) {
        s.activeTargetId = null;
        s.typedBuffer = '';
        syncUi();
        return;
      }

      const nextExpected = target.text[s.typedBuffer.length]?.toLowerCase();
      if (char === nextExpected) {
        s.typedBuffer += char;
        s.correctChars += 1;
        const activeMult = getComboMultiplier(s.combo);
        const keyPoints = 10 * activeMult;
        s.score += keyPoints;
        if (soundEnabled) playKeySound('correct');

        if (s.typedBuffer.length >= target.text.length) {
          // SLICE COMPLETE: Speed + Slice Completion Bonus
          s.combo += 1;
          s.bestCombo = Math.max(s.bestCombo, s.combo);
          const multiplier = getComboMultiplier(s.combo);
          const sliceBonus = 25;
          const speedBonus = Math.max(0, Math.round(target.timeLeft * 10));
          const specialBonus =
            target.fruit.kind === 'golden' ? 150 : target.fruit.kind === 'ice' ? 80 : 0;
          const finishPoints = (sliceBonus + speedBonus + specialBonus) * multiplier;
          const totalFruitPoints = finishPoints + target.text.length * keyPoints;

          s.score += finishPoints;
          s.wordsCleared += 1;

          if (s.score > highScore) {
            const saved = saveGameHighScore(s.score);
            setHighScore(saved);
          }

          s.fruits = s.fruits.filter((f) => f.uid !== target.uid);

          if (target.fruit.kind === 'ice') {
            s.slowMoLeft = 4.0;
            s.fruits = s.fruits.map((rf) => ({
              ...rf,
              timeLeft: Math.min(rf.maxTime + 2.5, rf.timeLeft + 2.5),
            }));
          } else if (target.fruit.kind === 'golden' && ruleMode === 'three-lives') {
            s.lives = Math.min(3, s.lives + 1);
          }

          s.slicedEffects.push({
            uid: `slice-${target.uid}`,
            x: target.x,
            y: target.y,
            text: target.text,
            points: totalFruitPoints,
            fruit: target.fruit,
            hindi: target.dictEntry?.hindiMeaning,
            age: 0,
          });

          s.activeTargetId = null;
          s.typedBuffer = '';
          s.lastSlicedBanner = {
            word: target.text,
            points: totalFruitPoints,
            hindi: target.dictEntry?.hindiMeaning,
          };

          if (soundEnabled) playKeySound('complete');
        }
      } else {
        s.mistakes += 1;
        s.combo = 0;
        if (soundEnabled) playKeySound('error');
      }

      if (s.score > highScore) {
        const saved = saveGameHighScore(s.score);
        setHighScore(saved);
      }

      syncUi();
      return;
    }

    // Auto-target most urgent fruit matching first character
    const matching = s.fruits
      .filter((f) => f.text[0]?.toLowerCase() === char)
      .sort((a, b) => a.timeLeft - b.timeLeft);

    if (matching.length > 0) {
      s.activeTargetId = matching[0].uid;
      s.typedBuffer = char;
      s.correctChars += 1;
      s.score += 10 * getComboMultiplier(s.combo);
      if (s.score > highScore) {
        const saved = saveGameHighScore(s.score);
        setHighScore(saved);
      }
      if (soundEnabled) playKeySound('correct');
    } else {
      s.mistakes += 1;
      s.combo = 0;
      if (soundEnabled) playKeySound('error');
    }

    syncUi();
  };

  const multiplier = getComboMultiplier(ui.combo);
  const maxLives = ruleMode === 'sudden-death' ? 1 : 3;
  const lowestTimeLeft =
    ui.fruits.length > 0 ? Math.min(...ui.fruits.map((f) => f.timeLeft)) : null;

  const accuracyPct =
    ui.totalKeystrokes > 0
      ? Math.max(0, Math.min(100, Math.round(((ui.totalKeystrokes - ui.mistakes) / ui.totalKeystrokes) * 100)))
      : 100;

  const liveWpm =
    ui.elapsedPlaySec > 0.8
      ? Math.round(ui.correctChars / 5 / Math.max(ui.elapsedPlaySec / 60, 1 / 60))
      : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Top Game HUD */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5 sm:gap-6">
          <div>
            <div className="text-xs text-slate-500">Score</div>
            <div className="font-mono text-2xl font-bold text-indigo-700 tabular-nums">{ui.score}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Combo</div>
            <div className="font-mono text-xl font-bold text-amber-600 tabular-nums inline-flex items-center gap-1">
              <Flame className="w-4 h-4" />
              {ui.combo} <span className="text-xs text-slate-500">({multiplier}x)</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Accuracy</div>
            <div className="font-mono text-xl font-semibold text-emerald-700 tabular-nums">{accuracyPct}%</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Next Cutoff</div>
            <div
              className={`font-mono text-xl font-bold tabular-nums inline-flex items-center gap-1 ${
                lowestTimeLeft !== null && lowestTimeLeft <= 2.2
                  ? 'text-rose-600'
                  : 'text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              {lowestTimeLeft !== null ? `${Math.max(0, lowestTimeLeft).toFixed(1)}s` : `${givenCutSeconds}.0s`}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">
              {ruleMode === 'sudden-death' ? 'Sudden Death' : 'Lives'}
            </div>
            <div className="flex items-center gap-1 mt-1" aria-label={`${ui.lives} chances remaining`}>
              {Array.from({ length: maxLives }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-4 h-4 ${
                    i < ui.lives ? 'text-rose-500 fill-rose-500' : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
          {!zenFocusMode && (
            <div>
              <div className="text-xs text-slate-500">Best Score</div>
              <div className="font-mono text-lg font-semibold text-emerald-700 tabular-nums">{highScore}</div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {ui.status === 'PLAYING' && (
            <button
              type="button"
              onClick={() => setPaused(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>
          )}
          {ui.status === 'PAUSED' && (
            <button
              type="button"
              onClick={() => setPaused(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Resume
            </button>
          )}
          {ui.status !== 'TITLE_MENU' && (
            <button
              type="button"
              onClick={returnToMenu}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Menu
            </button>
          )}
        </div>
      </div>

      {/* Wooden Dojo Fruit Slicer Arena */}
      <div
        ref={arenaRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Fruit Word Slicer Game Arena. Click here and type words on fruits before their countdown ends."
        className={`relative h-[490px] rounded-2xl overflow-hidden border-2 transition-colors focus:outline-none select-none ${
          missFlash
            ? 'border-red-500 bg-gradient-to-b from-amber-950 via-red-950 to-stone-950'
            : 'border-amber-900/60 focus:border-amber-400 bg-[radial-gradient(circle_at_top,_#451a03_0%,_#29150b_55%,_#1c1008_100%)]'
        }`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 96px)',
          }}
        />

        {/* Bottom Status Bar */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-black/40 border-t border-amber-500/20 px-5 flex items-center justify-between text-xs text-amber-100/85 z-20">
          <span className="inline-flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            +10/letter · +25 slice · +10/sec left · up to 5x combo
          </span>
          {ui.slowMoLeft > 0 && (
            <span className="text-sky-300 font-semibold inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Ice Freeze ({Math.ceil(ui.slowMoLeft)}s)
            </span>
          )}
          {ui.lastSlicedBanner && (
            <span className="text-emerald-300 font-semibold">
              Sliced +{ui.lastSlicedBanner.points} · {ui.lastSlicedBanner.word}
              {ui.lastSlicedBanner.hindi ? ` (${ui.lastSlicedBanner.hindi})` : ''}
            </span>
          )}
        </div>

        {/* Juice Splashes, Split Fruit Halves & Blade Slash Animations */}
        {ui.slicedEffects.map((ef) => {
          const progress = Math.min(1, ef.age / 0.75);
          const opacity = Math.max(0, 1 - progress);
          const splitDist = progress * 44;

          return (
            <div
              key={ef.uid}
              style={{
                left: `${ef.x}%`,
                top: `${ef.y}%`,
                opacity,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute pointer-events-none z-30"
            >
              <div
                style={{
                  backgroundColor: ef.fruit.juiceHex,
                  transform: `scale(${0.6 + progress * 1.4})`,
                  opacity: opacity * 0.45,
                }}
                className="w-20 h-20 rounded-full blur-xs -translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2"
              />
              <div
                style={{
                  transform: `translate(-50%, -50%) rotate(-32deg) scaleX(${Math.min(1, progress * 4)})`,
                }}
                className="absolute left-1/2 top-1/2 w-28 h-1 bg-white rounded-full shadow-[0_0_12px_#ffffff]"
              />
              <div
                style={{
                  transform: `translate(${-splitDist}px, ${progress * 26}px) rotate(${-progress * 45}deg)`,
                }}
                className="inline-block text-3xl mr-1"
              >
                {ef.fruit.emoji}
              </div>
              <div
                style={{
                  transform: `translate(${splitDist}px, ${progress * 26}px) rotate(${progress * 45}deg)`,
                }}
                className="inline-block text-3xl ml-1"
              >
                {ef.fruit.emoji}
              </div>
              <div
                style={{ transform: `translateY(${-progress * 34}px)` }}
                className="text-center font-mono text-sm font-bold text-amber-300 drop-shadow mt-1 whitespace-nowrap"
              >
                +{ef.points}!
                {ef.hindi && (
                  <span className="block text-xs font-sans text-white">{ef.hindi}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Active Fruits with Visible Cut Countdown Timer Bar */}
        {(ui.status === 'PLAYING' || ui.status === 'PAUSED') &&
          ui.fruits.map((f) => {
            const isTarget = f.uid === ui.activeTargetId;
            const matchedPart = isTarget ? f.text.slice(0, ui.typedBuffer.length) : '';
            const restPart = isTarget ? f.text.slice(ui.typedBuffer.length) : f.text;
            const pct = Math.max(0, Math.min(100, (f.timeLeft / f.maxTime) * 100));
            const isUrgent = f.timeLeft <= 2.2;

            return (
              <div
                key={f.uid}
                style={{
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute flex flex-col items-center ${isTarget ? 'z-20' : 'z-10'}`}
              >
                <div
                  style={{ transform: `rotate(${f.rotation}deg)` }}
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${f.fruit.bgClass} flex items-center justify-center text-3xl shadow-lg border-2 ${
                    isTarget
                      ? 'border-emerald-300 ring-4 ring-emerald-400/50 scale-110'
                      : isUrgent
                      ? 'border-rose-400 ring-4 ring-rose-500/40'
                      : 'border-white/40'
                  }`}
                >
                  <span>{f.fruit.emoji}</span>
                </div>

                <div
                  className={`-mt-2 px-3 py-1 rounded-lg font-mono text-sm sm:text-base font-bold shadow-md border min-w-[92px] text-center ${
                    isTarget
                      ? 'bg-slate-950 border-emerald-400 text-white'
                      : isUrgent
                      ? 'bg-rose-950 border-rose-400 text-white'
                      : f.fruit.kind === 'golden'
                      ? 'bg-amber-950 border-amber-300 text-amber-200'
                      : f.fruit.kind === 'ice'
                      ? 'bg-sky-950 border-sky-300 text-sky-100'
                      : 'bg-slate-950/90 border-white/25 text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {f.fruit.kind === 'golden' && !isTarget && (
                      <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    )}
                    <span>
                      <span className="text-emerald-400">{matchedPart}</span>
                      <span>{restPart}</span>
                    </span>
                    <span className={`text-[11px] font-normal tabular-nums ${isUrgent ? 'text-rose-300' : 'text-slate-400'}`}>
                      {Math.max(0, f.timeLeft).toFixed(1)}s
                    </span>
                  </div>

                  <div className="mt-1 h-1 w-full bg-white/15 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-none ${
                        isUrgent ? 'bg-rose-500' : isTarget ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

        {/* TITLE MENU OVERLAY */}
        {ui.status === 'TITLE_MENU' && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-xs z-30 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full text-center shadow-2xl">
              <div className="text-3xl mb-1">🍉 🍊 🍎</div>
              <h1 className="text-2xl font-bold text-slate-900">Fruit Word Slicer</h1>
              <p className="text-sm text-slate-600 mt-1">
                Slice every fruit by typing its word before the countdown timer reaches zero!
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-left">
                <button
                  type="button"
                  onClick={() => setGameMode('arcade')}
                  className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                    gameMode === 'arcade'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">Classic Fruit Slice</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Fast, fun arcade words</div>
                </button>
                <button
                  type="button"
                  onClick={() => setGameMode('vocabulary')}
                  className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                    gameMode === 'vocabulary'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-950'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">Hindi Vocabulary Slice</div>
                  <div className="text-[11px] opacity-75 mt-0.5">Shows Hindi meaning on slice</div>
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-left">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-medium text-slate-600 mb-1.5">Time to Cut Each Fruit</div>
                  <div className="flex gap-1">
                    {[3, 4, 6].map((secs) => (
                      <button
                        key={secs}
                        type="button"
                        onClick={() => setGivenCutSeconds(secs)}
                        className={`flex-1 py-1 text-xs font-medium rounded-md cursor-pointer ${
                          givenCutSeconds === secs
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        {secs}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-medium text-slate-600 mb-1.5">Miss Rule</div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setRuleMode('sudden-death')}
                      className={`flex-1 py-1 text-xs font-medium rounded-md cursor-pointer ${
                        ruleMode === 'sudden-death'
                          ? 'bg-rose-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      1 Miss = Out
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleMode('three-lives')}
                      className={`flex-1 py-1 text-xs font-medium rounded-md cursor-pointer ${
                        ruleMode === 'three-lives'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      3 Lives
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors cursor-pointer ${
                      difficulty === lvl
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={startGame}
                className="mt-4 w-full py-2.5 px-5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-700 hover:to-rose-700 rounded-xl transition-colors cursor-pointer"
              >
                Start Slicing
              </button>
            </div>
          </div>
        )}

        {/* PAUSED OVERLAY */}
        {ui.status === 'PAUSED' && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs z-30">
            <div className="bg-white rounded-2xl p-6 text-center max-w-xs w-full shadow-xl">
              <h2 className="text-lg font-semibold text-slate-900">Game Paused</h2>
              <p className="text-xs text-slate-500 mt-1">Click Resume to keep slicing flying words.</p>
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="mt-4 w-full py-2 px-4 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                Resume Game
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER ("OUT!") OVERLAY */}
        {ui.status === 'GAME_OVER' && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs z-30">
            <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full text-center shadow-2xl">
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                <Award className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-3">Game Over — You&apos;re Out!</h2>
              <p className="text-sm text-rose-700 font-medium mt-1">
                {ui.outReason || 'Time ran out before slicing the fruit.'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Sliced {ui.wordsCleared} fruits · {accuracyPct}% accuracy · Best combo {ui.bestCombo}x
              </p>

              <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                  <div className="text-[11px] text-indigo-700">Score</div>
                  <div className="font-mono text-xl font-bold text-indigo-950 tabular-nums">{ui.score}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[11px] text-emerald-700">Speed</div>
                  <div className="font-mono text-xl font-bold text-emerald-900 tabular-nums">{liveWpm} WPM</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="text-[11px] text-amber-700">High Score</div>
                  <div className="font-mono text-xl font-bold text-amber-900 tabular-nums">{highScore}</div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={startGame}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                >
                  Play Again
                </button>
                <button
                  type="button"
                  onClick={returnToMenu}
                  className="py-2.5 px-4 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
