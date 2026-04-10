/**
 * HTTP client for the Nest API.
 *
 * Set `NEXT_PUBLIC_API_URL` to the full API base including `/api` (e.g. `https://api.example.com/api`).
 * In development, relative `/api` is avoided: traffic goes to `BACKEND_ORIGIN` (default
 * `http://127.0.0.1:3001`) + `/api` so the browser does not depend on Next rewrites when the API restarts.
 */
function resolveApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv?.startsWith('http://') || fromEnv?.startsWith('https://')) {
    return fromEnv.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') {
        return `http://${h}:3001/api`;
      }
    }
    const o = (process.env.BACKEND_ORIGIN ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
    return `${o}/api`;
  }
  if (fromEnv?.startsWith('/')) {
    return fromEnv.replace(/\/$/, '');
  }
  return 'http://127.0.0.1:3001/api';
}

/** Nest /health lives outside the /api prefix. */
export function getBackendOrigin(): string {
  const base = resolveApiBase();
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return base.replace(/\/api\/?$/, '') || 'http://127.0.0.1:3001';
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://127.0.0.1:3001';
}

const isDev = process.env.NODE_ENV === 'development';
const DEV_RETRIES = 3;
const DEV_RETRY_MS = 400;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export class ApiError extends Error {
  constructor(message: string, public status?: number, public body?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const method = (options.method ?? 'GET').toUpperCase();
  // Do not set JSON Content-Type on GET/HEAD — it triggers a CORS preflight on cross-origin calls
  // (e.g. localhost:3020 → 127.0.0.1:3001) and can break dev if OPTIONS is not handled as expected.
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };
  if (method !== 'GET' && method !== 'HEAD' && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const base = resolveApiBase();
  const url = path.startsWith('http') ? path : `${base}${path}`;

  const maxAttempts = isDev ? DEV_RETRIES : 1;
  let lastNetworkError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers });

      if (res.ok) {
        return res.json() as Promise<T>;
      }

      const retryHttp =
        isDev &&
        attempt < maxAttempts &&
        (res.status === 502 || res.status === 503 || res.status === 504);

      if (retryHttp) {
        await sleep(DEV_RETRY_MS * attempt);
        continue;
      }

      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(err.message ?? `Request failed (${res.status})`, res.status, err);
    } catch (e) {
      if (e instanceof ApiError) {
        throw e;
      }
      lastNetworkError = e;
      if (isDev && attempt < maxAttempts) {
        await sleep(DEV_RETRY_MS * attempt);
        continue;
      }
      throw e;
    }
  }

  throw lastNetworkError;
}
