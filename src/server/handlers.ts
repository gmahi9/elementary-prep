import { emptyProgress, mergeProgress, normalizeProgress } from '../lib/progress';
import type { Progress } from '../types';
import {
  OAUTH_COOKIE,
  OAUTH_SECONDS,
  SESSION_COOKIE,
  SESSION_SECONDS,
  cleanName,
  clearCookie,
  clientAddress,
  cookieHeader,
  csrfOk,
  randomToken,
  readCookie,
  readPayload,
  sha256Base64Url,
  signPayload,
} from './crypto';
import {
  clientId,
  clientSecret,
  configuredProviders,
  isProvider,
  secretReady,
  sessionSecret,
  type Env,
  type ProviderId,
} from './env';
import { readProgress, saveUser, takeToken, writeProgress } from './store';

const AUTH_LIMIT = 20;
const WRITE_LIMIT = 40;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_BODY = 80_000;

interface Deps {
  fetch?: typeof fetch;
  now?: () => number;
}

interface OAuthTxn {
  v: 1;
  provider: ProviderId;
  state: string;
  verifier: string;
  exp: number;
}

interface SessionPayload {
  v: 1;
  provider: ProviderId;
  sub: string;
  name: string;
  iat: number;
  exp: number;
}

const specs: Record<ProviderId, { auth: string; token: string; userinfo: string; scope: string }> = {
  google: {
    auth: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid profile',
  },
  microsoft: {
    auth: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userinfo: 'https://graph.microsoft.com/oidc/userinfo',
    scope: 'openid profile',
  },
  github: {
    auth: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    userinfo: 'https://api.github.com/user',
    scope: 'read:user',
  },
};

function nowMs(deps?: Deps): number {
  return deps?.now ? deps.now() : Date.now();
}

function json(data: unknown, status = 200, extra?: Record<string, string>): Response {
  const headers = new Headers(extra);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(JSON.stringify(data), { status, headers });
}

function redirect(request: Request, error = false, cookies: string[] = []): Response {
  const target = new URL(request.url);
  const location = `${target.origin}/#/practice${error ? '?auth=error' : ''}`;
  const headers = new Headers({ location, 'cache-control': 'no-store' });
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response(null, { status: 302, headers });
}

function callbackUrl(request: Request, provider: ProviderId): string {
  return `${new URL(request.url).origin}/api/auth/${provider}/callback`;
}

async function readSession(request: Request, env: Env, now: number): Promise<SessionPayload | null> {
  if (!secretReady(env)) return null;
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const payload = await readPayload<SessionPayload>(token, sessionSecret(env));
  if (!payload || payload.v !== 1 || !isProvider(payload.provider)) return null;
  if (typeof payload.sub !== 'string' || typeof payload.name !== 'string') return null;
  if (!Number.isInteger(payload.exp) || payload.exp <= now) return null;
  if (payload.sub.length < 1 || payload.sub.length > 128) return null;
  return payload;
}

function profileFrom(provider: ProviderId, data: Record<string, unknown>): { id: string; name: string } | null {
  if (provider === 'github') {
    if (typeof data.id !== 'number' && typeof data.id !== 'string') return null;
    const id = String(data.id);
    if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) return null;
    const name = cleanName(data.name) || cleanName(data.login);
    if (!name) return null;
    return { id, name };
  }
  if (typeof data.sub !== 'string' || data.sub.length < 1 || data.sub.length > 128 || /[\u0000-\u0020\u007F]/.test(data.sub)) return null;
  return { id: data.sub, name: cleanName(data.name, 'Student') };
}

export async function handleProviders(env: Env): Promise<Response> {
  return json({ providers: configuredProviders(env) });
}

export async function handleSession(request: Request, env: Env, deps?: Deps): Promise<Response> {
  const session = await readSession(request, env, nowMs(deps));
  if (!session) return json({ signedIn: false });
  return json({ signedIn: true, displayName: session.name, provider: session.provider });
}

