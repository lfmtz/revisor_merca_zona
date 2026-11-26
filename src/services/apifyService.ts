import { llamarApi } from './apiCliente';

// apifyService.ts
// Servicio para interactuar con el actor compass/crawler-google-places de Apify
// Soporta 2 categorías simultáneas, deduplicación, contador de costo, y exportaciones para SenderPlus y Ruta de Visitas.

export interface ApifyPlaceItem {
  id: string;
  nombre: string;
  categoria: string;
  origen: string; // MEJORA 1: De qué búsqueda viene cada registro
  telefono: string;
  email: string | null;
  web: string;
  direccion: string;
  colonia?: string;
  distancia_km?: number;
  calificacion: number;
  lat?: number;
  lon?: number;
  link_gps: string; // MEJORA 4: Link GPS en cada registro
  url_maps: string;
}

export interface ApifyExtractionResult {
  categoria1: string;
  categoria2?: string;
  zona: string;
  total: number;
  conEmail: ApifyPlaceItem[];
  sinEmail: ApifyPlaceItem[];
  costoEstaExtraccion: number; // MEJORA 2: Costo en USD
  descartadosOtroMunicipio: number; // Negocios que Google devolvió de municipios vecinos
  origenModo: 'apify_live';
  tiempoSegundos: number;
}

// ─────────────────────────────────────────────────────────────
// PUNTO DE PARTIDA: ubicación física del trabajo (coordenadas de Google Maps)
// ─────────────────────────────────────────────────────────────
export const BASE_TRABAJO = {
  nombre: 'Mi trabajo',
  direccion: 'Calz. Ignacio Zaragoza 957-A, Agrícola Oriental, Iztacalco, 08500 CDMX',
  lat: 19.4037044,
  lon: -99.069271,
};

export interface PuntoPartida {
  nombre: string;
  direccion: string;
  lat: number;
  lon: number;
}

/**
 * Punto desde el que se calculan distancias y rutas (mi trabajo, mi ubicación actual
 * u otra dirección). Se cambia con establecerPuntoPartida() antes de escanear.
 */
export const PUNTO_PARTIDA: PuntoPartida = { ...BASE_TRABAJO };

export function establecerPuntoPartida(p: PuntoPartida) {
  Object.assign(PUNTO_PARTIDA, p);
}

export interface SaldoApify {
  limiteUsd: number;
  usadoUsd: number;
  disponibleUsd: number;
  inicioCiclo: string | null;
  finCiclo: string | null;
}

/** Saldo real del mes en la cuenta de Apify (lo consulta el servidor con el token). */
export async function obtenerSaldoApify(): Promise<SaldoApify> {
  return llamarApi('/api/apify?saldo=1');
}

/** Avisa a los indicadores de saldo que deben actualizarse (p. ej. tras una extracción). */
export function avisarSaldoCambiado() {
  window.dispatchEvent(new Event('leadscrapper:saldo-actualizar'));
}

/** Pregunta al servidor si APIFY_TOKEN está configurado en Vercel (el token nunca llega aquí). */
export async function verificarApifyConfigurado(): Promise<boolean> {
  try {
    const d = await llamarApi('/api/apify');
    return !!d?.configurado;
  } catch {
    return false;
  }
}

export function calcularCostoApify(totalRegistros: number, scrapeContacts: boolean = true): number {
  // Aprox.: USD 4 por 1,000 lugares; +USD 2 por 1,000 si se buscan correos en las webs.
  const tasa = scrapeContacts ? 0.006 : 0.004;
  return Number((totalRegistros * tasa).toFixed(2));
}

export function rutaDesdeTrabajo(lat?: number, lon?: number, placeId?: string, texto?: string): string {
  const origen = `${PUNTO_PARTIDA.lat},${PUNTO_PARTIDA.lon}`;
  if (lat !== undefined && lon !== undefined) {
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origen}&destination=${lat},${lon}&travelmode=driving`;
    if (placeId) url += `&destination_place_id=${encodeURIComponent(placeId)}`;
    return url;
  }
  return `https://www.google.com/maps/dir/?api=1&origin=${origen}&destination=${encodeURIComponent(texto || '')}&travelmode=driving`;
}

