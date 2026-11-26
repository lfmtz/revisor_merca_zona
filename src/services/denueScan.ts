// Escaneo territorial REAL con el DENUE (INEGI), celda por celda, vía /api/denue.
// Devuelve las categorías reales de la zona, un directorio de negocios reales y el
// nivel socioeconómico estimado por colonia.

import { GridMode, Lead, ZoneAnalysisResult, ExtractionLog, CategorySummary } from '../types';
import { generarCuadricula, geocodificarZona, MODOS_CUADRICULA } from '../utils/gridEngine';
import {
  IndicadoresZona, indicadoresVacios, sumarIndicadores, calcularIndiceNse, nivelDesdeIndice, NivelNse,
} from '../utils/nse';
import { llamarApi } from './apiCliente';
import { BASE_TRABAJO, rutaDesdeTrabajo } from './apifyService';
import type { LiveScanProgressUpdate } from './scraperEngine';

export interface ColoniaNse {
  colonia: string;
  cp: string;
  total: number;
  indice: number | null;
  nivel: NivelNse;
  lat: number;
  lon: number;
  distancia_km: number;
}

export interface CeldaDensidad {
  lat: number;   // esquina sur-oeste
  lon: number;
  paso: number;  // tamaño en grados
  total: number;
  alto: number;
  bajo: number;
}

export interface ResultadoNse {
  indice: number | null;
  nivel: NivelNse;
  indicadores: IndicadoresZona;
  colonias: ColoniaNse[];
  densidad: CeldaDensidad[];
}

export interface ResultadoEscaneoReal {
  zona: ZoneAnalysisResult;
  leads: Lead[];
  nse: ResultadoNse;
  celdasConError: number;
}

const CONCURRENCIA = 3;

function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

function titulo(t: string): string {
  return (t || '').toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
}

