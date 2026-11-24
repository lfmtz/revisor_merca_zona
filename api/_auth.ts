// Verificación de la clave de acceso de la app (APP_ACCESS_KEY en Vercel).
// Es obligatoria: sin ella configurada, las funciones no se pueden usar.
import { timingSafeEqual } from 'node:crypto';

export interface ResultadoClave { ok: boolean; status: number; error?: string; requiereClave?: boolean }

export function claveValida(req: { headers: Record<string, string | string[] | undefined> }): ResultadoClave {
  const esperada = (process.env.APP_ACCESS_KEY || '').trim();
  if (!esperada) {
    return {
      ok: false, status: 503,
      error: 'Falta configurar APP_ACCESS_KEY en Vercel (Settings → Environments → Environment Variables).',
    };
  }
  const recibida = String(req.headers['x-access-key'] || '');
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: 'Clave de acceso incorrecta.', requiereClave: true };
  }
  return { ok: true, status: 200 };
}
