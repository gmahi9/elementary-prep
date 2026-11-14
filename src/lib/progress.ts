import type { MockRun, Progress, Question, SessionStats } from '../types';

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
    mockHistory: [],
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

export function noteMockFinished(
  state: Progress,
  summary?: { section: string; correct: number; total: number },
): { state: Progress; newBadges: string[] } {
  const mockHistory = state.mockHistory || [];
  const nextHistory = summary
    ? [
        ...mockHistory,
        {
          id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          at: Date.now(),
          section: summary.section,
          correct: summary.correct,
          total: summary.total,
        },
      ].slice(-50)
    : mockHistory;
  return withBadges({ ...state, mockTests: state.mockTests + 1, mockHistory: nextHistory });
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
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    return normalizeProgress(JSON.parse(raw)) || emptyProgress();
  } catch {
    return emptyProgress();
  }
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

export function hasActivity(state: Progress): boolean {
  return state.allAnswered > 0 || state.creativeDone.length > 0 || state.mockTests > 0 || (state.mockHistory || []).length > 0;
}

const questionId = /^g3-[a-z0-9-]{2,24}$/;
const skillKey = /^[A-Za-z0-9.]{1,32}$/;
const mockId = /^m-[a-z0-9-]{4,40}$/;
const sections = new Set(['cogat', 'iready', 'map', 'torrance']);
const historySections = new Set(['cogat', 'iready', 'map', 'torrance', 'mix']);

function whole(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

function cleanText(value: string, max: number): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

function readSkills(value: unknown): Progress['skills'] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 80) return null;
  const skills: Progress['skills'] = {};
  for (const [key, stat] of entries) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return null;
    if (!skillKey.test(key)) return null;
    if (!stat || typeof stat !== 'object' || Array.isArray(stat)) return null;
    const row = stat as Record<string, unknown>;
    if (typeof row.label !== 'string') return null;
    const label = cleanText(row.label, 80);
    const attempts = whole(row.attempts, 0, 100000);
    const correct = whole(row.correct, 0, 100000);
    if (!label || attempts == null || correct == null || correct > attempts) return null;
    skills[key] = { label, attempts, correct };
  }
  return skills;
}

function readIds(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !questionId.test(item)) return null;
    ids.push(item);
  }
  return ids;
}

function readHistory(value: unknown): MockRun[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 50) return null;
  const runs: MockRun[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || !mockId.test(row.id)) return null;
    if (typeof row.section !== 'string' || !historySections.has(row.section)) return null;
    const at = whole(row.at, 1_500_000_000_000, 2_200_000_000_000);
    const total = whole(row.total, 1, 50);
    const correct = whole(row.correct, 0, 50);
    if (at == null || total == null || correct == null || correct > total) return null;
    runs.push({ id: row.id, at, section: row.section, correct, total });
  }
  return runs;
}

export function normalizeProgress(input: unknown): Progress | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  if (raw.version !== 1) return null;
  const allAnswered = whole(raw.allAnswered, 0, 100000);
  const allCorrect = whole(raw.allCorrect, 0, 100000);
  const streak = whole(raw.streak, 0, 100000);
  const bestStreak = whole(raw.bestStreak, 0, 100000);
  const clearedMistakes = whole(raw.clearedMistakes, 0, 100000);
  const mockTests = whole(raw.mockTests, 0, 100000);
  if (
    allAnswered == null ||
    allCorrect == null ||
    streak == null ||
    bestStreak == null ||
    clearedMistakes == null ||
    mockTests == null ||
    allCorrect > allAnswered ||
    streak > bestStreak
  ) {
    return null;
  }
  const skills = readSkills(raw.skills);
  const mistakes = readIds(raw.mistakes, 120);
  const creativeDone = readIds(raw.creativeDone, 40);
  const mockHistory = readHistory(raw.mockHistory);
  if (!skills || !mistakes || !creativeDone || !mockHistory) return null;
  if (!raw.creativeNotes || typeof raw.creativeNotes !== 'object' || Array.isArray(raw.creativeNotes)) return null;
  const noteEntries = Object.entries(raw.creativeNotes as Record<string, unknown>);
  if (noteEntries.length > 40) return null;
  const creativeNotes: Record<string, string> = {};
  for (const [key, note] of noteEntries) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return null;
    if (!questionId.test(key) || typeof note !== 'string') return null;
    creativeNotes[key] = cleanText(note, 2000);
  }
  if (!raw.sectionAnswered || typeof raw.sectionAnswered !== 'object' || Array.isArray(raw.sectionAnswered)) return null;
  const sectionEntries = Object.entries(raw.sectionAnswered as Record<string, unknown>);
  if (sectionEntries.length > 4) return null;
  const sectionAnswered: Record<string, number> = {};
  for (const [key, count] of sectionEntries) {
    if (!sections.has(key)) return null;
    const value = whole(count, 0, 100000);
    if (value == null) return null;
    sectionAnswered[key] = value;
  }
  return withBadges({
    version: 1,
    allCorrect,
    allAnswered,
    streak,
    bestStreak,
    skills,
    mistakes,
    clearedMistakes,
    badges: [],
    creativeDone,
    creativeNotes,
    mockTests,
    sectionAnswered,
    mockHistory,
  }).state;
}

export function mergeProgress(local: Progress, remote: Progress): Progress {
  const left = normalizeProgress(local) || emptyProgress();
  const right = normalizeProgress(remote) || emptyProgress();
  const skills: Progress['skills'] = { ...right.skills };
  for (const [key, stat] of Object.entries(left.skills)) {
    const other = skills[key];
    if (!other) {
      skills[key] = stat;
      continue;
    }
    const attempts = Math.max(other.attempts, stat.attempts);
    const correct = Math.min(attempts, Math.max(other.correct, stat.correct));
    skills[key] = { label: stat.label || other.label, attempts, correct };
  }
  const mistakes = [...new Set([...right.mistakes, ...left.mistakes])].slice(-120);
  const creativeDone = [...new Set([...right.creativeDone, ...left.creativeDone])].slice(-40);
  const creativeNotes = { ...right.creativeNotes };
  for (const [id, note] of Object.entries(left.creativeNotes)) {
    if (!creativeNotes[id] || note.length >= creativeNotes[id].length) creativeNotes[id] = note;
  }
  const cappedNotes = Object.fromEntries(Object.entries(creativeNotes).slice(0, 40));
  const sectionAnswered = { ...right.sectionAnswered };
  for (const [key, count] of Object.entries(left.sectionAnswered)) {
    sectionAnswered[key] = Math.max(sectionAnswered[key] || 0, count);
  }
  const history = new Map<string, MockRun>();
  for (const run of [...right.mockHistory, ...left.mockHistory]) history.set(run.id, run);
  const mockHistory = [...history.values()].sort((a, b) => a.at - b.at).slice(-50);
  const streak = Math.max(left.streak, right.streak);
  const allAnswered = Math.max(left.allAnswered, right.allAnswered);
  const allCorrect = Math.min(allAnswered, Math.max(left.allCorrect, right.allCorrect));
  const merged: Progress = {
    version: 1,
    allCorrect,
    allAnswered,
    streak,
    bestStreak: Math.max(left.bestStreak, right.bestStreak, streak),
    skills,
    mistakes,
    clearedMistakes: Math.max(left.clearedMistakes, right.clearedMistakes),
    badges: [],
    creativeDone,
    creativeNotes: cappedNotes,
    mockTests: Math.max(left.mockTests, right.mockTests),
    sectionAnswered,
    mockHistory,
  };
  return withBadges(merged).state;
}
