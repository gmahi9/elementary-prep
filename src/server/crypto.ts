const textEncoder = new TextEncoder();

export const SESSION_COOKIE = '__Host-elementary_session';
export const OAUTH_COOKIE = '__Host-elementary_oauth';
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const OAUTH_SECONDS = 600;

export function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

export function randomToken(size = 32): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return base64url(new Uint8Array(digest));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', textEncoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signPayload(payload: object, secret: string): Promise<string> {
  const body = base64url(textEncoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(body));
  return `${body}.${base64url(new Uint8Array(signature))}`;
}

export async function readPayload<T>(token: string, secret: string): Promise<T | null> {
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return null;
  const body = token.slice(0, dot);
  const signature = fromBase64Url(token.slice(dot + 1));
  if (!signature) return null;
  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify('HMAC', key, signature, textEncoder.encode(body));
  if (!valid) return null;
  const decoded = fromBase64Url(body);
  if (!decoded) return null;
  try {
    return JSON.parse(new TextDecoder().decode(decoded)) as T;
  } catch {
    return null;
  }
}

export function cookieHeader(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const item = part.trim();
    const eq = item.indexOf('=');
    if (eq === -1) continue;
    if (item.slice(0, eq) === name) return item.slice(eq + 1);
  }
  return null;
}

export function clientAddress(request: Request): string {
  const value = request.headers.get('cf-connecting-ip') || '';
  if (/^[A-Za-z0-9:.]{3,64}$/.test(value)) return value;
  return 'unknown';
}

export function csrfOk(request: Request): boolean {
  if (request.headers.get('x-elementary-request') !== '1') return false;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const expected = new URL(request.url);
    const actual = new URL(origin);
    return actual.protocol === expected.protocol && actual.host === expected.host;
  } catch {
    return false;
  }
}

export function cleanName(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 80);
  return cleaned || fallback;
}
