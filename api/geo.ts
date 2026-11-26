// Función serverless de Vercel: convierte una dirección en coordenadas y al revés,
// con Nominatim (OpenStreetMap). Gratis y sin clave; uso ligero según su política.
//
//   GET /api/geo?q=Calz. Ignacio Zaragoza 957, Iztacalco  → { resultados: [{ direccion, lat, lon }] }
//   GET /api/geo?lat=19.40&lon=-99.06                     → { direccion }

import { claveValida } from './_auth.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const UA = 'LeadScrapperMX/1.0 (revisor-merca-zona.vercel.app)';

async function nominatim(path: string): Promise<any> {
  const r = await fetch(`${NOMINATIM}${path}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'es-MX,es', Accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`El servicio de mapas respondió ${r.status}.`);
  return r.json();
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const acceso = claveValida(req);
  if (!acceso.ok) return res.status(acceso.status).json({ error: acceso.error, requiereClave: acceso.requiereClave });

  try {
    const q = String(req.query.q || '').trim().slice(0, 200);
    if (q) {
      const datos = await nominatim(
        `/search?format=jsonv2&countrycodes=mx&limit=5&addressdetails=0&q=${encodeURIComponent(q)}`);
      const resultados = (Array.isArray(datos) ? datos : []).map((d: any) => ({
        direccion: String(d.display_name || '').replace(/, México$/, ''),
        lat: Number(d.lat),
        lon: Number(d.lon),
        tipo: d.type || '',
      })).filter((d: any) => Number.isFinite(d.lat) && Number.isFinite(d.lon));
      return res.status(200).json({ resultados });
    }

    const lat = Number(req.query.lat), lon = Number(req.query.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const d = await nominatim(`/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lon}`);
      return res.status(200).json({ direccion: String(d?.display_name || '').replace(/, México$/, '') });
    }
    return res.status(400).json({ error: 'Escribe una dirección o manda coordenadas.' });
  } catch (e: any) {
    return res.status(502).json({ error: e?.message || 'No se pudo consultar el servicio de mapas.' });
  }
}
