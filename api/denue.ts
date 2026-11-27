// Función serverless de Vercel: escaneo REAL de una celda de la cuadrícula con el DENUE (INEGI).
//
//   GET /api/denue?lat=..&lon=..&lado_km=..&municipio=..&estado=..
//   GET /api/denue?termino=hospital&lat=..&lon=..&radio_m=..   → lista de negocios (búsqueda por palabra)
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
import { segmentoDeClase } from '../src/utils/segmentos.js';

const DENUE_BUSCAR = 'https://www.inegi.org.mx/app/api/denue/v1/consulta/Buscar';
const DENUE = `${DENUE_BUSCAR}/todos`;
// Token público de la API del DENUE. Se puede cambiar con INEGI_TOKEN en Vercel.
const TOKEN_DENUE_DEFAULT = '39518023-869c-4571-84a3-6a731a853a48';
const NEGOCIOS_POR_CELDA = 60;
const PUNTOS_POR_CELDA = 250;
// Tamaño (en grados) de los cuadritos del mapa de calor: ~275 m. Índices globales para
// que las celdas del escaneo se puedan sumar sin traslaparse.
export const PASO_DENSIDAD = 0.0025;

async function consultarDenue(url: string): Promise<any[]> {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`El DENUE respondió ${r.status}.`);
  // El DENUE a veces responde el arreglo como texto JSON "doble"; se aceptan ambos.
  let parsed: unknown = JSON.parse((await r.text()).replace(/^\uFEFF/, '').trim() || '[]');
  if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  return Array.isArray(parsed) ? parsed : [];
}

const TIPOS_VIALIDAD = /^(avenida|av\.?|calle|calzada|calz\.?|boulevard|blvd\.?|privada|cerrada|andador|prolongacion|eje|circuito|retorno|callejon|carretera|camino|periferico|viaducto)\b/;

/** "CALLE" + "AVENIDA SAN ANGEL" → "AVENIDA SAN ANGEL" (evita repetir el tipo de vialidad). */
function nombreVialidad(x: any): string {
  const calle = String(x.Calle || '').trim();
  const tipo = String(x.Tipo_vialidad || '').trim();
  if (!calle) return tipo;
  if (!tipo || TIPOS_VIALIDAD.test(normalizarTexto(calle))) return calle;
  return `${tipo} ${calle}`;
}

function direccionDenue(x: any): string {
  const calle = [nombreVialidad(x), String(x.Num_Exterior || '').trim()]
    .filter(Boolean).join(' ');
  const interior = String(x.Num_Interior || '').trim();
  const ubic = String(x.Ubicacion || '').replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
  return [
    calle + (interior ? ` int. ${interior}` : ''),
    x.Colonia ? `Col. ${String(x.Colonia).trim()}` : '',
    x.CP ? `C.P. ${String(x.CP).trim()}` : '',
    ubic,
  ].filter(Boolean).join(', ');
}

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

  // ── Modo búsqueda por palabra (pestaña Inteligencia DENUE & B2B) ──
  if (req.query.termino !== undefined) {
    const termino = String(req.query.termino || '').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().slice(0, 60);
    const radio = Math.min(5000, Math.max(100, Math.round(num(req.query.radio_m) || 5000)));
    if (!termino || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'Faltan el término o las coordenadas.' });
    }
    const tokenB = (process.env.INEGI_TOKEN || TOKEN_DENUE_DEFAULT).trim();
    try {
      const datos = await consultarDenue(
        `${DENUE_BUSCAR}/${encodeURIComponent(termino)}/${lat.toFixed(6)},${lon.toFixed(6)}/${radio}/${tokenB}`);
      const limite = Math.min(3000, Math.max(50, Math.round(num(req.query.limite) || 400)));
      const items = datos.slice(0, limite).map((x: any) => ({
        id: String(x.Id || x.CLEE || ''),
        nombre: String(x.Nombre || '').trim() || String(x.Razon_social || '').trim(),
        razon_social: String(x.Razon_social || '').trim(),
        actividad: String(x.Clase_actividad || '').trim(),
        estrato: String(x.Estrato || '').trim(),
        telefono: String(x.Telefono || '').trim(),
        correo: String(x.Correo_e || '').trim(),
        web: String(x.Sitio_internet || '').trim(),
        direccion: direccionDenue(x),
        colonia: String(x.Colonia || '').trim(),
        cp: String(x.CP || '').trim(),
        ubicacion: String(x.Ubicacion || '').replace(/\s+/g, ' ').trim(),
        lat: num(x.Latitud),
        lon: num(x.Longitud),
      })).filter((x: any) => Number.isFinite(x.lat) && Number.isFinite(x.lon));
      return res.status(200).json({ total: datos.length, items });
    } catch (e: any) {
      return res.status(502).json({ error: `No se pudo consultar el DENUE: ${e?.message || e}` });
    }
  }

  const lado = Math.min(5, Math.max(0.2, num(req.query.lado_km) || 1.5));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 14 || lat > 33 || lon < -119 || lon > -86) {
    return res.status(400).json({ error: 'Coordenadas inválidas.' });
  }
  // Círculo del escaneo: se descartan negocios fuera del radio pedido (los cuadros de la orilla se salen)
  const cLat = num(req.query.clat), cLon = num(req.query.clon), cRadio = num(req.query.rkm);
  const filtrarCirculo = Number.isFinite(cLat) && Number.isFinite(cLon) && Number.isFinite(cRadio) && cRadio > 0;
  const kmLat = 111, kmLon = 111 * Math.cos(((Number.isFinite(cLat) ? cLat : 19.4) * Math.PI) / 180);
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
    datos = await consultarDenue(`${DENUE}/${lat.toFixed(6)},${lon.toFixed(6)}/${radioM}/${token}`);
  } catch (e: any) {
    return res.status(502).json({ error: `No se pudo consultar el DENUE: ${e?.message || e}` });
  }

  const indicadores = indicadoresVacios();
  const categorias: Record<string, [number, number]> = {};
  const colonias: Record<string, { ind: IndicadoresZona; lat: number; lon: number; cp: string; seg: Record<string, number> }> = {};
  const puntos: [number, number, string][] = [];
  const densidad: Record<string, [number, number, number]> = {}; // "i,j" → [total, alto, bajo]
  const candidatos: { s: number; n: any }[] = [];
  let conTelefono = 0;

  for (const x of datos) {
    const la = num(x.Latitud), lo = num(x.Longitud);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) continue;
    if (Math.abs(la - lat) > medioLat || Math.abs(lo - lon) > medioLon) continue;
    if (filtrarCirculo && Math.hypot((la - cLat) * kmLat, (lo - cLon) * kmLon) > cRadio) continue;

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
    const col = colonias[nomCol] || (colonias[nomCol] = { ind: indicadoresVacios(), lat: 0, lon: 0, cp: String(x.CP || '').trim(), seg: {} });
    const sg = segmentoDeClase(normalizarTexto(clase));
    if (sg) col.seg[sg] = (col.seg[sg] || 0) + 1;
    sumar(col.ind, giro, grande, web);
    col.lat += la; col.lon += lo;

    puntos.push([la, lo, clase]);
    const dk = `${Math.floor(la / PASO_DENSIDAD)},${Math.floor(lo / PASO_DENSIDAD)}`;
    const dv = densidad[dk] || (densidad[dk] = [0, 0, 0]);
    dv[0]++;
    if (giro === 'alto') dv[1]++;
    if (giro === 'bajo') dv[2]++;

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
          nombreVialidad(x),
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
    densidad,
    pasoDensidad: PASO_DENSIDAD,
    negocios,
  });
}
