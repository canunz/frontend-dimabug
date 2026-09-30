import { environment } from '../../../environments/environment';

/**
 * Host del backend. En `ng serve` las peticiones usan `/api` (proxy.conf.json)
 * para evitar CORS; el proxy apunta a `environment.apiUrl`.
 */
export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  const host = (environment.apiUrl || '').replace(/\/$/, '');

  if (!environment.production) {
    return `/api${suffix}`;
  }

  if (!host || host === '/api') {
    return `/api${suffix}`;
  }

  return `${host}/api${suffix}`;
}

/** Endpoints públicos: no llevan JWT. */
export const PUBLIC_API_PATHS = ['/api/auth/login', '/api/health'] as const;

export function isPublicApiUrl(url: string): boolean {
  return PUBLIC_API_PATHS.some((path) => url.includes(path));
}
