import { describe, expect, it } from 'vitest';
import { emptyProgress, mergeProgress, normalizeProgress } from '../lib/progress';
import { OAUTH_COOKIE, SESSION_COOKIE, readPayload, sha256Base64Url } from './crypto';
import type { D1Database, D1Statement, Env } from './env';
import {
  handleAuthCallback,
  handleAuthStart,
  handleLogout,
  handleProgress,
  handleProviders,
  handleSession,
} from './handlers';
import { queries } from './store';

const secret = 'test-secret-value-0123456789';
const now = 1_763_000_000_000;

class MemoryDb implements D1Database {
  rates = new Map<string, { hits: number; reset_at: number }>();
  users = new Map<string, { name: string }>();
  progress = new Map<string, string>();

  prepare(query: string): D1Statement {
    const self = this;
    let bound: unknown[] = [];
    const statement: D1Statement = {
      bind(...values: unknown[]) {
        bound = values;
        return statement;
      },
      first: async <T>() => {
        if (query === queries.rateSelect) {
          return (self.rates.get(String(bound[0])) as T) ?? null;
        }
        if (query === queries.progressSelect) {
          const payload = self.progress.get(`${bound[0]}:${bound[1]}`);
          return payload ? ({ payload } as T) : null;
        }
        return null;
      },
      run: async () => {
        if (query === queries.rateUpsert) {
          self.rates.set(String(bound[0]), { hits: Number(bound[1]), reset_at: Number(bound[2]) });
        } else if (query === queries.rateBump) {
          const row = self.rates.get(String(bound[0]));
          if (row) row.hits += 1;
        } else if (query === queries.userUpsert) {
          self.users.set(`${bound[0]}:${bound[1]}`, { name: String(bound[2]) });
        } else if (query === queries.progressUpsert) {
          self.progress.set(`${bound[0]}:${bound[1]}`, String(bound[2]));
        }
        return { success: true };
      },
    };
    return statement;
  }
}

function env(db: MemoryDb, extra: Partial<Env> = {}): Env {
  return {
    DB: db,
    SESSION_SECRET: secret,
    GOOGLE_CLIENT_ID: 'google-id',
    GOOGLE_CLIENT_SECRET: 'google-secret',
    ...extra,
  };
}

function cookiesOf(response: Response): string[] {
  return response.headers.getSetCookie();
}

function cookieValue(response: Response, name: string): string {
  const row = cookiesOf(response).find((item) => item.startsWith(`${name}=`));
  if (!row) return '';
  return row.slice(name.length + 1).split(';')[0];
}

