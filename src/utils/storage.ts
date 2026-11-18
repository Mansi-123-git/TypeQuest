import type { FocusSettings, TypingSessionResult } from '../types/typing';

const SESSIONS_KEY = 'typequest_sessions_v1';
const FOCUS_SETTINGS_KEY = 'typequest_focus_settings_v2';
const MASTERED_WORDS_KEY = 'typequest_mastered_words_v1';
const GAME_HIGH_SCORE_KEY = 'typequest_game_highscore_v1';

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = {
  zenFocusMode: false,
  screenTimeoutMinutes: 30,
  inactivityPauseSeconds: 30,
  keepScreenAwake: false,
  soundEnabled: true,
};

export function loadGameHighScore(): number {
  try {
    const raw = localStorage.getItem(GAME_HIGH_SCORE_KEY);
    return raw ? Math.max(0, Number(raw) || 0) : 0;
  } catch {
    return 0;
  }
}

export function saveGameHighScore(score: number): number {
  const best = Math.max(score, loadGameHighScore());
  try {
    localStorage.setItem(GAME_HIGH_SCORE_KEY, String(best));
  } catch {
    // ignore
  }
  return best;
}

export function loadSessions(): TypingSessionResult[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(result: TypingSessionResult): TypingSessionResult[] {
  const existing = loadSessions();
  const updated = [result, ...existing].slice(0, 100);
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
  return updated;
}

export function clearAllSessions(): TypingSessionResult[] {
  try {
    localStorage.removeItem(SESSIONS_KEY);
  } catch {
    // ignore
  }
  return [];
}

export function loadFocusSettings(): FocusSettings {
  try {
    const raw = localStorage.getItem(FOCUS_SETTINGS_KEY);
    if (!raw) return DEFAULT_FOCUS_SETTINGS;
    return { ...DEFAULT_FOCUS_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FOCUS_SETTINGS;
  }
}

export function saveFocusSettings(settings: FocusSettings): void {
  try {
    localStorage.setItem(FOCUS_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadMasteredWords(): string[] {
  try {
    const raw = localStorage.getItem(MASTERED_WORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addMasteredWord(word: string): string[] {
  const normalized = word.trim().toLowerCase();
  const existing = loadMasteredWords();
  if (existing.includes(normalized)) return existing;
  const updated = [normalized, ...existing].slice(0, 500);
  try {
    localStorage.setItem(MASTERED_WORDS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function aggregateWeakKeys(sessions: TypingSessionResult[]): { key: string; errors: number }[] {
  const counts: Record<string, number> = {};
  for (const session of sessions) {
    if (!session.keyErrors) continue;
    for (const [k, v] of Object.entries(session.keyErrors)) {
      const normalized = k === ' ' ? 'Space' : k;
      counts[normalized] = (counts[normalized] || 0) + v;
    }
  }
  return Object.entries(counts)
    .map(([key, errors]) => ({ key, errors }))
    .sort((a, b) => b.errors - a.errors)
    .slice(0, 8);
}
