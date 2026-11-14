import { describe, expect, it } from 'vitest';
import type { D1Database, D1Statement, Env } from './env';
import { handleGrades, handleMemoryQuestions, handleQuestions, handleSections, parseGrade, selectQuestions } from './catalog';
import type { Question } from '../types';

function question(partial: Partial<Question> & Pick<Question, 'id' | 'grade' | 'section' | 'topic'>): Question {
  return {
    topicLabel: partial.topic,
    prompt: partial.prompt || `Prompt for ${partial.id} is long enough.`,
    choices: partial.choices || ['one', 'two', 'three', 'four'],
    answerIndex: partial.answerIndex ?? 0,
    explanation: partial.explanation || 'Step 1: Read the prompt. Step 2: Choose the matching answer.',
    skill: 'K.CC.A.1',
    skillLabel: 'Count',
    difficulty: 1,
    links: [{ label: 'Lesson', href: 'https://www.khanacademy.org/math/cc-kindergarten-math/cc-kindergarten-counting' }],
    scored: partial.scored ?? true,
    ...partial,
  };
}

const sample: Question[] = [
  question({ id: 'gk-counting-0001', grade: 0, section: 'cogat', topic: 'counting' }),
  question({ id: 'gk-counting-0002', grade: 0, section: 'iready', topic: 'counting', scored: false, choices: [], answerIndex: -1, rubric: ['a', 'b', 'c', 'd'] }),
  question({ id: 'g3-fractions-0042', grade: 3, section: 'iready', topic: 'fractions', topicLabel: 'Fractions' }),
  question({ id: 'g5-volume-0001', grade: 5, section: 'iready', topic: 'volume', topicLabel: 'Volume' }),
];

class SpyDb implements D1Database {
  sql = '';
  binds: unknown[] = [];

  prepare(query: string): D1Statement {
    const self = this;
    self.sql = query;
    self.binds = [];
    const statement: D1Statement = {
      bind(...values: unknown[]) {
        self.binds = values;
        return statement;
      },
      first: async () => null,
      all: async () => ({ results: [] }),
      run: async () => ({ success: true }),
    };
    return statement;
  }
}

describe('question query parsing', () => {
  it('accepts kindergarten and rejects a grade outside K-5', () => {
    expect(parseGrade('K')).toBe(0);
    expect(parseGrade('k')).toBe(0);
    expect(parseGrade('5')).toBe(5);
    expect(parseGrade('6')).toBeNull();
    expect(parseGrade('')).toBeNull();
  });

  it('filters a random sample to the requested grade and section', () => {
    const picked = selectQuestions(sample, { grade: 3, section: 'iready', limit: 10, scored: true, ids: [] }, () => 0);
    expect(picked.map((item) => item.id)).toEqual(['g3-fractions-0042']);
  });

  it('returns requested ids for review', () => {
    const picked = selectQuestions(sample, { grade: 0, limit: 10, scored: false, ids: ['gk-counting-0001', 'g3-fractions-0042'] }, () => 0);
    expect(picked.map((item) => item.id)).toEqual(['gk-counting-0001']);
  });
});

describe('question endpoints', () => {
  it('rejects a missing grade and a huge limit', async () => {
    const missing = handleMemoryQuestions(sample, new Request('https://elementary.aiteksolutions.net/api/questions'));
    expect(missing.status).toBe(400);
    expect(missing.headers.get('x-content-type-options')).toBe('nosniff');
    expect(missing.headers.get('cache-control')).toBe('no-store');
    const huge = handleMemoryQuestions(sample, new Request('https://elementary.aiteksolutions.net/api/questions?grade=3&limit=500'));
    expect(huge.status).toBe(400);
  });

  it('serves a public sample with a short cache', async () => {
    const response = handleMemoryQuestions(sample, new Request('https://elementary.aiteksolutions.net/api/questions?grade=5&section=iready&limit=5'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('public');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    const body = await response.json() as { questions: Question[] };
    expect(body.questions.map((item) => item.id)).toEqual(['g5-volume-0001']);
  });

  it('asks D1 for active rows only', async () => {
    const db = new SpyDb();
    const env = { DB: db } as Env;
    const grades = await handleGrades(env);
    expect(grades.status).toBe(200);
    expect(db.sql).toContain('active = 1');
    const sections = await handleSections(new Request('https://elementary.aiteksolutions.net/api/sections?grade=K'), env);
    expect(sections.status).toBe(200);
    expect(db.binds).toEqual([0]);
    const questions = await handleQuestions(new Request('https://elementary.aiteksolutions.net/api/questions?grade=3&section=iready&limit=4'), env);
    expect(questions.status).toBe(200);
    expect(db.sql).toContain('ORDER BY RANDOM()');
    expect(db.sql).toContain('active = 1');
    expect(db.binds).toEqual([3, 'iready', 4]);
  });
});
