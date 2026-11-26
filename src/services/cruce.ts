// Cruce INEGI (DENUE) ↔ Google Maps (Apify), historial de descargas y Excel consolidado.

import { llamarApi } from './apiCliente';
import { ApifyPlaceItem, PUNTO_PARTIDA, rutaDesdeTrabajo } from './apifyService';

// ─────────────────────────────────────────────────────────────
// Utilidades de texto y distancia
// ─────────────────────────────────────────────────────────────
function norm(t: string): string {
  return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const VACIAS = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'para', 'por', 'con', 'a', 'al', 'sa', 'cv', 's', 'c', 'v',
  'rl', 'sc', 'sapi', 'comercio', 'menor', 'mayor', 'servicios', 'servicio', 'otros', 'otras', 'tienda', 'tiendas',
  'sin', 'nombre', 'establecimiento', 'grupo', 'comercializadora', 'mexico', 'sucursal', 'general', 'similares',
  'productos', 'articulos', 'preparacion', 'sector', 'privado', 'publico',
]);

function palabras(t: string): string[] {
  return norm(t).split(' ').filter(w => w.length > 2 && !VACIAS.has(w));
}

// Palabras de giro que no distinguen a un negocio de otro ("Taller Mecánico Dany" ≠ "Servicio Mecánico J.R")
const GENERICAS_GIRO = ['taller', 'talleres', 'mecanic', 'automotri', 'auto', 'autos', 'reparaci', 'material',
  'construcc', 'ferreter', 'tlapaler', 'consultor', 'dental', 'farmaci', 'estetica', 'restauran', 'clinica',
  'refaccion', 'electric', 'llanter', 'vulcaniz', 'hojalater', 'pintura', 'diesel', 'servicio'];

function similitud(a: string, b: string, excluir: string[] = []): number {
  const quitar = (w: string) => excluir.some(e => w.startsWith(e) || e.startsWith(w.slice(0, 6)));
  const A = new Set(palabras(a).filter(w => !quitar(w))), B = new Set(palabras(b).filter(w => !quitar(w)));
  if (!A.size || !B.size) return 0;
  let comunes = 0;
  A.forEach(w => { if (B.has(w) || [...B].some(x => x.length >= 5 && (x.startsWith(w) || w.startsWith(x)))) comunes++; });
  return comunes / Math.min(A.size, B.size);
}

function metros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Palabra más distintiva de un giro para buscar en el DENUE ("Taller mecánico" → "mecanico"). */
export function palabraClave(giro: string): string {
  const ws = palabras(giro);
  if (!ws.length) return norm(giro).split(' ')[0] || giro;
  return ws.sort((a, b) => b.length - a.length)[0];
}

// ─────────────────────────────────────────────────────────────
// Negocios del DENUE del mismo giro y zona
// ─────────────────────────────────────────────────────────────
export interface NegocioDenue {
  id: string;
  nombre: string;
  razon_social?: string;
  actividad: string;
  estrato: string;
  telefono: string;
  correo: string;
  web: string;
  direccion: string;
  colonia: string;
  ubicacion: string;
  lat: number;
  lon: number;
}

export async function obtenerDenueDelGiro(
  giros: string[],
  centro: { lat: number; lon: number },
  radioKm: number,
  municipio = '',
): Promise<NegocioDenue[]> {
  const vistos = new Map<string, NegocioDenue>();
  for (const giro of giros.filter(Boolean)) {
    const clave = palabraClave(giro);
    const qs = new URLSearchParams({
      termino: clave, lat: String(centro.lat), lon: String(centro.lon),
      radio_m: String(Math.min(5000, Math.round(radioKm * 1000))), limite: '3000',
    });
    const d = await llamarApi(`/api/denue?${qs.toString()}`);
    const giroN = norm(giro);
    const raices = palabras(giro).map(w => w.slice(0, 6));
    // Giro largo = clase oficial del DENUE (viene de la tabla del escaneo): debe coincidir la clase.
    // Giro corto escrito a mano ("Taller mecánico"): basta con que la actividad comparta una raíz,
    // o que el nombre del negocio contenga todas.
    const esClaseDenue = giroN.split(' ').length >= 5;
    for (const it of d.items || []) {
      const act = norm(it.actividad);
      const nom = norm(`${it.nombre} ${it.razon_social || ''}`);
      const mismoGiro = esClaseDenue
        ? act === giroN || similitud(it.actividad, giro) >= 0.8
        : raices.some(r => act.includes(r)) || (raices.length > 0 && raices.every(r => nom.includes(r)));
      if (!mismoGiro) continue;
      if (municipio && !norm(it.ubicacion || it.direccion).includes(norm(municipio).split(' de ')[0])) continue;
      if (metros(centro.lat, centro.lon, it.lat, it.lon) > radioKm * 1000) continue;
      vistos.set(it.id, it);
    }
  }
  return [...vistos.values()];
}

