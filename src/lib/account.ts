import { normalizeGradeBook, normalizeProgress, type GradeBook } from './progress';

export type ProviderId = 'google' | 'microsoft' | 'github';

export interface SessionInfo {
  signedIn: boolean;
  displayName?: string;
  provider?: ProviderId;
}

const cacheKey = 'sunny-steps.account.v1';

async function send(path: string, init?: RequestInit): Promise<unknown> {
  try {
    const headers = new Headers(init?.headers);
    if (init?.method && init.method !== 'GET') headers.set('x-elementary-request', '1');
    const response = await fetch(path, { ...init, headers, credentials: 'same-origin' });
    if (!response.ok) return null;
    const type = response.headers.get('content-type') || '';
    if (!type.includes('json')) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function isProvider(value: string): value is ProviderId {
  return value === 'google' || value === 'microsoft' || value === 'github';
}

export async function loadProviders(): Promise<ProviderId[]> {
  const body = (await send('/api/auth/providers')) as { providers?: string[] } | null;
  return (body?.providers || []).filter(isProvider);
}

export async function loadSession(): Promise<SessionInfo> {
  const body = (await send('/api/auth/session')) as SessionInfo | null;
  if (!body?.signedIn || !body.provider || !body.displayName || !isProvider(body.provider)) return { signedIn: false };
  return body;
}

export async function loadRemote(): Promise<{ hasSaved: boolean; book: GradeBook | null } | null> {
  const body = (await send('/api/progress')) as { hasSaved?: boolean; progress?: unknown; grades?: unknown } | null;
  if (!body) return null;
  if (!body.hasSaved) return { hasSaved: false, book: null };
  const book = normalizeGradeBook({ version: 2, grades: body.grades || {} });
  if (book && Object.keys(book.grades).length) return { hasSaved: true, book };
  const progress = normalizeProgress(body.progress);
  return progress ? { hasSaved: true, book: { version: 2, grades: { '3': progress } } } : null;
}

export async function saveRemote(book: GradeBook): Promise<boolean> {
  const body = await send('/api/progress', { method: 'PUT', body: JSON.stringify(book) });
  return Boolean(body);
}

export async function mergeRemote(book: GradeBook): Promise<GradeBook | null> {
  const body = (await send('/api/progress', {
    method: 'POST',
    body: JSON.stringify({ action: 'merge', book }),
  })) as { grades?: unknown; progress?: unknown } | null;
  if (!body) return null;
  const saved = normalizeGradeBook({ version: 2, grades: body.grades || {} });
  if (saved && Object.keys(saved.grades).length) return saved;
  const progress = normalizeProgress(body.progress);
  return progress ? { version: 2, grades: { '3': progress } } : null;
}

export function startSignIn(provider: ProviderId): void {
  window.location.assign(`/api/auth/${provider}/start`);
}

export async function logoutRemote(): Promise<void> {
  await send('/api/auth/logout', { method: 'POST' });
}

export function readAccountCache(): GradeBook | null {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return normalizeGradeBook(parsed) || (() => {
      const progress = normalizeProgress(parsed);
      return progress ? { version: 2 as const, grades: { '3': progress } } : null;
    })();
  } catch {
    return null;
  }
}

export function writeAccountCache(book: GradeBook): void {
  sessionStorage.setItem(cacheKey, JSON.stringify(book));
}

export function clearAccountCache(): void {
  sessionStorage.removeItem(cacheKey);
}