describe('sign-in handlers', () => {
  it('hides providers that have no keys', async () => {
    const db = new MemoryDb();
    const hidden = await handleProviders(env(db));
    expect(await hidden.json()).toEqual({ providers: ['google'] });
    const none = await handleProviders(env(db, { GOOGLE_CLIENT_ID: '', SESSION_SECRET: 'short' }));
    expect(await none.json()).toEqual({ providers: [] });
  });

  it('starts the code flow with PKCE and a signed state cookie', async () => {
    const db = new MemoryDb();
    const response = await handleAuthStart(new Request('https://elementary.aiteksolutions.net/api/auth/google/start'), env(db), 'google', {
      now: () => now,
    });
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get('location') || '');
    expect(location.origin).toBe('https://accounts.google.com');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('redirect_uri')).toBe('https://elementary.aiteksolutions.net/api/auth/google/callback');
    const setCookie = cookiesOf(response)[0] || '';
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Lax');
    const txn = await readPayload<{ state: string; verifier: string }>(cookieValue(response, OAUTH_COOKIE), secret);
    expect(txn?.state).toBe(location.searchParams.get('state'));
    expect(await sha256Base64Url(txn?.verifier || '')).toBe(location.searchParams.get('code_challenge'));
  });

  it('rejects a callback whose state does not match', async () => {
    const db = new MemoryDb();
    const start = await handleAuthStart(new Request('https://elementary.aiteksolutions.net/api/auth/google/start'), env(db), 'google', {
      now: () => now,
    });
    const response = await handleAuthCallback(
      new Request('https://elementary.aiteksolutions.net/api/auth/google/callback?code=good-code&state=wrong-state-value', {
        headers: { cookie: `${OAUTH_COOKIE}=${cookieValue(start, OAUTH_COOKIE)}` },
      }),
      env(db),
      'google',
      { now: () => now },
    );
    expect(response.headers.get('location')).toContain('auth=error');
    expect(db.users.size).toBe(0);
    expect(cookiesOf(response).some((item) => item.startsWith(`${SESSION_COOKIE}=`) && !item.startsWith(`${SESSION_COOKIE}=;`))).toBe(false);
  });

  it('stores a display name and sets a signed session cookie', async () => {
    const db = new MemoryDb();
    const start = await handleAuthStart(new Request('https://elementary.aiteksolutions.net/api/auth/github/start'), env(db, {
      GITHUB_CLIENT_ID: 'gh-id',
      GITHUB_CLIENT_SECRET: 'gh-secret',
    }), 'github', { now: () => now });
    const txn = await readPayload<{ verifier: string; state: string }>(cookieValue(start, OAUTH_COOKIE), secret);
    let tokenBody = '';
    const response = await handleAuthCallback(
      new Request(`https://elementary.aiteksolutions.net/api/auth/github/callback?code=good-code&state=${txn?.state}`, {
        headers: { cookie: `${OAUTH_COOKIE}=${cookieValue(start, OAUTH_COOKIE)}` },
      }),
      env(db, { GITHUB_CLIENT_ID: 'gh-id', GITHUB_CLIENT_SECRET: 'gh-secret' }),
      'github',
      {
        now: () => now,
        fetch: async (input, init) => {
          const url = String(input);
          if (url.includes('oauth/access_token')) {
            tokenBody = String(init?.body || '');
            return new Response(JSON.stringify({ access_token: 'token-value' }));
          }
          return new Response(JSON.stringify({ id: 42, name: null, login: 'sam' }));
        },
      },
    );
    expect(tokenBody).toContain(txn?.verifier);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://elementary.aiteksolutions.net/#/practice');
    const sessionCookie = cookiesOf(response).find((item) => item.startsWith(`${SESSION_COOKIE}=`)) || '';
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('Secure');
    expect(sessionCookie).toContain('SameSite=Lax');
    const session = await readPayload<{ name: string; sub: string }>(cookieValue(response, SESSION_COOKIE), secret);
    expect(session?.name).toBe('sam');
    expect(session?.sub).toBe('42');
    expect(db.users.get('github:42')?.name).toBe('sam');
    const raw = cookieValue(response, SESSION_COOKIE);
    const tampered = `${raw.slice(0, -1)}${raw.endsWith('a') ? 'b' : 'a'}`;
    expect(await readPayload(tampered, secret)).toBeNull();
    const who = await handleSession(new Request('https://elementary.aiteksolutions.net/api/auth/session', {
      headers: { cookie: `${SESSION_COOKIE}=${cookieValue(response, SESSION_COOKIE)}` },
    }), env(db), { now: () => now });
    expect(await who.json()).toEqual({ signedIn: true, displayName: 'sam', provider: 'github' });
  });

  it('clears the session cookie on logout', async () => {
    const response = await handleLogout();
    const cookie = cookiesOf(response)[0] || '';
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
  });
});

