import { readFileSync } from 'node:fs';
import { expectedChoice, assertQuestion } from '../../src/lib/verify.mjs';

const skills = JSON.parse(readFileSync(new URL('../../src/data/skills.json', import.meta.url), 'utf8'));

export const NAMES = [
  'Maya', 'Jordan', 'Priya', 'Luis', 'Aisha', 'Noah', 'Mei', 'Sam', 'Elena', 'Omar',
  'Theo', 'Hana', 'Leo', 'Sofia', 'Malik', 'Ruby', 'Evan', 'Nina', 'Caleb', 'Amira',
  'Jonah', 'Zoe', 'Andre', 'Lila', 'Kai', 'Noor', 'Miles', 'Tara', 'Hugo', 'Imani',
  'Felix', 'Rosa', 'Owen', 'Anika', 'Wes', 'Yara', 'Nico', 'Jamal', 'Pia', 'Sable',
];

const prompts = new Set();
let seq = 0;

export function skillFields(id) {
  const skill = skills[id];
  if (!skill) throw new Error(`Missing skill ${id}`);
  return { skill: id, skillLabel: skill.label, links: skill.links };
}

export function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rng) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function choiceSet(correct, distractors, rng) {
  const all = [String(correct), ...distractors.map(String)];
  if (new Set(all).size !== 4) {
    throw new Error(`Need 4 unique choices including "${correct}": ${all.join(' | ')}`);
  }
  return shuffle(all, rng);
}

export function numericChoices(answer, extras, rng) {
  const values = [answer];
  for (const extra of extras) {
    if (Number.isInteger(extra) && extra >= 0 && extra !== answer && !values.includes(extra)) values.push(extra);
  }
  let bump = 1;
  while (values.length < 4 && bump < 40) {
    for (const candidate of [answer + bump, Math.abs(answer - bump), answer + bump * 10, answer + 2]) {
      if (Number.isInteger(candidate) && candidate >= 0 && !values.includes(candidate)) values.push(candidate);
      if (values.length >= 4) break;
    }
    bump += 1;
  }
  if (values.length < 4) throw new Error(`Not enough numeric choices for ${answer}`);
  return shuffle(values.slice(0, 4).map(String), rng);
}

function remember(prompt) {
  const key = prompt.trim().toLowerCase().replace(/\s+/g, ' ');
  if (prompts.has(key)) throw new Error(`Duplicate question text: ${prompt}`);
  prompts.add(key);
}

export function seal(partial) {
  remember(partial.prompt);
  const choices = partial.choices.map(String);
  if (new Set(choices).size !== choices.length) throw new Error(`Repeated choices in: ${partial.prompt}`);
  if (partial.scored !== false && (choices.length < 4 || choices.length > 5)) {
    throw new Error(`Choice count ${choices.length} in: ${partial.prompt}`);
  }
  const draft = {
    grade: 3,
    scored: true,
    ...partial,
    choices,
  };
  const expected = expectedChoice(draft);
  let answerIndex = partial.answerIndex;
  if (expected != null) answerIndex = choices.indexOf(expected);
  else if (partial.correctText != null) answerIndex = choices.indexOf(String(partial.correctText));
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= choices.length) {
    throw new Error(`Answer not among choices for: ${partial.prompt}\nexpected=${expected}\n${choices.join(' | ')}`);
  }
  let explanation = partial.explanation.trim();
  const correct = choices[answerIndex];
  if (correct.length <= 90 && !explanation.includes(correct)) {
    explanation = `${explanation} The answer is "${correct.replace(/[.]+$/g, '')}".`;
  }
  if (explanation.length < 40) {
    explanation = `${explanation} The best choice is "${correct}."`;
  }
  if (explanation.length < 40) throw new Error(`Explanation too short: ${partial.prompt}`);
  const q = {
    ...draft,
    id: `g3-${partial.prefix}-${String(++seq).padStart(3, '0')}`,
    answerIndex,
    explanation,
  };
  delete q.prefix;
  delete q.correctText;
  assertQuestion(q);
  return q;
}

export function sealCreative(partial) {
  remember(partial.prompt);
  if (!partial.rubric || partial.rubric.length < 4) throw new Error('Creative rubric is short');
  return {
    id: `g3-${partial.prefix}-${String(++seq).padStart(3, '0')}`,
    grade: 3,
    section: 'torrance',
    topic: 'creative',
    topicLabel: 'Creative challenges',
    prompt: partial.prompt,
    choices: [],
    answerIndex: -1,
    explanation: partial.explanation,
    difficulty: partial.difficulty,
    scored: false,
    rubric: partial.rubric,
    ...skillFields('G3.CREATE'),
  };
}

export function nameAt(index) {
  return NAMES[index % NAMES.length];
}
