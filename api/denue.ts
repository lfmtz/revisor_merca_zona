// Función serverless de Vercel: escaneo REAL de una celda de la cuadrícula con el DENUE (INEGI).
//
//   GET /api/denue?lat=..&lon=..&lado_km=..&municipio=..&estado=..
//
// Descarga todos los establecimientos de la celda (cuadrado de lado `lado_km`) y devuelve
// un RESUMEN: conteo por giro, indicadores de nivel socioeconómico por colonia, una muestra
// de puntos para el mapa y los negocios más relevantes para el directorio.
// Los cuadrados no se traslapan, así que sumar celdas no duplica negocios.

import { claveValida } from './_auth.js';
import {
  clasificarGiro, esEstablecimientoGrande, normalizarTexto,
  indicadoresVacios, IndicadoresZona,
} from '../src/utils/nse.js';

const DENUE = 'https://www.inegi.org.mx/app/api/denue/v1/consulta/Buscar/todos';
// Token público de la API del DENUE. Se puede cambiar con INEGI_TOKEN en Vercel.
const TOKEN_DENUE_DEFAULT = '39518023-869c-4571-84a3-6a731a853a48';
const NEGOCIOS_POR_CELDA = 60;
const PUNTOS_POR_CELDA = 250;

function num(v: unknown): number {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : NaN;
}

function rangoEstrato(e: string): number {
  const t = normalizarTexto(e);
  if (t.startsWith('0 a 5')) return 0;
  if (t.startsWith('6 a 10')) return 1;
  if (t.startsWith('11 a 30')) return 2;
  if (t.startsWith('31 a 50')) return 3;
  if (t.startsWith('51 a 100')) return 4;
  if (t.startsWith('101 a 250')) return 5;
  if (t) return 6;
  return 0;
}