describe('progress handlers', () => {
  async function signedCookie(): Promise<string> {
    const db = new MemoryDb();
    const start = await handleAuthStart(new Request('https://elementary.aiteksolutions.net/api/auth/google/start'), env(db), 'google', {
      now: () => now,
    });
    const txn = await readPayload<{ state: string }>(cookieValue(start, OAUTH_COOKIE), secret);
    const response = await handleAuthCallback(
      new Request(`https://elementary.aiteksolutions.net/api/auth/google/callback?code=good-code&state=${txn?.state}`, {
        headers: { cookie: `${OAUTH_COOKIE}=${cookieValue(start, OAUTH_COOKIE)}` },
      }),
      env(db),
      'google',
      {
        now: () => now,
        fetch: async () => new Response(JSON.stringify({ access_token: 'token-value', sub: 'student-1', name: 'Ada' })),
      },
    );
    return cookieValue(response, SESSION_COOKIE);
  }

  function authed(path: string, method: string, cookie: string, body?: unknown, origin = 'https://elementary.aiteksolutions.net'): Request {
    return new Request(`https://elementary.aiteksolutions.net${path}`, {
      method,
      headers: {
        cookie: `${SESSION_COOKIE}=${cookie}`,
        origin,
        'x-elementary-request': '1',
        'content-type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  it('rejects missing, cross-site, and invalid writes', async () => {
    const db = new MemoryDb();
    const open = await handleProgress(new Request('https://elementary.aiteksolutions.net/api/progress'), env(db), { now: () => now });
    expect(open.status).toBe(401);
    const cookie = await signedCookie();
    const foreign = await handleProgress(authed('/api/progress', 'PUT', cookie, emptyProgress(), 'https://example.com'), env(db), { now: () => now });
    expect(foreign.status).toBe(403);
    const bad = await handleProgress(authed('/api/progress', 'PUT', cookie, { version: 2 }), env(db), { now: () => now });
    expect(bad.status).toBe(400);
  });

  it('saves valid scores, merges a visit into the account, and rate limits writes', async () => {
    const db = new MemoryDb();
    const cookie = await signedCookie();
    const local = emptyProgress();
    local.allAnswered = 4;
    local.allCorrect = 3;
    local.streak = 2;
    local.bestStreak = 2;
    local.mistakes = ['g3-va-001'];
    local.skills = { 'L.3.5': { label: 'Word relationships', correct: 3, attempts: 4 } };
    const saved = await handleProgress(authed('/api/progress', 'PUT', cookie, local), env(db), { now: () => now });
    expect(saved.status).toBe(200);
    const read = await handleProgress(new Request('https://elementary.aiteksolutions.net/api/progress', {
      headers: { cookie: `${SESSION_COOKIE}=${cookie}` },
    }), env(db), { now: () => now });
    const body = await read.json() as { hasSaved: boolean; progress: { allCorrect: number; badges: string[] } };
    expect(body.hasSaved).toBe(true);
    expect(body.progress.allCorrect).toBe(3);
    expect(body.progress.badges).toContain('first-star');
    expect(body.progress.badges).not.toContain('made-up');

    const other = emptyProgress();
    other.allAnswered = 2;
    other.allCorrect = 2;
    other.bestStreak = 2;
    other.mistakes = ['g3-va-002'];
    const merged = await handleProgress(authed('/api/progress', 'POST', cookie, { action: 'merge', local: other }), env(db), { now: () => now });
    const mergedBody = await merged.json() as { progress: { allCorrect: number; mistakes: string[] } };
    expect(mergedBody.progress.allCorrect).toBe(3);
    expect(mergedBody.progress.mistakes.sort()).toEqual(['g3-va-001', 'g3-va-002']);

    let blocked = 0;
    for (let count = 0; count < 50; count += 1) {
      const response = await handleProgress(authed('/api/progress', 'PUT', cookie, emptyProgress()), env(db), { now: () => now });
      if (response.status === 429) blocked += 1;
    }
    expect(blocked).toBeGreaterThan(0);
  });
});

describe('score merge', () => {
  it('keeps the stronger counts and both mistake lists', () => {
    const local = emptyProgress();
    local.allAnswered = 5;
    local.allCorrect = 4;
    local.bestStreak = 4;
    local.streak = 4;
    local.mistakes = ['g3-va-003'];
    local.creativeNotes = { 'g3-cr-001': 'short' };
    const remote = emptyProgress();
    remote.allAnswered = 9;
    remote.allCorrect = 6;
    remote.bestStreak = 3;
    remote.streak = 1;
    remote.mistakes = ['g3-va-004'];
    remote.creativeNotes = { 'g3-cr-001': 'a longer idea' };
    const merged = mergeProgress(local, remote);
    expect(merged.allAnswered).toBe(9);
    expect(merged.allCorrect).toBe(6);
    expect(merged.bestStreak).toBe(4);
    expect(merged.streak).toBe(4);
    expect(merged.mistakes.sort()).toEqual(['g3-va-003', 'g3-va-004']);
    expect(merged.creativeNotes['g3-cr-001']).toBe('a longer idea');
    expect(normalizeProgress({ version: 9 })).toBeNull();
    expect(normalizeProgress(emptyProgress())?.badges).toEqual([]);
  });
});
