import type { D1Database, Env } from './env';
import type { GradeNumber, Question, SectionCount, SectionId } from '../types';

const QUESTION_ID = /^g(?:k|[0-5])-[a-z0-9-]{2,48}$/;
const SECTIONS = new Set<SectionId>(['cogat', 'iready', 'map', 'torrance']);
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 80;
const MAX_IDS = 40;

const SECTION_META: Record<SectionId, { title: string; area: string; sort: number }> = {
  cogat: { title: 'CogAT', area: 'reasoning', sort: 1 },
  iready: { title: 'i-Ready', area: 'math', sort: 2 },
  map: { title: 'MAP', area: 'reading', sort: 3 },
  torrance: { title: 'Torrance', area: 'creative', sort: 4 },
};

const SECURITY = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
  'x-xss-protection': '0',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests",
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-permitted-cross-domain-policies': 'none',
  'cross-origin-resource-policy': 'same-origin',
};

export interface QuestionQuery {
  grade: GradeNumber;
  section?: SectionId;
  type?: string;
  limit: number;
  scored: boolean;
  ids: string[];
}

interface QuestionRow {
  id: string;
  grade: number;
  section: string;
  skill: string;
  type: string;
  prompt: string;
  choices: string;
  answer: string;
  explanation: string;
  lesson_url: string;
  figure: string | null;
  difficulty: number;
  detail: string;
}

function json(data: unknown, status = 200, cache = 'public, max-age=120'): Response {
  const headers = new Headers(SECURITY);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', cache);
  return new Response(JSON.stringify(data), { status, headers });
}

export function parseGrade(value: string | null): GradeNumber | null {
  if (value == null) return null;
  const text = value.trim();
  if (/^k$/i.test(text)) return 0;
  if (!/^[0-5]$/.test(text)) return null;
  return Number(text) as GradeNumber;
}

export function parseQuestionQuery(url: URL): { ok: true; query: QuestionQuery } | { ok: false; error: string } {
  const grade = parseGrade(url.searchParams.get('grade'));
  if (grade == null) return { ok: false, error: 'Choose a grade from K through 5.' };
  const sectionValue = url.searchParams.get('section');
  let section: SectionId | undefined;
  if (sectionValue) {
    if (!SECTIONS.has(sectionValue as SectionId)) return { ok: false, error: 'Unknown section.' };
    section = sectionValue as SectionId;
  }
  const typeValue = url.searchParams.get('type');
  if (typeValue && !/^[a-z0-9-]{1,40}$/.test(typeValue)) return { ok: false, error: 'Unknown question type.' };
  const limitValue = url.searchParams.get('limit');
  let limit = DEFAULT_LIMIT;
  if (limitValue != null && limitValue !== '') {
    if (!/^\d+$/.test(limitValue)) return { ok: false, error: 'Limit must be a whole number.' };
    limit = Number(limitValue);
    if (limit < 1 || limit > MAX_LIMIT) return { ok: false, error: `Limit must be from 1 to ${MAX_LIMIT}.` };
  }
  const scoredValue = url.searchParams.get('scored');
  if (scoredValue && scoredValue !== '0' && scoredValue !== '1') return { ok: false, error: 'Scored must be 0 or 1.' };
  const idsValue = url.searchParams.get('ids');
  const ids: string[] = [];
  if (idsValue) {
    for (const id of idsValue.split(',')) {
      const trimmed = id.trim();
      if (!trimmed) continue;
      if (!QUESTION_ID.test(trimmed)) return { ok: false, error: 'Unknown question id.' };
      ids.push(trimmed);
    }
    if (ids.length > MAX_IDS) return { ok: false, error: `Ask for at most ${MAX_IDS} questions.` };
  }
  return {
    ok: true,
    query: {
      grade,
      section,
      type: typeValue || undefined,
      limit,
      scored: scoredValue === '1',
      ids,
    },
  };
}

export function rowToQuestion(row: QuestionRow): Question | null {
  try {
    const detail = JSON.parse(row.detail) as Question;
    const choices = JSON.parse(row.choices) as string[];
    if (!Array.isArray(choices)) return null;
    const figure = row.figure ? JSON.parse(row.figure) as Question['figure'] : detail.figure;
    const question: Question = {
      ...detail,
      id: row.id,
      grade: row.grade as GradeNumber,
      section: row.section as SectionId,
      skill: row.skill,
      prompt: row.prompt,
      choices,
      explanation: row.explanation,
      difficulty: row.difficulty as Question['difficulty'],
      figure,
    };
    if (question.scored && question.choices[question.answerIndex] !== row.answer) return null;
    return question;
  } catch {
    return null;
  }
}

export function selectQuestions(list: Question[], query: QuestionQuery, random = Math.random): Question[] {
  if (query.ids.length) {
    const wanted = new Set(query.ids);
    return list.filter((question) => question.grade === query.grade && wanted.has(question.id));
  }
  const pool = list.filter((question) => {
    if (question.grade !== query.grade) return false;
    if (query.section && question.section !== query.section) return false;
    if (query.type && question.topic !== query.type) return false;
    if (query.scored && !question.scored) return false;
    return true;
  });
  const copy = [...pool];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = copy[index];
    const other = copy[swap];
    if (current && other) {
      copy[index] = other;
      copy[swap] = current;
    }
  }
  return copy.slice(0, query.limit);
}

