import type { GradeNumber, Question, SectionCount, SectionId } from '../types';

const CACHE_KEY = 'sunny-steps.question-cache.v1';
const CACHE_LIMIT = 24;

interface CacheFile {
  savedAt: number;
  entries: Record<string, Question[]>;
}

function emptyCache(): CacheFile {
  return { savedAt: 0, entries: {} };
}

function readCache(): CacheFile {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return emptyCache();
    const parsed = JSON.parse(raw) as CacheFile;
    if (!parsed || typeof parsed.entries !== 'object' || parsed.entries == null) return emptyCache();
    return { savedAt: parsed.savedAt || 0, entries: parsed.entries };
  } catch {
    return emptyCache();
  }
}

function writeEntry(key: string, questions: Question[]): void {
  try {
    const cache = readCache();
    const entries = { ...cache.entries, [key]: questions };
    const keys = Object.keys(entries);
    while (keys.length > CACHE_LIMIT) {
      const oldest = keys.shift();
      if (oldest) delete entries[oldest];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), entries }));
  } catch {
    // The practice screen still works for this visit when storage is unavailable.
  }
}

export function cachedQuestions(grade?: GradeNumber): Question[] {
  const seen = new Map<string, Question>();
  for (const list of Object.values(readCache().entries)) {
    if (!Array.isArray(list)) continue;
    for (const question of list) {
      if (!question || typeof question.id !== 'string') continue;
      if (grade != null && question.grade !== grade) continue;
      seen.set(question.id, question);
    }
  }
  return [...seen.values()];
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function fetchSections(grade: GradeNumber): Promise<SectionCount[] | null> {
  const body = await readJson<{ sections?: SectionCount[] }>(`/api/sections?grade=${grade}`);
  return body?.sections ?? null;
}

export async function fetchQuestionSet(input: {
  grade: GradeNumber;
  section?: SectionId;
  type?: string;
  limit?: number;
  scored?: boolean;
  ids?: string[];
}): Promise<{ questions: Question[] | null; fromCache: boolean }> {
  const params = new URLSearchParams({ grade: String(input.grade) });
  if (input.section) params.set('section', input.section);
  if (input.type) params.set('type', input.type);
  if (input.limit) params.set('limit', String(input.limit));
  if (input.scored) params.set('scored', '1');
  if (input.ids?.length) params.set('ids', input.ids.join(','));
  const key = params.toString();
  const body = await readJson<{ questions?: Question[] }>(`/api/questions?${key}`);
  if (body && Array.isArray(body.questions)) {
    writeEntry(key, body.questions);
    return { questions: body.questions, fromCache: false };
  }
  const cached = readCache().entries[key];
  if (Array.isArray(cached) && cached.length) return { questions: cached, fromCache: true };
  if (input.ids?.length) {
    const wanted = new Set(input.ids);
    const found = cachedQuestions(input.grade).filter((question) => wanted.has(question.id));
    if (found.length) return { questions: found, fromCache: true };
  }
  return { questions: null, fromCache: false };
}
