export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
}

export interface D1Database {
  prepare(query: string): D1Statement;
}

export interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  MICROSOFT_CLIENT_ID?: string;
  MICROSOFT_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

export type ProviderId = 'google' | 'microsoft' | 'github';

export const providers: ProviderId[] = ['google', 'microsoft', 'github'];

export interface PagesContext {
  request: Request;
  env: Env;
  params: { provider?: string };
}

export function isProvider(value: string | undefined): value is ProviderId {
  return value === 'google' || value === 'microsoft' || value === 'github';
}

export function clientId(env: Env, provider: ProviderId): string {
  if (provider === 'google') return env.GOOGLE_CLIENT_ID?.trim() || '';
  if (provider === 'microsoft') return env.MICROSOFT_CLIENT_ID?.trim() || '';
  return env.GITHUB_CLIENT_ID?.trim() || '';
}

export function clientSecret(env: Env, provider: ProviderId): string {
  if (provider === 'google') return env.GOOGLE_CLIENT_SECRET?.trim() || '';
  if (provider === 'microsoft') return env.MICROSOFT_CLIENT_SECRET?.trim() || '';
  return env.GITHUB_CLIENT_SECRET?.trim() || '';
}

export function sessionSecret(env: Env): string {
  return env.SESSION_SECRET?.trim() || '';
}

export function secretReady(env: Env): boolean {
  return sessionSecret(env).length >= 16;
}

export function configuredProviders(env: Env): ProviderId[] {
  if (!secretReady(env)) return [];
  return providers.filter((provider) => clientId(env, provider) && clientSecret(env, provider));
}