function sumar(ind: IndicadoresZona, giro: ReturnType<typeof clasificarGiro>, grande: boolean, web: boolean) {
  ind.total++;
  if (giro === 'alto') ind.alto++;
  if (giro === 'bajo') ind.bajo++;
  if (grande) ind.grandes++;
  if (web) ind.web++;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  const acceso = claveValida(req);
  if (!acceso.ok) return res.status(acceso.status).json({ error: acceso.error, requiereClave: acceso.requiereClave });

  const lat = num(req.query.lat);
  const lon = num(req.query.lon);
  const lado = Math.min(5, Math.max(0.2, num(req.query.lado_km) || 1.5));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 14 || lat > 33 || lon < -119 || lon > -86) {
    return res.status(400).json({ error: 'Coordenadas inválidas.' });
  }
  const municipio = normalizarTexto(String(req.query.municipio || '')).slice(0, 80);
  const estado = normalizarTexto(String(req.query.estado || '')).slice(0, 60);
  const munCorto = municipio.split(' de ')[0];
  const nombresMun = municipio ? (munCorto.length >= 6 && munCorto !== municipio ? [municipio, munCorto] : [municipio]) : [];

  // El círculo que pedimos al DENUE cubre el cuadrado completo de la celda.
  const radioM = Math.min(5000, Math.ceil(lado * 0.7072 * 1000));
  const medioLat = lado / 2 / 111;
  const medioLon = lado / 2 / (111 * Math.cos(lat * Math.PI / 180));
  const token = (process.env.INEGI_TOKEN || TOKEN_DENUE_DEFAULT).trim();

  let datos: any[];
  try {
    const r = await fetch(`${DENUE}/${lat.toFixed(6)},${lon.toFixed(6)}/${radioM}/${token}`, {
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) return res.status(502).json({ error: `El DENUE respondió ${r.status}.` });
    // El DENUE a veces responde el arreglo como texto JSON "doble"; se aceptan ambos.
    let parsed: unknown = JSON.parse((await r.text()).replace(/^\uFEFF/, '').trim() || '[]');
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    datos = Array.isArray(parsed) ? parsed : [];
  } catch (e: any) {
    return res.status(502).json({ error: `No se pudo consultar el DENUE: ${e?.message || e}` });
  }

  const indicadores = indicadoresVacios();
  const categorias: Record<string, [number, number]> = {};
  const colonias: Record<string, { ind: IndicadoresZona; lat: number; lon: number; cp: string }> = {};
  const puntos: [number, number, string][] = [];
  const candidatos: { s: number; n: any }[] = [];
  let conTelefono = 0;

  for (const x of datos) {
    const la = num(x.Latitud), lo = num(x.Longitud);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
    if (Math.abs(la - lat) > medioLat || Math.abs(lo - lon) > medioLon) continue;

    const ubic = normalizarTexto(x.Ubicacion || '');
    if (nombresMun.length && !nombresMun.some(n => ubic.includes(n))) continue;
    if (!nombresMun.length && estado) {
      const partes = ubic.split(',').map((p: string) => p.trim());
      if (partes[partes.length - 1] !== estado) continue;
    }

    const clase = String(x.Clase_actividad || 'Sin clasificar').trim();
    const giro = clasificarGiro(clase);
    const grande = esEstablecimientoGrande(x.Estrato || '');
    const web = !!String(x.Sitio_internet || '').trim();
    const tel = String(x.Telefono || '').trim();
    const mail = String(x.Correo_e || '').trim();
    if (tel) conTelefono++;

    sumar(indicadores, giro, grande, web);
    const cat = categorias[clase] || (categorias[clase] = [0, 0]);
    cat[0]++;
    if (grande) cat[1]++;

    const nomCol = String(x.Colonia || '').trim().toUpperCase() || 'SIN COLONIA';
    const col = colonias[nomCol] || (colonias[nomCol] = { ind: indicadoresVacios(), lat: 0, lon: 0, cp: String(x.CP || '').trim() });
    sumar(col.ind, giro, grande, web);
    col.lat += la; col.lon += lo;

    if (puntos.length < PUNTOS_POR_CELDA * 4) puntos.push([la, lo, clase]);

    const estr = rangoEstrato(x.Estrato || '');
    candidatos.push({
      s: estr * 10 + (tel ? 3 : 0) + (mail ? 2 : 0) + (web ? 2 : 0)
        - (/sector publico|administracion publica|organismos/.test(normalizarTexto(clase)) ? 100 : 0),
      n: {
        id: String(x.Id || x.CLEE || ''),
        nombre: String(x.Nombre || '').trim() || String(x.Razon_social || '').trim(),
        razon_social: String(x.Razon_social || '').trim(),
        clase,
        estrato: String(x.Estrato || '').trim(),
        direccion: [
          [x.Tipo_vialidad, x.Calle].filter(Boolean).join(' ').trim(),
          [x.Num_Exterior, x.Num_Interior].filter((v: string) => String(v || '').trim()).join(' int. '),
        ].filter(Boolean).join(' '),
        colonia: String(x.Colonia || '').trim(),
        cp: String(x.CP || '').trim(),
        ubicacion: String(x.Ubicacion || '').replace(/\s+/g, ' ').trim(),
        telefono: tel,
        correo: mail,
        web: String(x.Sitio_internet || '').trim(),
        lat: la,
        lon: lo,
      },
    });
  }

  // Muestra uniforme de puntos para el mapa
  const paso = Math.max(1, Math.ceil(puntos.length / PUNTOS_POR_CELDA));
  const muestra = puntos.filter((_, i) => i % paso === 0);

  candidatos.sort((a, b) => b.s - a.s);
  const negocios = candidatos.slice(0, NEGOCIOS_POR_CELDA).map(c => c.n);

  for (const c of Object.values(colonias)) {
    c.lat = Number((c.lat / c.ind.total).toFixed(6));
    c.lon = Number((c.lon / c.ind.total).toFixed(6));
  }

  return res.status(200).json({
    total: indicadores.total,
    conTelefono,
    indicadores,
    categorias,
    colonias,
    puntos: muestra,
    negocios,
  });
}
