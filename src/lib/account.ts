import { normalizeProgress } from './progress';
import type { Progress } from '../types';

export type ProviderId = 'google' | 'microsoft' | 'github';

export interface SessionInfo {
  signedIn: boolean;
  displayName?: string;
  provider?: ProviderId;
}

const cacheKey = 'sunny-steps.account.v1';
const declinePrefix = 'sunny-steps.merge-declined.';

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

export async function loadRemote(): Promise<{ hasSaved: boolean; progress: Progress | null } | null> {
  const body = (await send('/api/progress')) as { hasSaved?: boolean; progress?: unknown } | null;
  if (!body) return null;
  if (!body.hasSaved) return { hasSaved: false, progress: null };
  const progress = normalizeProgress(body.progress);
  return progress ? { hasSaved: true, progress } : null;
}

export async function saveRemote(progress: Progress): Promise<boolean> {
  const body = await send('/api/progress', { method: 'PUT', body: JSON.stringify(progress) });
  return Boolean(body);
}

export async function mergeRemote(local: Progress): Promise<Progress | null> {
  const body = (await send('/api/progress', {
    method: 'POST',
    body: JSON.stringify({ action: 'merge', local }),
  })) as { progress?: unknown } | null;
  if (!body) return null;
  return normalizeProgress(body.progress);
}

export function startSignIn(provider: ProviderId): void {
  window.location.assign(`/api/auth/${provider}/start`);
}

export async function logoutRemote(): Promise<void> {
  await send('/api/auth/logout', { method: 'POST' });
}

export function readAccountCache(): Progress | null {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeAccountCache(progress: Progress): void {
  sessionStorage.setItem(cacheKey, JSON.stringify(progress));
}

export function clearAccountCache(): void {
  sessionStorage.removeItem(cacheKey);
}

export function mergeDeclined(provider: string): boolean {
  return localStorage.getItem(declinePrefix + provider) === '1';
}

export function declineMerge(provider: string): void {
  localStorage.setItem(declinePrefix + provider, '1');
}