export async function extraerConApify(
  cat1: string,
  cat2: string = '',
  municipio: string = '',
  estado: string = '',
  baseLat: number = PUNTO_PARTIDA.lat,
  baseLon: number = PUNTO_PARTIDA.lon,
  maxResultados: number = 100,
  opciones: {
    correos?: boolean;
    soloMunicipio?: boolean;
    /** Buscar en un círculo (p. ej. alrededor de mi trabajo) en lugar de por municipio */
    circulo?: { lat: number; lon: number; radioKm: number };
    onProgreso?: (estado: string, segundos: number) => void;
  } = {}
): Promise<ApifyExtractionResult> {
  const zonaStr = opciones.circulo
    ? `${opciones.circulo.radioKm} km alrededor de mi trabajo`
    : (municipio && municipio.trim() ? `${municipio.trim()}, ${estado}` : estado);
  const busquedas = [cat1.trim()];
  if (cat2 && cat2.trim() && cat2.trim().toLowerCase() !== cat1.trim().toLowerCase()) {
    busquedas.push(cat2.trim());
  }
  const ubicacion = `${municipio ? `${municipio.trim()}, ` : ''}${estado}, México`;
  const correos = opciones.correos ?? true;
  const startTime = Date.now();

  // 1) Arrancar la extracción en el servidor
  const inicio = await llamarApi('/api/apify', {
    method: 'POST',
    body: JSON.stringify({ busquedas, ubicacion, maxResultados, correos, circulo: opciones.circulo }),
  });
  const runId: string = inicio.runId;
  if (!runId) throw new Error('Apify no devolvió el identificador de la extracción.');

  // 2) Esperar a que termine (Apify suele tardar 1–5 min)
  let rawItems: any[] = [];
  let costoReal: number | null = null;
  const limiteMs = 20 * 60 * 1000;
  for (;;) {
    if (Date.now() - startTime > limiteMs) {
      throw new Error('La extracción está tardando demasiado. Revísala en console.apify.com → Runs.');
    }
    await new Promise(r => setTimeout(r, 5000));
    const d = await llamarApi(`/api/apify?runId=${encodeURIComponent(runId)}`);
    opciones.onProgreso?.(d.status, Math.round((Date.now() - startTime) / 1000));
    if (d.status === 'READY' || d.status === 'RUNNING') continue;
    if (d.status !== 'SUCCEEDED') throw new Error(d.error || `Apify terminó con estado ${d.status}.`);
    rawItems = d.items || [];
    costoReal = typeof d.costoUsd === 'number' ? d.costoUsd : null;
    break;
  }

  // 3) Normalizar, filtrar por municipio y deduplicar
  const soloMunicipio = (opciones.soloMunicipio ?? true) && !!municipio.trim() && !opciones.circulo;
  const munNorm = normalizarTexto(municipio);
  // "ecatepec de morelos" también acepta "ecatepec"; "naucalpan de juarez" → "naucalpan"
  const munCorto = munNorm.split(' de ')[0];
  const nombresMunicipio = munCorto.length >= 6 && munCorto !== munNorm ? [munNorm, munCorto] : [munNorm];
  let descartadosOtroMunicipio = 0;
  const vistos = new Set<string>();
  const parsedItems: ApifyPlaceItem[] = [];

  for (let idx = 0; idx < rawItems.length; idx++) {
    const item = rawItems[idx];
    const nombre = (item.title || '').trim();
    if (!nombre) continue;
    const dir = (item.address || [item.street, item.neighborhood, item.postalCode, item.city, item.state]
      .filter(Boolean).join(', ') || 'Sin dirección').trim();
    if (soloMunicipio) {
      const textoUbicacion = normalizarTexto(`${item.city || ''} ${item.address || ''}`);
      if (!nombresMunicipio.some(n => textoUbicacion.includes(n))) {
        descartadosOtroMunicipio++;
        continue;
      }
    }
    const clave = item.placeId || `${nombre.toLowerCase()}|${dir.toLowerCase()}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    const itemSearchStr = (item.searchString || '').toLowerCase();
    let origen = cat1;
    if (cat2 && cat2.trim() && itemSearchStr.includes(cat2.trim().toLowerCase())) origen = cat2.trim();

    const lat: number | undefined = item.location?.lat ?? undefined;
    const lon: number | undefined = item.location?.lng ?? undefined;

    let email: string | null = null;
    if (Array.isArray(item.emails) && item.emails.length > 0) email = String(item.emails[0]).trim();

    const distanciaKm = (lat !== undefined && lon !== undefined)
      ? calcularDistanciaHaversine(baseLat, baseLon, lat, lon)
      : undefined;

    parsedItems.push({
      id: item.placeId || `apify_${idx}`,
      nombre,
      categoria: item.categoryName || origen,
      origen,
      telefono: item.phone || item.phoneUnformatted || 'Sin teléfono',
      email,
      web: item.website || '',
      direccion: dir,
      colonia: item.neighborhood || extraerColonia(dir) || '',
      distancia_km: distanciaKm,
      calificacion: typeof item.totalScore === 'number' ? item.totalScore : 0,
      lat,
      lon,
      link_gps: rutaDesdeTrabajo(lat, lon, item.placeId, `${nombre} ${dir}`),
      url_maps: item.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nombre + ' ' + dir)}`
    });
  }

  const porDistancia = (a: ApifyPlaceItem, b: ApifyPlaceItem) =>
    (a.distancia_km ?? Infinity) - (b.distancia_km ?? Infinity);
  const conEmail = parsedItems.filter(p => !!p.email).sort(porDistancia);
  const sinEmail = parsedItems.filter(p => !p.email).sort(porDistancia);
  const total = parsedItems.length;

  return {
    categoria1: cat1,
    categoria2: cat2.trim() || undefined,
    zona: zonaStr,
    total,
    conEmail,
    sinEmail,
    costoEstaExtraccion: costoReal !== null ? Number(costoReal.toFixed(2)) : calcularCostoApify(total, correos),
    origenModo: 'apify_live',
    descartadosOtroMunicipio,
    tiempoSegundos: Math.max(1, Math.round((Date.now() - startTime) / 1000))
  };
}

function calcularDistanciaHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Number((R * c).toFixed(1));
}

/** Minúsculas, sin acentos ni signos: "Cdad. Nezahualcóyotl" → "cdad nezahualcoyotl". */
function normalizarTexto(t: string): string {
  return (t || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function extraerColonia(direccion: string): string {
  const match = direccion.match(/Col\.?\s+([^,]+)/i);
  return match ? match[1].trim() : '';
}

// ─────────────────────────────────────────────────────────────
// MEJORA 3 & 4: EXPORTACIONES CSV CON LINK_GPS Y SENDERPLUS
// ─────────────────────────────────────────────────────────────

export function descargarCsvCampanaEmail(items: ApifyPlaceItem[], filename: string) {
  const headers = ["Nombre", "Categoría", "Email", "Teléfono", "Dirección", "Link_GPS", "Web", "Origen"];
  const rows = items.map(it => [
    `"${(it.nombre || '').replace(/"/g, '""')}"`,
    `"${(it.categoria || '').replace(/"/g, '""')}"`,
    `"${(it.email || '').replace(/"/g, '""')}"`,
    `"${(it.telefono || '').replace(/"/g, '""')}"`,
    `"${(it.direccion || '').replace(/"/g, '""')}"`,
    `"${it.link_gps}"`,
    `"${(it.web || '').replace(/"/g, '""')}"`,
    `"${(it.origen || '').replace(/"/g, '""')}"`
  ]);

  triggerCsvDownload(headers, rows, filename);
}

export function descargarCsvSenderPlus(items: ApifyPlaceItem[], filename: string) {
  // MEJORA 3: "📱 CSV para SenderPlus (solo columnas: nombre, teléfono)"
  const headers = ["Nombre", "Teléfono"];
  const rows = items.map(it => [
    `"${(it.nombre || '').replace(/"/g, '""')}"`,
    `"${(it.telefono || '').replace(/"/g, '""')}"`
  ]);

  triggerCsvDownload(headers, rows, `${filename}_senderplus`);
}

export function descargarCsvRutaVisitas(items: ApifyPlaceItem[], filename: string) {
  // MEJORA 3: TAB 2 — "🚶 Visitar en persona" Columnas: #, Nombre, Categoría, Teléfono, Colonia, Distancia, Link_GPS, Origen
  const headers = ["#", "Nombre", "Categoría", "Teléfono", "Dirección", "Colonia", "Calificación", "Distancia_KM", "Link_GPS", "Google_Maps", "Origen"];
  const rows = items.map((it, idx) => [
    idx + 1,
    `"${(it.nombre || '').replace(/"/g, '""')}"`,
    `"${(it.categoria || '').replace(/"/g, '""')}"`,
    `"${(it.telefono || '').replace(/"/g, '""')}"`,
    `"${(it.direccion || '').replace(/"/g, '""')}"`,
    `"${(it.colonia || '').replace(/"/g, '""')}"`,
    it.calificacion || '',
    it.distancia_km ?? '',
    `"${it.link_gps}"`,
    `"${it.url_maps}"`,
    `"${(it.origen || '').replace(/"/g, '""')}"`
  ]);

  triggerCsvDownload(headers, rows, `${filename}_ruta_visitas`);
}

function triggerCsvDownload(headers: string[], rows: any[][], filename: string) {
  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