export async function escanearZonaDenue(
  estado: string,
  municipio: string,
  radioKm: number,
  modo: GridMode,
  onProgress?: (p: LiveScanProgressUpdate) => void,
  onLog?: (log: ExtractionLog) => void,
  stopRef?: { current: boolean },
  opciones: { centro?: { lat: number; lon: number }; etiqueta?: string } = {},
): Promise<ResultadoEscaneoReal> {
  const inicio = Date.now();
  // Con `centro` se escanea un círculo sin filtrar por municipio ni estado (p. ej. alrededor de mi trabajo)
  const centro = opciones.centro || geocodificarZona(estado, municipio);
  if (opciones.centro) { municipio = ''; estado = ''; }
  const celdas = generarCuadricula(centro.lat, centro.lon, radioKm, modo);
  const lado = MODOS_CUADRICULA[modo].paso_km;
  const ubicacion = opciones.etiqueta || (municipio.trim() ? `${municipio.trim()}, ${estado}` : estado);

  const log = (message: string, type: ExtractionLog['type'] = 'info') => onLog?.({
    id: `log_${Date.now()}_${Math.random()}`,
    timestamp: new Date().toLocaleTimeString('es-MX', { hour12: false }),
    message, type,
  });
  log(`Escaneo REAL con DENUE (INEGI) en ${ubicacion}: ${celdas.length} celdas de ${lado} km.`, 'info');

  const categorias: Record<string, [number, number]> = {};
  const colonias: Record<string, { ind: IndicadoresZona; latS: number; lonS: number; cp: string }> = {};
  let indicadores = indicadoresVacios();
  let conTelefono = 0;
  const puntos: ZoneAnalysisResult['densidad_puntos'] = [];
  const negocios: any[] = [];
  const densidad: Record<string, [number, number, number]> = {};
  let pasoDensidad = 0.0025;
  let terminadas = 0;
  let celdasConError = 0;
  let ultimaCategoria = '';

  const procesar = async (i: number) => {
    const c = celdas[i];
    const qs = new URLSearchParams({
      lat: String(c.lat), lon: String(c.lon), lado_km: String(lado),
      municipio: municipio.trim(), estado,
    });
    let d: any = null;
    for (let intento = 0; intento < 3 && !d; intento++) {
      try {
        d = await llamarApi(`/api/denue?${qs.toString()}`);
      } catch (e: any) {
        if (e?.requiereClave || e?.status === 503) throw e;
        if (intento === 2) {
          celdasConError++;
          log(`⚠️ Celda ${i + 1}: ${e?.message || 'error'} (se omitió)`, 'warning');
        } else {
          await new Promise(r => setTimeout(r, 1500 * (intento + 1)));
        }
      }
    }
    if (d) {
      indicadores = sumarIndicadores(indicadores, d.indicadores);
      conTelefono += d.conTelefono || 0;
      for (const [k, [n, g]] of Object.entries<[number, number]>(d.categorias || {})) {
        const cat = categorias[k] || (categorias[k] = [0, 0]);
        cat[0] += n; cat[1] += g;
        ultimaCategoria = k;
      }
      for (const [k, v] of Object.entries<any>(d.colonias || {})) {
        const col = colonias[k] || (colonias[k] = { ind: indicadoresVacios(), latS: 0, lonS: 0, cp: v.cp });
        col.ind = sumarIndicadores(col.ind, v.ind);
        col.latS += v.lat * v.ind.total;
        col.lonS += v.lon * v.ind.total;
      }
      for (const [la, lo, cat] of d.puntos || []) {
        puntos.push({ lat: la, lng: lo, nombre: cat, categoria: cat, calificacion: 0 });
      }
      negocios.push(...(d.negocios || []));
      if (d.pasoDensidad) pasoDensidad = d.pasoDensidad;
      for (const [k, [t, a, b]] of Object.entries<[number, number, number]>(d.densidad || {})) {
        const v = densidad[k] || (densidad[k] = [0, 0, 0]);
        v[0] += t; v[1] += a; v[2] += b;
      }
      if (d.total) log(`Celda ${i + 1}/${celdas.length}: ${d.total.toLocaleString('es-MX')} negocios`, 'success');
    }
    terminadas++;
    onProgress?.({
      celda_actual: terminadas,
      total_celdas: celdas.length,
      porcentaje: Math.round((terminadas / celdas.length) * 100),
      total_encontrados: indicadores.total,
      nuevos_en_celda: d?.total || 0,
      categorias_detectadas: Object.keys(categorias).length,
      ultima_categoria: ultimaCategoria,
      termino_actual: 'DENUE INEGI',
      tiempo_transcurrido_seg: Math.round((Date.now() - inicio) / 1000),
      tiempo_estimado_total_seg: Math.round(((Date.now() - inicio) / terminadas) * celdas.length / 1000),
      mensaje: `Celda ${terminadas} de ${celdas.length} — ${indicadores.total.toLocaleString('es-MX')} negocios reales`,
    });
  };

  // Cola con concurrencia limitada (respeta pausa/stop)
  let siguiente = 0;
  const trabajadores = Array.from({ length: Math.min(CONCURRENCIA, celdas.length) }, async () => {
    while (siguiente < celdas.length) {
      if (stopRef?.current) return;
      const i = siguiente++;
      await procesar(i);
    }
  });
  await Promise.all(trabajadores);

  // ── Categorías ──────────────────────────────────────────
  const total = indicadores.total;
  const listaCats: CategorySummary[] = Object.entries(categorias)
    .sort((a, b) => b[1][0] - a[1][0])
    .map(([nombre, [n, grandes]], idx) => ({
      rank: idx + 1,
      categoria: nombre,
      tipo_entidad: grandes / n >= 0.3 ? 'empresa' : 'negocio',
      cantidad: n,
      porcentaje: total ? Number(((n / total) * 100).toFixed(1)) : 0,
      estimado_real: n,
      costo_apify_usd: Number(((n / 1000) * 4).toFixed(1)),
    }));

  // ── NSE por colonia ─────────────────────────────────────
  const listaColonias: ColoniaNse[] = Object.entries(colonias).map(([nombre, c]) => {
    const indice = calcularIndiceNse(c.ind);
    const lat = c.latS / c.ind.total, lon = c.lonS / c.ind.total;
    return {
      colonia: titulo(nombre), cp: c.cp, total: c.ind.total, indice,
      nivel: nivelDesdeIndice(indice), lat, lon,
      distancia_km: distanciaKm(BASE_TRABAJO.lat, BASE_TRABAJO.lon, lat, lon),
    };
  }).sort((a, b) => b.total - a.total);
  const indiceZona = calcularIndiceNse(indicadores);
  const celdasDensidad: CeldaDensidad[] = Object.entries(densidad).map(([k, [t, a, b]]) => {
    const [i, j] = k.split(',').map(Number);
    return { lat: i * pasoDensidad, lon: j * pasoDensidad, paso: pasoDensidad, total: t, alto: a, bajo: b };
  });
  const nse: ResultadoNse = {
    indice: indiceZona, nivel: nivelDesdeIndice(indiceZona), indicadores, colonias: listaColonias,
    densidad: celdasDensidad,
  };

  // ── Directorio de negocios reales ───────────────────────
  const hoy = new Date().toISOString().split('T')[0];
  const vistos = new Set<string>();
  const leads: Lead[] = [];
  for (const n of negocios) {
    if (!n.id || vistos.has(n.id)) continue;
    vistos.add(n.id);
    const dir = [n.direccion, n.colonia && `Col. ${titulo(n.colonia)}`, n.cp && `C.P. ${n.cp}`, n.ubicacion]
      .filter(Boolean).join(', ');
    leads.push({
      id: `denue_${n.id}`,
      nombre_negocio: n.nombre || n.razon_social || '',
      categoria: n.clase,
      tipo_entidad: /^(11|31|51|101|251)/.test(n.estrato) ? 'empresa' : 'negocio',
      direccion_completa: dir,
      municipio_detectado: municipio || (String(n.ubicacion || '').split(',')[1] || '').trim(),
      estado_detectado: estado || titulo((String(n.ubicacion || '').split(',')[2] || '').trim()),
      telefono: n.telefono || 'N/A',
      url_google_maps: `https://www.google.com/maps/search/?api=1&query=${n.lat},${n.lon}`,
      sitio_web: n.web || 'N/A',
      calificacion: 0,
      num_resenas: 0,
      horario: n.estrato ? `${n.estrato}` : 'N/A',
      estado_apertura: 'N/A',
      link_navegacion: rutaDesdeTrabajo(n.lat, n.lon),
      fecha_extraccion: hoy,
      cobertura_busqueda: ubicacion,
      colonia: titulo(n.colonia || ''),
      lat: n.lat,
      lng: n.lon,
    });
  }
  leads.sort((a, b) =>
    distanciaKm(BASE_TRABAJO.lat, BASE_TRABAJO.lon, a.lat!, a.lng!) -
    distanciaKm(BASE_TRABAJO.lat, BASE_TRABAJO.lon, b.lat!, b.lng!));

  const segundos = Math.round((Date.now() - inicio) / 1000);
  const conWeb = indicadores.web;
  log(`✅ Escaneo terminado: ${total.toLocaleString('es-MX')} negocios reales, ${listaCats.length} giros, NSE estimado ${nse.nivel.nivel}.`, 'success');

  const zona: ZoneAnalysisResult = {
    coverage: ubicacion,
    modo_escaneo: modo,
    total_negocios: total,
    celdas_procesadas: terminadas,
    celdas_totales: celdas.length,
    cobertura_pct: celdas.length ? Math.round(((terminadas - celdasConError) / celdas.length) * 100) : 0,
    categorias_unicas: listaCats.length,
    tiempo_escaneo: segundos,
    query_usada: `DENUE INEGI · ${ubicacion}`,
    url_maps: `https://www.inegi.org.mx/app/mapa/denue/`,
    categorias: listaCats,
    densidad_puntos: puntos,
    resumen_mercado: {
      categoria_dominante: listaCats[0]?.categoria || '—',
      promedio_calificacion: 0,
      porcentaje_con_telefono: total ? Math.round((conTelefono / total) * 100) : 0,
      porcentaje_con_web: total ? Math.round((conWeb / total) * 100) : 0,
      total_empresas: listaCats.filter(c => c.tipo_entidad === 'empresa').reduce((s, c) => s + c.cantidad, 0),
      total_negocios_locales: listaCats.filter(c => c.tipo_entidad === 'negocio').reduce((s, c) => s + c.cantidad, 0),
    },
  };

  return { zona, leads, nse, celdasConError };
}