export async function handleLogout(): Promise<Response> {
  const headers = new Headers({ 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' });
  headers.append('set-cookie', clearCookie(SESSION_COOKIE));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export async function handleAuthStart(request: Request, env: Env, provider: string | undefined, deps?: Deps): Promise<Response> {
  if (!isProvider(provider)) return json({ error: 'Unknown provider' }, 404);
  if (!secretReady(env)) return json({ error: 'Sign-in is not configured' }, 503);
  if (!configuredProviders(env).includes(provider)) return json({ error: 'Provider unavailable' }, 404);
  const now = nowMs(deps);
  const allowed = await takeToken(env.DB, `auth:${clientAddress(request)}`, AUTH_LIMIT, WINDOW_MS, now);
  if (!allowed) return json({ error: 'Too many requests' }, 429, { 'retry-after': '60' });
  const state = randomToken(16);
  const verifier = randomToken(32);
  const challenge = await sha256Base64Url(verifier);
  const txn: OAuthTxn = { v: 1, provider, state, verifier, exp: now + OAUTH_SECONDS * 1000 };
  const spec = specs[provider];
  const params = new URLSearchParams({
    client_id: clientId(env, provider),
    redirect_uri: callbackUrl(request, provider),
    response_type: 'code',
    scope: spec.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  if (provider === 'google') params.set('prompt', 'select_account');
  const headers = new Headers({
    location: `${spec.auth}?${params.toString()}`,
    'cache-control': 'no-store',
  });
  headers.append('set-cookie', cookieHeader(OAUTH_COOKIE, await signPayload(txn, sessionSecret(env)), OAUTH_SECONDS));
  return new Response(null, { status: 302, headers });
}

export async function handleAuthCallback(
  request: Request,
  env: Env,
  provider: string | undefined,
  deps?: Deps,
): Promise<Response> {
  if (!isProvider(provider) || !secretReady(env) || !configuredProviders(env).includes(provider)) {
    return redirect(request, true, [clearCookie(OAUTH_COOKIE)]);
  }
  const now = nowMs(deps);
  const allowed = await takeToken(env.DB, `auth:${clientAddress(request)}`, AUTH_LIMIT, WINDOW_MS, now);
  if (!allowed) return redirect(request, true, [clearCookie(OAUTH_COOKIE)]);
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  if (!/^[A-Za-z0-9._~-]{4,1024}$/.test(code) || !/^[A-Za-z0-9_-]{10,128}$/.test(state)) {
    return redirect(request, true, [clearCookie(OAUTH_COOKIE)]);
  }
  const token = readCookie(request, OAUTH_COOKIE);
  const txn = token ? await readPayload<OAuthTxn>(token, sessionSecret(env)) : null;
  if (!txn || txn.v !== 1 || txn.provider !== provider || txn.exp <= now || txn.state !== state || !txn.verifier) {
    return redirect(request, true, [clearCookie(OAUTH_COOKIE)]);
  }
  const spec = specs[provider];
  const fetchImpl = deps?.fetch || fetch;
  try {
    const tokenResponse = await fetchImpl(spec.token, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        client_id: clientId(env, provider),
        client_secret: clientSecret(env, provider),
        code,
        redirect_uri: callbackUrl(request, provider),
        grant_type: 'authorization_code',
        code_verifier: txn.verifier,
      }),
    });
    if (!tokenResponse.ok) return redirect(request, true, [clearCookie(OAUTH_COOKIE)]);
    const tokenBody = (await tokenResponse.json()) as { access_token?: unknown };
    if (typeof tokenBody.access_token !== 'string' || tokenBody.access_token.length < 8) {
      return redirect(request, true, [clearCookie(OAUTH_COOKIE)]);
    }
    const profileResponse = await fetchImpl(spec.userinfo, {
      headers: {
        authorization: `Bearer ${tokenBody.access_token}`,
        accept: 'application/json',
        'user-agent': 'elementary-prep',
      },
    });
    if (!profileResponse.ok) return redirect(request, true, [clearCookie(OAUTH_COOKIE)]);
    const profile = profileFrom(provider, (await profileResponse.json()) as Record<string, unknown>);
    if (!profile) return redirect(request, true, [clearCookie(OAUTH_COOKIE)]);
    await saveUser(env.DB, provider, profile.id, profile.name, now);
    const session: SessionPayload = {
      v: 1,
      provider,
      sub: profile.id,
      name: profile.name,
      iat: now,
      exp: now + SESSION_SECONDS * 1000,
    };
    return redirect(request, false, [
      cookieHeader(SESSION_COOKIE, await signPayload(session, sessionSecret(env)), SESSION_SECONDS),
      clearCookie(OAUTH_COOKIE),
    ]);
  } catch {
    return redirect(request, true, [clearCookie(OAUTH_COOKIE)]);
  }
}

async function bodyProgress(request: Request): Promise<unknown> {
  const claimed = Number(request.headers.get('content-length') || 0);
  if (claimed > MAX_BODY) return null;
  const text = await request.text();
  if (text.length > MAX_BODY) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function handleProgress(request: Request, env: Env, deps?: Deps): Promise<Response> {
  const now = nowMs(deps);
  const session = await readSession(request, env, now);
  if (!session) return json({ error: 'Sign in required' }, 401);
  if (request.method === 'GET') {
    try {
      const payload = await readProgress(env.DB, session.provider, session.sub);
      if (!payload) return json({ hasSaved: false, progress: null });
      const progress = normalizeProgress(JSON.parse(payload));
      if (!progress) return json({ error: 'Saved scores could not be read' }, 500);
      return json({ hasSaved: true, progress });
    } catch {
      return json({ error: 'Saved scores could not be read' }, 500);
    }
  }
  if (request.method !== 'PUT' && request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!csrfOk(request)) return json({ error: 'Request was rejected' }, 403);
  const allowed = await takeToken(env.DB, `write:${session.provider}:${session.sub}`, WRITE_LIMIT, WINDOW_MS, now);
  if (!allowed) return json({ error: 'Too many requests' }, 429, { 'retry-after': '60' });
  const body = await bodyProgress(request);
  if (body == null) return json({ error: 'Scores were not valid' }, 400);
  try {
    if (request.method === 'PUT') {
      const progress = normalizeProgress(body);
      if (!progress) return json({ error: 'Scores were not valid' }, 400);
      await writeProgress(env.DB, session.provider, session.sub, JSON.stringify(progress), now);
      return json({ ok: true, progress });
    }
    const record = body as { action?: unknown; local?: unknown };
    if (record.action !== 'merge') return json({ error: 'Scores were not valid' }, 400);
    const local = normalizeProgress(record.local);
    if (!local) return json({ error: 'Scores were not valid' }, 400);
    const existingRaw = await readProgress(env.DB, session.provider, session.sub);
    const existing = existingRaw ? normalizeProgress(JSON.parse(existingRaw)) : emptyProgress();
    if (existingRaw && !existing) return json({ error: 'Saved scores could not be read' }, 500);
    const merged: Progress = mergeProgress(local, existing || emptyProgress());
    await writeProgress(env.DB, session.provider, session.sub, JSON.stringify(merged), now);
    return json({ ok: true, progress: merged });
  } catch {
    return json({ error: 'Scores could not be saved' }, 500);
  }
}
