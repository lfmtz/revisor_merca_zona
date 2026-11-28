// Llamadas a las funciones de Vercel (/api/*) con la clave de acceso de la app.

export const ACCESS_KEY_STORAGE = 'leadscrapper_access_key';

const VENCE_STORAGE = 'leadscrapper_sesion_vence';
export const HORAS_SESION = 8;          // sesión normal
export const DIAS_RECORDAR = 30;        // "mantener sesión en este dispositivo"

export function obtenerClaveGuardada(): string {
  try {
    const clave = localStorage.getItem(ACCESS_KEY_STORAGE) || '';
    const vence = Number(localStorage.getItem(VENCE_STORAGE) || 0);
    if (clave && (!vence || Date.now() > vence)) { borrarClave(); return ''; }
    return clave;
  } catch { return ''; }
}

export function guardarClave(clave: string, recordar = false) {
  try {
    const dur = recordar ? DIAS_RECORDAR * 86400000 : HORAS_SESION * 3600000;
    localStorage.setItem(ACCESS_KEY_STORAGE, clave.trim());
    localStorage.setItem(VENCE_STORAGE, String(Date.now() + dur));
  } catch { /* sin localStorage */ }
}

export function borrarClave() {
  try { localStorage.removeItem(ACCESS_KEY_STORAGE); localStorage.removeItem(VENCE_STORAGE); } catch { /* */ }
}

/** Cierra la sesión en este navegador y regresa a la pantalla de acceso. */
export function cerrarSesion() {
  borrarClave();
  window.dispatchEvent(new Event('leadscrapper:salir'));
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
