// GET /api/acceso → 200 si la clave (header x-access-key) es correcta.
import { claveValida } from './_auth.js';

export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const v = claveValida(req);
  if (!v.ok) return res.status(v.status).json({ error: v.error, requiereClave: v.requiereClave });
  return res.status(200).json({ ok: true });
}
