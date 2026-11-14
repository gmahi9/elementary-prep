import type { Question } from '../types';

export function pickQuestion(pool: Question[], avoid: string[] = []): Question | null {
  if (!pool.length) return null;
  const fresh = pool.filter((question) => !avoid.includes(question.id));
  const bag = fresh.length ? fresh : pool;
  return bag[Math.floor(Math.random() * bag.length)] ?? null;
}

export function sampleQuestions(pool: Question[], count: number): Question[] {
  const copy = [...pool];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    const other = copy[swap];
    if (current && other) {
      copy[index] = other;
      copy[swap] = current;
    }
  }
  return copy.slice(0, Math.min(count, copy.length));
}
