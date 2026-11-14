import { beforeEach, describe, expect, it } from 'vitest';
import type { Progress } from '../types';
import { emptyProgress, type KeyStore } from './progress';

class MemoryStore implements KeyStore {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key) || '' : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

function visit(): Progress {
  const progress = emptyProgress();
  progress.allAnswered = 4;
  progress.allCorrect = 3;
  progress.streak = 2;
  progress.bestStreak = 2;
  progress.mistakes = ['g3-va-001'];
  progress.mockTests = 1;
  progress.mockHistory = [{ id: 'm-abc123', at: 1_763_000_000_000, section: 'mix', correct: 3, total: 4 }];
  return progress;
}

describe('guest progress storage', () => {
  beforeEach(async () => {
    const { resetVisitRecall } = await import('./progress');
    resetVisitRecall();
  });

  it('clears stored guest progress and leaves preferences', async () => {
    const { CARRY_KEY, GUEST_DATABASES, MERGE_DECLINED_PREFIX, PREFERENCE_KEYS, PROGRESS_KEY, SESSION_KEY, clearStoredGuestProgress } = await import('./progress');
    const local = new MemoryStore();
    const session = new MemoryStore();
    local.setItem(PROGRESS_KEY, '{"version":1}');
    local.setItem(SESSION_KEY, '{"correct":1,"answered":1}');
    local.setItem(`${MERGE_DECLINED_PREFIX}google`, '1');
    local.setItem('sunny-steps.account.v1', 'keep-account');
    session.setItem(PROGRESS_KEY, '{"version":1}');
    session.setItem(SESSION_KEY, '{"correct":2,"answered":2}');
    session.setItem('sunny-steps.account.v1', '{"version":1}');
    session.setItem(CARRY_KEY, '{"progress":true}');
    for (const key of PREFERENCE_KEYS) local.setItem(key, 'on');
    const dropped: string[] = [];

    clearStoredGuestProgress({
      local,
      session,
      dropDatabase: (name) => dropped.push(name),
    });

    expect(local.getItem(PROGRESS_KEY)).toBeNull();
    expect(local.getItem(SESSION_KEY)).toBeNull();
    expect(local.getItem(`${MERGE_DECLINED_PREFIX}google`)).toBeNull();
    expect(local.getItem('sunny-steps.account.v1')).toBe('keep-account');
    for (const key of PREFERENCE_KEYS) expect(local.getItem(key)).toBe('on');
    expect(session.getItem(PROGRESS_KEY)).toBeNull();
    expect(session.getItem(SESSION_KEY)).toBeNull();
    expect(session.getItem('sunny-steps.account.v1')).toBe('{"version":1}');
    expect(session.getItem(CARRY_KEY)).toBe('{"progress":true}');
    expect(dropped).toEqual([...GUEST_DATABASES]);
  });

  it('does not throw when the browser stores are missing', async () => {
    const { clearStoredGuestProgress } = await import('./progress');
    expect(() => clearStoredGuestProgress({ local: null, session: null, dropDatabase: () => undefined })).not.toThrow();
  });
});

describe('visit carry', () => {
  beforeEach(async () => {
    const { resetVisitRecall } = await import('./progress');
    resetVisitRecall();
  });

  it('keeps the visit for a sign-in redirect and then only in memory', async () => {
    const { CARRY_KEY, PROGRESS_KEY, clearVisitCarry, readVisitCarry, recallVisit, writeVisitCarry } = await import('./progress');
    const session = new MemoryStore();
    const local = new MemoryStore();
    const progress = visit();
    writeVisitCarry(progress, { correct: 3, answered: 4 }, session);
    expect(local.getItem(PROGRESS_KEY)).toBeNull();
    expect(session.getItem(CARRY_KEY)).toContain('"allCorrect":3');

    const carried = readVisitCarry(session);
    expect(carried?.progress.allCorrect).toBe(3);
    expect(carried?.progress.mistakes).toEqual(['g3-va-001']);
    expect(carried?.progress.mockTests).toBe(1);
    expect(carried?.session).toEqual({ correct: 3, answered: 4 });

    expect(recallVisit(session)?.progress.bestStreak).toBe(2);
    expect(session.getItem(CARRY_KEY)).toBeNull();
    expect(recallVisit(session)?.progress.allAnswered).toBe(4);
    clearVisitCarry(session);
    expect(recallVisit(session)?.session.correct).toBe(3);
  });

  it('drops a broken handoff and an impossible session score', async () => {
    const { CARRY_KEY, readVisitCarry, writeVisitCarry } = await import('./progress');
    const session = new MemoryStore();
    writeVisitCarry(visit(), { correct: 9, answered: 1 }, session);
    expect(readVisitCarry(session)?.session).toEqual({ correct: 0, answered: 0 });
    session.setItem(CARRY_KEY, '{not json');
    expect(readVisitCarry(session)).toBeNull();
    session.setItem(CARRY_KEY, JSON.stringify({ progress: { version: 9 }, session: { correct: 1, answered: 1 } }));
    expect(readVisitCarry(session)).toBeNull();
  });
});

describe('progress notice', () => {
  it('asks guests to sign in, and says the visit resets when sign-in is unavailable', async () => {
    const { PROGRESS_RESETS_NOTE, SIGN_IN_SAVE_PROMPT, progressNotice } = await import('./progress');
    expect(progressNotice(false, 2)).toBe(SIGN_IN_SAVE_PROMPT);
    expect(progressNotice(false, 1)).toBe('Sign in to save your progress');
    expect(progressNotice(true, 2)).toBeNull();
    expect(progressNotice(false, 0)).toBe(PROGRESS_RESETS_NOTE);
    expect(progressNotice(false, 0)).toBe('Progress resets when you leave.');
  });
});
