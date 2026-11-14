import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function seedRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), '../../seeds/questions');
}

export function loadSeedQuestions() {
  const questions = [];
  const root = seedRoot();
  for (const gradeDir of readdirSync(root)) {
    if (!/^grade-\d+$/.test(gradeDir)) continue;
    const dir = join(root, gradeDir);
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const list = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      if (!Array.isArray(list)) throw new Error(`${gradeDir}/${file} must be a JSON array`);
      for (const question of list) questions.push(question);
    }
  }
  return questions;
}
