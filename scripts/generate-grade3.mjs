import { mkdirSync, writeFileSync } from 'node:fs';
import { buildVerbal } from './lib/verbal.mjs';
import { buildBank } from './lib/build-bank.mjs';

const questions = [...buildVerbal(), ...buildBank()];
const scored = questions.filter((question) => question.scored).length;
if (scored < 1000) throw new Error(`Only ${scored} scored questions were built`);

const byTopic = new Map();
for (const question of questions) {
  if (!byTopic.has(question.topic)) byTopic.set(question.topic, []);
  byTopic.get(question.topic).push(order(question));
}

mkdirSync(new URL('../src/data/grade3/', import.meta.url), { recursive: true });
for (const [topic, list] of byTopic) {
  const path = new URL(`../src/data/grade3/${topic}.json`, import.meta.url);
  writeFileSync(path, `${JSON.stringify(list, null, 2)}\n`);
}

const sections = {};
for (const question of questions) {
  sections[question.section] = sections[question.section] || { total: 0, scored: 0, topics: {} };
  const bucket = sections[question.section];
  bucket.total += 1;
  if (question.scored) bucket.scored += 1;
  bucket.topics[question.topic] = (bucket.topics[question.topic] || 0) + 1;
}

console.log(JSON.stringify({
  total: questions.length,
  scored: questions.filter((question) => question.scored).length,
  sections,
}, null, 2));

function order(question) {
  return {
    id: question.id,
    grade: question.grade,
    section: question.section,
    topic: question.topic,
    topicLabel: question.topicLabel,
    prompt: question.prompt,
    ...(question.passageTitle ? { passageTitle: question.passageTitle } : {}),
    ...(question.passage ? { passage: question.passage } : {}),
    ...(question.figure ? { figure: question.figure } : {}),
    choices: question.choices,
    ...(question.choiceFigures ? { choiceFigures: question.choiceFigures } : {}),
    answerIndex: question.answerIndex,
    explanation: question.explanation,
    skill: question.skill,
    skillLabel: question.skillLabel,
    difficulty: question.difficulty,
    links: question.links,
    scored: question.scored,
    ...(question.rubric ? { rubric: question.rubric } : {}),
    ...(question.verify ? { verify: question.verify } : {}),
  };
}
