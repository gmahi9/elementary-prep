import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertQuestion } from '../src/lib/verify.mjs';
import { loadSeedQuestions } from './lib/load-seeds.mjs';

const CREATED_AT = '2026-11-14T00:00:00.000Z';
const idPattern = /^g(?:k|[0-5])-[a-z0-9-]{2,48}$/;
const sections = new Set(['cogat', 'iready', 'map', 'torrance']);

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function validate(question, ids) {
  if (!question || typeof question !== 'object') throw new Error('Question must be an object');
  if (typeof question.id !== 'string' || !idPattern.test(question.id)) throw new Error(`Bad id ${question.id}`);
  if (ids.has(question.id)) throw new Error(`Duplicate id ${question.id}`);
  ids.add(question.id);
  if (!Number.isInteger(question.grade) || question.grade < 0 || question.grade > 12) {
    throw new Error(`Bad grade on ${question.id}`);
  }
  const prefix = question.grade === 0 ? 'gk-' : `g${question.grade}-`;
  if (!question.id.startsWith(prefix)) throw new Error(`${question.id} does not match grade ${question.grade}`);
  if (!sections.has(question.section)) throw new Error(`Bad section on ${question.id}`);
  if (typeof question.prompt !== 'string' || question.prompt.trim().length < 8) throw new Error(`Bad prompt on ${question.id}`);
  if (typeof question.explanation !== 'string' || question.explanation.trim().length < 20) {
    throw new Error(`Explanation missing on ${question.id}`);
  }
  if (!Array.isArray(question.links) || question.links.length < 1) throw new Error(`Lesson link missing on ${question.id}`);
  const lesson = question.links[0]?.href;
  if (typeof lesson !== 'string' || !lesson.startsWith('https://')) throw new Error(`Lesson URL missing on ${question.id}`);
  if (question.scored === false) {
    if (!Array.isArray(question.rubric) || question.rubric.length < 4) throw new Error(`Rubric missing on ${question.id}`);
    return { answer: '', lesson };
  }
  if (!Array.isArray(question.choices) || question.choices.length < 2) throw new Error(`Choices missing on ${question.id}`);
  if (!Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= question.choices.length) {
    throw new Error(`Answer index missing on ${question.id}`);
  }
  const answer = question.choices[question.answerIndex];
  if (typeof answer !== 'string' || !question.choices.includes(answer)) throw new Error(`Answer is not among choices on ${question.id}`);
  if (new Set(question.choices).size !== question.choices.length) throw new Error(`Duplicate choices on ${question.id}`);
  assertQuestion(question);
  return { answer, lesson };
}

const questions = loadSeedQuestions();
const ids = new Set();
const statements = [];
for (const question of questions) {
  const { answer, lesson } = validate(question, ids);
  const figure = question.figure ? sqlString(JSON.stringify(question.figure)) : 'NULL';
  statements.push(
    `INSERT OR REPLACE INTO questions (id, grade, section, skill, type, prompt, choices, answer, explanation, lesson_url, figure, difficulty, active, created_at, detail) VALUES (${[
      sqlString(question.id),
      String(question.grade),
      sqlString(question.section),
      sqlString(question.skill),
      sqlString(question.topic),
      sqlString(question.prompt),
      sqlString(JSON.stringify(question.choices)),
      sqlString(answer),
      sqlString(question.explanation),
      sqlString(lesson),
      figure,
      String(question.difficulty),
      '1',
      sqlString(CREATED_AT),
      sqlString(JSON.stringify(question)),
    ].join(', ')});`,
  );
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../seeds/out');
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, 'questions.sql');
writeFileSync(outFile, `${statements.join('\n')}\n`);
console.log(`Wrote ${statements.length} statements to ${outFile}`);