// ─────────────────────────────────────────────────────────────
// Cruce
// ─────────────────────────────────────────────────────────────
export type Fuente = 'Ambos' | 'Solo Google' | 'Solo INEGI';

export interface RegistroConsolidado {
  clave: string;                 // id para historial (google:placeId / denue:id)
  fuente: Fuente;
  confianza: 'Alta' | 'Media' | '';
  nota: string;                  // p. ej. "⚠️ Posible mismo negocio que …"
  nombre: string;
  nombre_inegi: string;
  giro_google: string;
  actividad_inegi: string;
  telefono: string;
  telefono_inegi: string;
  web: string;
  correo: string;
  direccion: string;
  colonia: string;
  empleados: string;
  calificacion: number | '';
  resenas: number | '';
  distancia_km: number;
  ruta: string;
  google_maps: string;
  lat: number;
  lon: number;
  historial: string;             // "🆕 Nuevo" o "Ya descargado (fecha)"
}

export interface ResultadoCruce {
  registros: RegistroConsolidado[];
  ambos: number;
  soloGoogle: number;
  soloInegi: number;
  posibles: number;
}

const kmDesdePartida = (lat: number, lon: number) =>
  Number((metros(PUNTO_PARTIDA.lat, PUNTO_PARTIDA.lon, lat, lon) / 1000).toFixed(1));

export function cruzar(google: ApifyPlaceItem[], denue: NegocioDenue[], giros: string[] = []): ResultadoCruce {
  const usados = new Set<string>();
  const excluir = [...GENERICAS_GIRO, ...giros.flatMap(g => palabras(g).map(w => w.slice(0, 6)))];
  const registros: RegistroConsolidado[] = [];
  let ambos = 0, posibles = 0;

  for (const g of google) {
    if (g.lat === undefined || g.lon === undefined) continue;
    let mejor: { d: NegocioDenue; m: number; s: number; score: number } | null = null;
    let cercano: { d: NegocioDenue; m: number } | null = null;
    for (const d of denue) {
      if (usados.has(d.id)) continue;
      const m = metros(g.lat, g.lon, d.lat, d.lon);
      if (m > 150) continue;
      const s = Math.max(similitud(g.nombre, d.nombre, excluir), similitud(g.nombre, d.razon_social || '', excluir));
      const score = s - m / 400;
      // Coincide si comparten la parte DISTINTIVA del nombre y están cerca
      if ((m <= 80 && s >= 0.5) || (m <= 30 && s >= 0.34)) {
        if (!mejor || score > mejor.score) mejor = { d, m, s, score };
      } else if (m <= 40 && (!cercano || m < cercano.m)) {
        cercano = { d, m };
      }
    }

    const base = {
      nombre: g.nombre, giro_google: g.categoria,
      telefono: g.telefono === 'Sin teléfono' ? '' : g.telefono,
      web: g.web || '', correo: g.email || '',
      direccion: g.direccion, colonia: g.colonia || '',
      calificacion: g.calificacion || '' as const, resenas: g.num_resenas || '' as const,
      distancia_km: kmDesdePartida(g.lat, g.lon), ruta: g.link_gps, google_maps: g.url_maps,
      lat: g.lat, lon: g.lon, clave: `google:${g.id}`, historial: '',
    };

    if (mejor) {
      usados.add(mejor.d.id);
      ambos++;
      registros.push({
        ...base, fuente: 'Ambos',
        confianza: mejor.s >= 0.67 && mejor.m <= 50 ? 'Alta' : 'Media',
        nota: `Coincide con INEGI a ${Math.round(mejor.m)} m`,
        nombre_inegi: mejor.d.razon_social ? `${mejor.d.nombre} (${mejor.d.razon_social})` : mejor.d.nombre,
        actividad_inegi: mejor.d.actividad, telefono_inegi: mejor.d.telefono,
        web: base.web || mejor.d.web, correo: base.correo || mejor.d.correo,
        empleados: mejor.d.estrato,
      });
    } else {
      if (cercano) posibles++;
      registros.push({
        ...base, fuente: 'Solo Google', confianza: '',
        nota: cercano
          ? `⚠️ Posible mismo negocio que "${cercano.d.nombre}" de INEGI (a ${Math.round(cercano.m)} m): verificar en calle o por teléfono`
          : 'No aparece en INEGI: puede ser nuevo o informal',
        nombre_inegi: '', actividad_inegi: '', telefono_inegi: '', empleados: '',
      });
    }
  }

  for (const d of denue) {
    if (usados.has(d.id)) continue;
    registros.push({
      clave: `denue:${d.id}`, fuente: 'Solo INEGI', confianza: '',
      nota: 'No aparece en Google Maps: verificar si sigue abierto',
      nombre: d.nombre, nombre_inegi: d.razon_social || d.nombre,
      giro_google: '', actividad_inegi: d.actividad,
      telefono: '', telefono_inegi: d.telefono, web: d.web, correo: d.correo,
      direccion: d.direccion, colonia: d.colonia, empleados: d.estrato,
      calificacion: '', resenas: '', distancia_km: kmDesdePartida(d.lat, d.lon),
      ruta: rutaDesdeTrabajo(d.lat, d.lon), google_maps: `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lon}`,
      lat: d.lat, lon: d.lon, historial: '',
    });
  }

  registros.sort((a, b) => a.distancia_km - b.distancia_km);
  return {
    registros, ambos, posibles,
    soloGoogle: registros.filter(r => r.fuente === 'Solo Google').length,
    soloInegi: registros.filter(r => r.fuente === 'Solo INEGI').length,
  };
}

