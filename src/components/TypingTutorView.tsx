import React, { useMemo, useState } from 'react';
import { TYPING_LESSONS } from '../data/lessons';
import type { DifficultyLevel, LessonCategory, TypingLesson, TypingSessionResult } from '../types/typing';
import { TypingEngine } from './TypingEngine';

interface TypingTutorViewProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  inactivityPauseSeconds: number;
  isExternallyPaused: boolean;
  zenFocusMode: boolean;
  onSessionComplete: (result: TypingSessionResult) => void;
  customDrillLesson?: TypingLesson | null;
  onClearCustomDrill?: () => void;
  completedLessonIds: string[];
}

const LEVEL_LABELS: Record<DifficultyLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const CATEGORY_LABELS: Record<'all' | LessonCategory, string> = {
  all: 'All Lessons',
  'home-row': 'Home Row',
  'upper-row': 'Upper Row',
  'lower-row': 'Lower Row',
  words: 'Words',
  sentences: 'Sentences',
  paragraphs: 'Paragraphs',
};

export const TypingTutorView: React.FC<TypingTutorViewProps> = ({
  soundEnabled,
  onToggleSound,
  inactivityPauseSeconds,
  isExternallyPaused,
  zenFocusMode,
  onSessionComplete,
  customDrillLesson,
  onClearCustomDrill,
  completedLessonIds,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'all' | DifficultyLevel>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | LessonCategory>('all');
  const [activeLessonId, setActiveLessonId] = useState<string>(TYPING_LESSONS[0].id);

  const filteredLessons = useMemo(() => {
    return TYPING_LESSONS.filter((lesson) => {
      if (selectedLevel !== 'all' && lesson.level !== selectedLevel) return false;
      if (selectedCategory !== 'all' && lesson.category !== selectedCategory) return false;
      return true;
    });
  }, [selectedLevel, selectedCategory]);

  const activeLesson: TypingLesson = useMemo(() => {
    if (customDrillLesson) return customDrillLesson;
    return (
      TYPING_LESSONS.find((l) => l.id === activeLessonId) ||
      filteredLessons[0] ||
      TYPING_LESSONS[0]
    );
  }, [activeLessonId, customDrillLesson, filteredLessons]);

  const handleNextLesson = () => {
    if (customDrillLesson && onClearCustomDrill) {
      onClearCustomDrill();
      return;
    }
    const idx = TYPING_LESSONS.findIndex((l) => l.id === activeLesson.id);
    const next = TYPING_LESSONS[(idx + 1) % TYPING_LESSONS.length];
    setActiveLessonId(next.id);
  };

  return (
    <div className={`grid gap-6 ${zenFocusMode ? 'grid-cols-1 max-w-4xl mx-auto' : 'grid-cols-1 lg:grid-cols-12 items-start'}`}>
      {/* Lesson Curriculum Sidebar (hidden in Zen Focus Mode) */}
      {!zenFocusMode && (
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-semibold text-slate-900">Typing Curriculum</h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {completedLessonIds.length}/{TYPING_LESSONS.length} done
            </span>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-3">
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  setSelectedLevel(lvl);
                  if (customDrillLesson && onClearCustomDrill) onClearCustomDrill();
                }}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedLevel === lvl
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lvl === 'all' ? 'All' : LEVEL_LABELS[lvl]}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(['all', 'home-row', 'upper-row', 'lower-row', 'words', 'sentences', 'paragraphs'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Lesson List */}
          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {customDrillLesson && (
              <div className="p-3 rounded-xl border border-blue-300 bg-blue-50/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-blue-900">{customDrillLesson.title}</span>
                  {onClearCustomDrill && (
                    <button
                      type="button"
                      onClick={onClearCustomDrill}
                      className="text-xs text-blue-700 hover:underline cursor-pointer"
                    >
                      Exit Drill
                    </button>
                  )}
                </div>
                <p className="text-xs text-blue-800/80 mt-0.5">{customDrillLesson.subtitle}</p>
              </div>
            )}

            {filteredLessons.map((lesson) => {
              const isActive = !customDrillLesson && activeLesson.id === lesson.id;
              const isDone = completedLessonIds.includes(lesson.title);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => {
                    if (customDrillLesson && onClearCustomDrill) onClearCustomDrill();
                    setActiveLessonId(lesson.id);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-indigo-50/40 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{lesson.title}</span>
                    <span
                      className={`text-[11px] shrink-0 ${
                        isActive ? 'text-indigo-100' : isDone ? 'text-emerald-700 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {isDone ? 'Completed' : `${lesson.targetWpm} WPM`}
                    </span>
                  </div>
                  <div className={`text-xs mt-1 flex items-center gap-1.5 ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                    <span className={
                      isActive
                        ? 'text-white font-medium'
                        : lesson.level === 'beginner'
                        ? 'text-emerald-700 font-medium'
                        : lesson.level === 'intermediate'
                        ? 'text-indigo-700 font-medium'
                        : 'text-violet-700 font-medium'
                    }>
                      {LEVEL_LABELS[lesson.level]}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{CATEGORY_LABELS[lesson.category]}</span>
                  </div>
                </button>
              );
            })}

            {filteredLessons.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-500">
                No lessons match this filter. Try selecting &ldquo;All Lessons&rdquo;.
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Active Typing Practice Stage */}
      <div className={zenFocusMode ? 'w-full' : 'lg:col-span-8'}>
        <TypingEngine
          title={activeLesson.title}
          subtitle={`${LEVEL_LABELS[activeLesson.level]} · ${activeLesson.subtitle}`}
          text={activeLesson.text}
          mode="tutor"
          level={activeLesson.level}
          showKeyboardDefault={true}
          showHandsDefault={activeLesson.level === 'beginner'}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
          inactivityPauseSeconds={inactivityPauseSeconds}
          isExternallyPaused={isExternallyPaused}
          zenFocusMode={zenFocusMode}
          onSessionComplete={onSessionComplete}
          onNext={handleNextLesson}
          nextLabel={customDrillLesson ? 'Back to Curriculum' : 'Next Lesson'}
        />
      </div>
    </div>
  );
};
