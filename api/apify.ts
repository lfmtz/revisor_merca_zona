// Función serverless de Vercel: puente seguro hacia Apify.
// El token vive SOLO aquí (variable de entorno APIFY_TOKEN en Vercel) y nunca llega al navegador.
//
//   GET  /api/apify                 → { configurado: boolean }
//   POST /api/apify  {busquedas, ubicacion, maxResultados, correos}  → { runId }
//   GET  /api/apify?runId=XXX       → { status, items? }
//
// Obligatorio: APP_ACCESS_KEY en Vercel; cada llamada manda el header x-access-key
// con ese valor (evita que extraños gasten tu saldo de Apify).

import { claveValida } from './_auth.js';

const API = 'https://api.apify.com/v2';
const ACTOR = 'compass~crawler-google-places';
const MAX_POR_BUSQUEDA = 500;

type Req = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
};
type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

async function apify(path: string, token: string, init: RequestInit = {}) {
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const msg =
      r.status === 401 || r.status === 403 ? 'El token de Apify es inválido o no tiene permisos.'
      : r.status === 402 ? 'Tu cuenta de Apify no tiene saldo suficiente.'
      : `Apify respondió ${r.status}: ${data?.error?.message || String(text).slice(0, 200)}`;
    const err: any = new Error(msg);
    err.status = r.status === 402 ? 402 : 502;
    throw err;
  }
  return data;
}

function limpiarTexto(v: unknown, max = 120): string {
  return String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  const token = (process.env.APIFY_TOKEN || '').trim();

  const acceso = claveValida(req);
  if (!acceso.ok) {
    return res.status(acceso.status).json({ error: acceso.error, requiereClave: acceso.requiereClave });
  }

  try {
    if (req.method === 'GET' && !req.query.runId) {
      return res.status(200).json({ configurado: !!token });
    }
    if (!token) {
      return res.status(500).json({ error: 'Falta APIFY_TOKEN en las variables de entorno de Vercel.' });
    }

    // ── Iniciar una extracción ──────────────────────────────
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const busquedas: string[] = (Array.isArray(body.busquedas) ? body.busquedas : [])
        .map((b: unknown) => limpiarTexto(b, 80))
        .filter(Boolean)
        .slice(0, 3);
      const ubicacion = limpiarTexto(body.ubicacion, 160);
      const max = Math.min(MAX_POR_BUSQUEDA, Math.max(1, Number(body.maxResultados) || 100));

      if (!busquedas.length || !ubicacion) {
        return res.status(400).json({ error: 'Faltan la categoría o la ubicación.' });
      }

      const input = {
        searchStringsArray: busquedas,
        locationQuery: ubicacion,
        maxCrawledPlacesPerSearch: max,
        language: 'es',
        countryCode: 'mx',
        skipClosedPlaces: true,
        scrapeContacts: !!body.correos,
        maxImages: 0,
        maxReviews: 0,
      };
      const run = await apify(`/acts/${ACTOR}/runs`, token, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return res.status(200).json({ runId: run?.data?.id, status: run?.data?.status });
    }

    // ── Consultar estado / resultados ───────────────────────
    if (req.method === 'GET') {
      const runId = limpiarTexto(req.query.runId, 40);
      if (!/^[A-Za-z0-9]+$/.test(runId)) {
        return res.status(400).json({ error: 'runId inválido.' });
      }
      const run = (await apify(`/actor-runs/${runId}`, token))?.data;
      if (!run || run.actId === undefined) {
        return res.status(404).json({ error: 'No se encontró la ejecución.' });
      }
      const status: string = run.status;
      if (status === 'READY' || status === 'RUNNING') {
        return res.status(200).json({
          status,
          segundos: run.stats?.runTimeSecs ?? null,
        });
      }
      if (status !== 'SUCCEEDED') {
        return res.status(200).json({ status, error: `La extracción en Apify terminó con estado ${status}.` });
      }
      const items = await apify(
        `/datasets/${run.defaultDatasetId}/items?clean=true&format=json&fields=` +
          [
            'placeId', 'title', 'categoryName', 'address', 'street', 'neighborhood', 'postalCode',
            'city', 'state', 'phone', 'phoneUnformatted', 'website', 'emails', 'totalScore',
            'reviewsCount', 'location', 'url', 'searchString', 'permanentlyClosed', 'openingHours',
          ].join(','),
        token,
      );
      return res.status(200).json({
        status,
        costoUsd: typeof run.usageTotalUsd === 'number' ? run.usageTotalUsd : null,
        items: Array.isArray(items) ? items : [],
      });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método no permitido.' });
  } catch (e: any) {
    return res.status(e?.status || 500).json({ error: e?.message || 'Error inesperado.' });
  }
}
