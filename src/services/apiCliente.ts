// Llamadas a las funciones de Vercel (/api/*) con la clave de acceso de la app.

export const ACCESS_KEY_STORAGE = 'leadscrapper_access_key';

export function obtenerClaveGuardada(): string {
  try { return localStorage.getItem(ACCESS_KEY_STORAGE) || ''; } catch { return ''; }
}

export function guardarClave(clave: string) {
  try { localStorage.setItem(ACCESS_KEY_STORAGE, clave.trim()); } catch { /* sin localStorage */ }
}

export function borrarClave() {
  try { localStorage.removeItem(ACCESS_KEY_STORAGE); } catch { /* */ }
}

export class ErrorApi extends Error {
  status: number;
  requiereClave: boolean;
  constructor(msg: string, status: number, requiereClave = false) {
    super(msg);
    this.status = status;
    this.requiereClave = requiereClave;
  }
}

export async function llamarApi(url: string, init: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const clave = obtenerClaveGuardada();
  if (clave) headers['x-access-key'] = clave;
  const r = await fetch(url, { ...init, headers: { ...headers, ...((init.headers as any) || {}) } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && data?.requiereClave) {
      borrarClave();
      window.dispatchEvent(new Event('leadscrapper:clave-invalida'));
    }
    throw new ErrorApi(data?.error || `Error ${r.status} al llamar al servidor.`, r.status, !!data?.requiereClave);
  }
  return data;
}