// ─────────────────────────────────────────────────────────────
// Historial de descargas (en este navegador)
// ─────────────────────────────────────────────────────────────
const HIST_NEGOCIOS = 'leadscrapper_historial_negocios';
const HIST_BUSQUEDAS = 'leadscrapper_historial_busquedas';

function leer<T>(k: string, def: T): T {
  try { return JSON.parse(localStorage.getItem(k) || '') as T; } catch { return def; }
}
function escribir(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* lleno o bloqueado */ }
}

/** Marca cada registro como nuevo o ya descargado (según el historial previo) y guarda los nuevos. */
export function aplicarHistorial(registros: { clave: string; historial: string }[]): number {
  const hist = leer<Record<string, string>>(HIST_NEGOCIOS, {});
  const hoy = new Date().toISOString().split('T')[0];
  let nuevos = 0;
  for (const r of registros) {
    if (hist[r.clave]) r.historial = `Ya descargado (${hist[r.clave]})`;
    else { r.historial = '🆕 Nuevo'; nuevos++; hist[r.clave] = hoy; }
  }
  escribir(HIST_NEGOCIOS, hist);
  return nuevos;
}

export function claveBusqueda(giros: string[], lat: number, lon: number, radioKm: number): string {
  return `${giros.map(norm).sort().join('+')}|${lat.toFixed(3)},${lon.toFixed(3)}|${radioKm}`;
}

export function busquedaPrevia(clave: string): string | null {
  return leer<Record<string, string>>(HIST_BUSQUEDAS, {})[clave] || null;
}

export function guardarBusqueda(clave: string) {
  const h = leer<Record<string, string>>(HIST_BUSQUEDAS, {});
  h[clave] = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  escribir(HIST_BUSQUEDAS, h);
}

export function totalEnHistorial(): number {
  return Object.keys(leer<Record<string, string>>(HIST_NEGOCIOS, {})).length;
}

export function borrarHistorial() {
  try { localStorage.removeItem(HIST_NEGOCIOS); localStorage.removeItem(HIST_BUSQUEDAS); } catch { /* */ }
}

// ─────────────────────────────────────────────────────────────
// Excel consolidado (CSV que abre directo en Excel)
// ─────────────────────────────────────────────────────────────
export function descargarConsolidado(registros: RegistroConsolidado[], nombreArchivo: string) {
  const enc = ['Fuente', 'Confianza', 'Nota', 'Historial', 'Nombre (Google)', 'Nombre / Razón social (INEGI)',
    'Giro Google', 'Actividad INEGI', 'Teléfono', 'Teléfono INEGI', 'Web', 'Correo', 'Dirección', 'Colonia',
    'Empleados (INEGI)', 'Calificación', 'Reseñas', 'Distancia (km)', 'Ruta desde punto de partida', 'Google Maps',
    'Latitud', 'Longitud'];
  const filas = registros.map(r => [r.fuente, r.confianza, r.nota, r.historial, r.fuente === 'Solo INEGI' ? '' : r.nombre,
    r.nombre_inegi, r.giro_google, r.actividad_inegi, r.telefono, r.telefono_inegi, r.web, r.correo, r.direccion,
    r.colonia, r.empleados, r.calificacion, r.resenas, r.distancia_km, r.ruta, r.google_maps, r.lat, r.lon]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [enc, ...filas].map(f => f.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
