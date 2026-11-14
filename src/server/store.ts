import type { D1Database } from './env';

export const queries = {
  rateSelect: 'SELECT hits, reset_at FROM rate_limits WHERE bucket = ?',
  rateUpsert: 'INSERT INTO rate_limits (bucket, hits, reset_at) VALUES (?, ?, ?) ON CONFLICT(bucket) DO UPDATE SET hits = excluded.hits, reset_at = excluded.reset_at',
  rateBump: 'UPDATE rate_limits SET hits = hits + 1 WHERE bucket = ?',
  userUpsert: 'INSERT INTO users (provider, provider_user_id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(provider, provider_user_id) DO UPDATE SET display_name = excluded.display_name, updated_at = excluded.updated_at',
  progressSelect: 'SELECT payload FROM progress WHERE provider = ? AND provider_user_id = ?',
  progressUpsert: 'INSERT INTO progress (provider, provider_user_id, payload, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(provider, provider_user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at',
} as const;

export async function takeToken(db: D1Database, bucket: string, limit: number, windowMs: number, now: number): Promise<boolean> {
  const row = await db.prepare(queries.rateSelect).bind(bucket).first<{ hits: number; reset_at: number }>();
  if (!row || now >= Number(row.reset_at)) {
    await db.prepare(queries.rateUpsert).bind(bucket, 1, now + windowMs).run();
    return true;
  }
  if (Number(row.hits) >= limit) return false;
  await db.prepare(queries.rateBump).bind(bucket).run();
  return true;
}

export async function saveUser(db: D1Database, provider: string, userId: string, name: string, now: number): Promise<void> {
  await db.prepare(queries.userUpsert).bind(provider, userId, name, now, now).run();
}

export async function readProgress(db: D1Database, provider: string, userId: string): Promise<string | null> {
  const row = await db.prepare(queries.progressSelect).bind(provider, userId).first<{ payload: string }>();
  return row?.payload ?? null;
}

export async function writeProgress(db: D1Database, provider: string, userId: string, payload: string, now: number): Promise<void> {
  await db.prepare(queries.progressUpsert).bind(provider, userId, payload, now).run();
}