export function gradeSummaries(list: Question[]): { grade: GradeNumber; label: string; count: number }[] {
  const counts = new Map<number, number>();
  for (const question of list) counts.set(question.grade, (counts.get(question.grade) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([grade, count]) => ({
      grade: grade as GradeNumber,
      label: grade === 0 ? 'K' : String(grade),
      count,
    }));
}

export function sectionSummaries(list: Question[], grade: GradeNumber): SectionCount[] {
  const sections = new Map<SectionId, SectionCount>();
  for (const question of list) {
    if (question.grade !== grade) continue;
    const meta = SECTION_META[question.section];
    if (!meta) continue;
    let section = sections.get(question.section);
    if (!section) {
      section = { key: question.section, title: meta.title, area: meta.area, sort: meta.sort, count: 0, topics: [] };
      sections.set(question.section, section);
    }
    section.count += 1;
    let topic = section.topics.find((item) => item.key === question.topic);
    if (!topic) {
      topic = { key: question.topic, title: question.topicLabel, count: 0 };
      section.topics.push(topic);
    }
    topic.count += 1;
  }
  return [...sections.values()]
    .map((section) => ({
      ...section,
      topics: [...section.topics].sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.sort - b.sort);
}

const GRADE_SQL = 'SELECT grade, COUNT(*) AS count FROM questions WHERE active = 1 GROUP BY grade ORDER BY grade';
const SECTION_SQL = `SELECT section, type, json_extract(detail, '$.topicLabel') AS title, COUNT(*) AS count
  FROM questions WHERE active = 1 AND grade = ? GROUP BY section, type, title ORDER BY section, type`;
const QUESTION_COLUMNS = 'id, grade, section, skill, type, prompt, choices, answer, explanation, lesson_url, figure, difficulty, detail';

function questionSql(query: QuestionQuery): { sql: string; binds: unknown[] } {
  if (query.ids.length) {
    const marks = query.ids.map(() => '?').join(', ');
    return {
      sql: `SELECT ${QUESTION_COLUMNS} FROM questions WHERE active = 1 AND grade = ? AND id IN (${marks})`,
      binds: [query.grade, ...query.ids],
    };
  }
  const binds: unknown[] = [query.grade];
  let sql = `SELECT ${QUESTION_COLUMNS} FROM questions WHERE active = 1 AND grade = ?`;
  if (query.section) {
    sql += ' AND section = ?';
    binds.push(query.section);
  }
  if (query.type) {
    sql += ' AND type = ?';
    binds.push(query.type);
  }
  if (query.scored) sql += " AND json_extract(detail, '$.scored') = 1";
  sql += ' ORDER BY RANDOM() LIMIT ?';
  binds.push(query.limit);
  return { sql, binds };
}

async function readQuestions(db: D1Database, query: QuestionQuery): Promise<Question[]> {
  const { sql, binds } = questionSql(query);
  const result = await db.prepare(sql).bind(...binds).all<QuestionRow>();
  return (result.results || []).map(rowToQuestion).filter((question): question is Question => question != null);
}

export async function handleGrades(env: Env): Promise<Response> {
  const result = await env.DB.prepare(GRADE_SQL).all<{ grade: number; count: number }>();
  const grades = (result.results || [])
    .map((row) => ({
      grade: Number(row.grade) as GradeNumber,
      label: Number(row.grade) === 0 ? 'K' : String(row.grade),
      count: Number(row.count),
    }))
    .filter((row) => row.grade >= 0 && row.grade <= 5)
    .sort((a, b) => a.grade - b.grade);
  return json({ grades });
}

export async function handleSections(request: Request, env: Env): Promise<Response> {
  const grade = parseGrade(new URL(request.url).searchParams.get('grade'));
  if (grade == null) return json({ error: 'Choose a grade from K through 5.' }, 400, 'no-store');
  const result = await env.DB.prepare(SECTION_SQL).bind(grade).all<{ section: string; type: string; title: string | null; count: number }>();
  const sections = new Map<SectionId, SectionCount>();
  for (const row of result.results || []) {
    if (!SECTIONS.has(row.section as SectionId)) continue;
    const key = row.section as SectionId;
    const meta = SECTION_META[key];
    let section = sections.get(key);
    if (!section) {
      section = { key, title: meta.title, area: meta.area, sort: meta.sort, count: 0, topics: [] };
      sections.set(key, section);
    }
    const count = Number(row.count);
    section.count += count;
    section.topics.push({
      key: row.type,
      title: row.title || row.type,
      count,
    });
  }
  const body = [...sections.values()]
    .map((section) => ({ ...section, topics: [...section.topics].sort((a, b) => a.title.localeCompare(b.title)) }))
    .sort((a, b) => a.sort - b.sort);
  return json({ grade, sections: body });
}

export async function handleQuestions(request: Request, env: Env): Promise<Response> {
  const parsed = parseQuestionQuery(new URL(request.url));
  if (!parsed.ok) return json({ error: parsed.error }, 400, 'no-store');
  const questions = await readQuestions(env.DB, parsed.query);
  return json({
    grade: parsed.query.grade,
    section: parsed.query.section ?? null,
    questions,
  });
}

export function handleMemoryGrades(list: Question[]): Response {
  return json({ grades: gradeSummaries(list) });
}

export function handleMemorySections(list: Question[], request: Request): Response {
  const grade = parseGrade(new URL(request.url).searchParams.get('grade'));
  if (grade == null) return json({ error: 'Choose a grade from K through 5.' }, 400, 'no-store');
  return json({ grade, sections: sectionSummaries(list, grade) });
}

export function handleMemoryQuestions(list: Question[], request: Request, random = Math.random): Response {
  const parsed = parseQuestionQuery(new URL(request.url));
  if (!parsed.ok) return json({ error: parsed.error }, 400, 'no-store');
  return json({
    grade: parsed.query.grade,
    section: parsed.query.section ?? null,
    questions: selectQuestions(list, parsed.query, random),
  });
}
