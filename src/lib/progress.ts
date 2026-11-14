import type { Progress, Question, SessionStats } from '../types';

export const PROGRESS_KEY = 'sunny-steps.v1';
export const SESSION_KEY = 'sunny-steps.session.v1';

export interface Badge {
  id: string;
  name: string;
  detail: string;
}

export const badges: Badge[] = [
  { id: 'first-star', name: 'First Star', detail: 'Answer one question correctly.' },
  { id: 'streak-5', name: 'On Fire', detail: 'Get 5 correct in a row.' },
  { id: 'streak-10', name: 'Blazing', detail: 'Get 10 correct in a row.' },
  { id: 'warm-up', name: 'Warm-Up', detail: 'Answer 25 questions.' },
  { id: 'century', name: 'Century', detail: 'Answer 100 questions.' },
  { id: 'skill-star', name: 'Skill Star', detail: 'Reach 80% on a skill after at least 5 tries.' },
  { id: 'test-taker', name: 'Test Taker', detail: 'Finish a mock test.' },
  { id: 'page-turner', name: 'Page Turner', detail: 'Answer 20 reading questions.' },
  { id: 'number-navigator', name: 'Number Navigator', detail: 'Answer 20 math questions.' },
  { id: 'puzzle-pilot', name: 'Puzzle Pilot', detail: 'Answer 20 reasoning questions.' },
  { id: 'idea-spark', name: 'Idea Spark', detail: 'Finish a creative challenge checklist.' },
  { id: 'comeback', name: 'Comeback', detail: 'Clear 5 questions from your mistake review.' },
];

export function emptyProgress(): Progress {
  return {
    version: 1,
    allCorrect: 0,
    allAnswered: 0,
    streak: 0,
    bestStreak: 0,
    skills: {},
    mistakes: [],
    clearedMistakes: 0,
    badges: [],
    creativeDone: [],
    creativeNotes: {},
    mockTests: 0,
    sectionAnswered: {},
  };
}

export function emptySession(): SessionStats {
  return { correct: 0, answered: 0 };
}

function earnedIds(state: Progress): string[] {
  const ids = new Set<string>();
  if (state.allCorrect >= 1) ids.add('first-star');
  if (state.bestStreak >= 5) ids.add('streak-5');
  if (state.bestStreak >= 10) ids.add('streak-10');
  if (state.allAnswered >= 25) ids.add('warm-up');
  if (state.allAnswered >= 100) ids.add('century');
  if (Object.values(state.skills).some((skill) => skill.attempts >= 5 && skill.correct / skill.attempts >= 0.8)) {
    ids.add('skill-star');
  }
  if (state.mockTests >= 1) ids.add('test-taker');
  if ((state.sectionAnswered.map || 0) >= 20) ids.add('page-turner');
  if ((state.sectionAnswered.iready || 0) >= 20) ids.add('number-navigator');
  if ((state.sectionAnswered.cogat || 0) >= 20) ids.add('puzzle-pilot');
  if (state.creativeDone.length >= 1) ids.add('idea-spark');
  if (state.clearedMistakes >= 5) ids.add('comeback');
  return badges.map((badge) => badge.id).filter((id) => ids.has(id));
}

function withBadges(state: Progress): { state: Progress; newBadges: string[] } {
  const next = earnedIds(state);
  const known = new Set(state.badges);
  const fresh = next.filter((id) => !known.has(id));
  return { state: { ...state, badges: next }, newBadges: fresh };
}

export function recordAnswer(state: Progress, question: Question, choice: number): { state: Progress; correct: boolean; newBadges: string[] } {
  if (!question.scored) return { state, correct: false, newBadges: [] };
  const correct = choice === question.answerIndex;
  const skill = state.skills[question.skill] || { label: question.skillLabel, correct: 0, attempts: 0 };
  const mistakes = state.mistakes.filter((id) => id !== question.id);
  let clearedMistakes = state.clearedMistakes;
  if (correct && state.mistakes.includes(question.id)) clearedMistakes += 1;
  if (!correct) mistakes.push(question.id);
  const next: Progress = {
    ...state,
    allAnswered: state.allAnswered + 1,
    allCorrect: state.allCorrect + (correct ? 1 : 0),
    streak: correct ? state.streak + 1 : 0,
    bestStreak: correct ? Math.max(state.bestStreak, state.streak + 1) : state.bestStreak,
    skills: {
      ...state.skills,
      [question.skill]: {
        label: question.skillLabel,
        attempts: skill.attempts + 1,
        correct: skill.correct + (correct ? 1 : 0),
      },
    },
    mistakes: mistakes.slice(-120),
    clearedMistakes,
    sectionAnswered: {
      ...state.sectionAnswered,
      [question.section]: (state.sectionAnswered[question.section] || 0) + 1,
    },
  };
  return { ...withBadges(next), correct };
}

export function noteMockFinished(state: Progress): { state: Progress; newBadges: string[] } {
  return withBadges({ ...state, mockTests: state.mockTests + 1 });
}

export function saveCreative(state: Progress, id: string, note: string, done: boolean): { state: Progress; newBadges: string[] } {
  const creativeDone = done && !state.creativeDone.includes(id) ? [...state.creativeDone, id] : state.creativeDone;
  return withBadges({
    ...state,
    creativeNotes: { ...state.creativeNotes, [id]: note },
    creativeDone,
  });
}

export function loadProgress(): Progress {
  return readStore(PROGRESS_KEY, emptyProgress());
}

export function loadSession(): SessionStats {
  return readStore(SESSION_KEY, emptySession());
}

export function saveProgress(state: Progress): void {
  writeStore(PROGRESS_KEY, state);
}

export function saveSession(state: SessionStats): void {
  writeStore(SESSION_KEY, state);
}

function readStore<T extends object>(key: string, fallback: T): T {
  try {
    const store = key === SESSION_KEY ? sessionStorage : localStorage;
    const raw = store.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function writeStore(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  if (key === SESSION_KEY) sessionStorage.setItem(key, raw);
  else localStorage.setItem(key, raw);
}

export function percent(correct: number, answered: number): number {
  if (!answered) return 0;
  return Math.round((correct / answered) * 100);
}
