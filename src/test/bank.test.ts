import { describe, expect, it } from 'vitest';
import skills from '../data/skills.json';
import { questions } from '../data/bank';
import { assertQuestion, evalExpr, expectedChoice } from '../lib/verify.mjs';
import { emptyProgress, recordAnswer, saveCreative } from '../lib/progress';
import type { Question } from '../types';

const skillMap = skills as Record<string, { label: string; links: { label: string; href: string }[] }>;

const allowedHosts = new Set([
  'www.khanacademy.org',
  'www.thecorestandards.org',
  'www.mathsisfun.com',
  'www.pbslearningmedia.org',
  'www.readwritethink.org',
]);

function textKey(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, ' ');
}

describe('question text', () => {
  it('fails when two questions share the same text', () => {
    const seen = new Map<string, string>();
    for (const question of questions) {
      const key = textKey(question.prompt);
      const previous = seen.get(key);
      expect(previous, `${question.id} duplicates ${previous}`).toBeUndefined();
      seen.set(key, question.id);
    }
  });
});

describe('question schema', () => {
  it('matches the practice schema', () => {
    const ids = new Set<string>();
    expect(questions.filter((question) => question.scored).length).toBeGreaterThanOrEqual(1000);
    expect(questions.filter((question) => question.section === 'torrance' && !question.scored).length).toBeGreaterThanOrEqual(24);
    for (const question of questions) {
      expect(question.grade).toBe(3);
      expect(['cogat', 'iready', 'map', 'torrance']).toContain(question.section);
      expect(question.id).toMatch(/^g3-[a-z0-9-]+$/);
      expect(ids.has(question.id)).toBe(false);
      ids.add(question.id);
      expect(question.prompt.length).toBeGreaterThan(8);
      expect(question.topicLabel.length).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(question.difficulty);
      const skill = skillMap[question.skill];
      expect(skill, question.skill).toBeTruthy();
      expect(question.skillLabel).toBe(skill.label);
      expect(question.links).toEqual(skill.links);
      expect(question.links.length).toBeGreaterThanOrEqual(1);
      expect(question.links.length).toBeLessThanOrEqual(2);
      for (const link of question.links) {
        const url = new URL(link.href);
        expect(url.protocol).toBe('https:');
        expect(allowedHosts.has(url.host)).toBe(true);
      }
      if (!question.scored) {
        expect(question.section).toBe('torrance');
        expect(question.rubric?.length).toBeGreaterThanOrEqual(4);
        continue;
      }
      expect(question.choices.length === 4 || question.choices.length === 5).toBe(true);
      expect(new Set(question.choices).size).toBe(question.choices.length);
      expect(question.answerIndex).toBeGreaterThanOrEqual(0);
      expect(question.answerIndex).toBeLessThan(question.choices.length);
      expect(question.explanation.length).toBeGreaterThanOrEqual(40);
      if (question.figure) expect(question.figure.alt && question.figure.alt.length > 0).toBeTruthy();
    }
  });
});

describe('arithmetic answers', () => {
  it('recomputes math and pattern answers', () => {
    const checked = questions.filter((question) => expectedChoice(question) != null);
    expect(checked.length).toBeGreaterThan(700);
    for (const question of checked) {
      expect(question.choices[question.answerIndex]).toBe(expectedChoice(question));
      assertQuestion(question);
    }
  });

  it('checks evidence sentences and vocabulary words against the passage', () => {
    const specials = questions.filter((question) => question.verify?.kind === 'evidence' || question.verify?.kind === 'vocab');
    expect(specials.length).toBeGreaterThan(30);
    for (const question of specials) assertQuestion(question);
  });

  it('evaluates integer expressions used by the checkers', () => {
    expect(evalExpr('248+175')).toBe(423);
    expect(evalExpr('(8*6)-10')).toBe(38);
    expect(evalExpr('100-35')).toBe(65);
  });
});

describe('scoring', () => {
  it('keeps creative prompts out of the score', () => {
    const creative = questions.find((question) => !question.scored) as Question;
    const before = emptyProgress();
    const result = recordAnswer(before, creative, 0);
    expect(result.state.allAnswered).toBe(0);
    expect(result.state.allCorrect).toBe(0);
    const saved = saveCreative(before, creative.id, 'A paper clip can be a tiny mast.', true);
    expect(saved.state.allAnswered).toBe(0);
    expect(saved.state.creativeDone).toContain(creative.id);
    expect(saved.newBadges).toContain('idea-spark');
  });

  it('updates a streak and stores a miss', () => {
    const question = questions.find((item) => item.scored) as Question;
    const wrong = question.answerIndex === 0 ? 1 : 0;
    const missed = recordAnswer(emptyProgress(), question, wrong);
    expect(missed.correct).toBe(false);
    expect(missed.state.streak).toBe(0);
    expect(missed.state.mistakes).toContain(question.id);
    const fixed = recordAnswer(missed.state, question, question.answerIndex);
    expect(fixed.correct).toBe(true);
    expect(fixed.state.streak).toBe(1);
    expect(fixed.state.mistakes).not.toContain(question.id);
    expect(fixed.state.clearedMistakes).toBe(1);
  });
});
