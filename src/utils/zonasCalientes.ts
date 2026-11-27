// Zonas calientes por modelo: interés de Google Analytics (tu cartera y prospectos)
// cruzado con negocios (DENUE) y hogares (Censo 2020) de la zona escaneada.
// Los puntajes son RELATIVOS (para decidir dónde y qué pautar), no probabilidades de venta.

import { llamarApi } from '../services/apiCliente';
import type { ZonaCp } from './planMeta';
import { perfilDeModelo, PerfilModelo } from './modelos';

// ─────────────────────────────────────────────────────────────
// Datos de /api/ga
// ─────────────────────────────────────────────────────────────
export interface ModeloGA {
  modelo: string; marca: string;
  vistas: number; clics_whatsapp: number; usuarios: number; tiempo_interaccion_seg: number;
  por_edad: Record<string, number>; por_hora: Record<string, number>; por_dia: Record<string, number>;
  por_dispositivo: Record<string, number>; por_region: Record<string, number>; por_ciudad: Record<string, number>;
  por_canal: Record<string, number>; por_campania: Record<string, number>;
  por_edad_vistas: Record<string, number>; por_hora_vistas: Record<string, number>; por_dia_vistas: Record<string, number>;
  por_dispositivo_vistas: Record<string, number>; por_region_vistas: Record<string, number>;
  por_ciudad_vistas: Record<string, number>; por_canal_vistas: Record<string, number>;
}

export interface RespuestaGA {
  rango: { desde: string; hasta: string };
  propiedad: string;
  avisos: string[];
  totales: { usuarios: number; sesiones: number; vistas_modelo: number; clics_whatsapp: number };
  modelos: ModeloGA[];
}

export async function obtenerGA(desde: string, hasta: string): Promise<RespuestaGA> {
  return llamarApi(`/api/ga?desde=${desde}&hasta=${hasta}`);
}

/** GA estuvo configurado en hora de Tijuana (1 h menos que CDMX la mayor parte del año). */
export function desfaseHoras(avisos: string[]): number {
  return avisos.some(a => /tijuana/i.test(a)) ? 1 : 0;
}

const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
const NOMBRE_DIA: Record<string, string> = { lun: 'lunes', mar: 'martes', mie: 'miércoles', jue: 'jueves', vie: 'viernes', sab: 'sábado', dom: 'domingo' };

export function suma(o: Record<string, number> | undefined): number {
  return Object.values(o || {}).reduce((s, v) => s + (v || 0), 0);
}

/** Interés combinado: un clic a WhatsApp vale como 5 vistas. */
export function interes(m: ModeloGA, campo: 'hora' | 'dia' | 'canal' | 'region' | 'dispositivo'): Record<string, number> {
  const a = (m as any)[`por_${campo}`] || {}, b = (m as any)[`por_${campo}_vistas`] || {};
  const out: Record<string, number> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = (b[k] || 0) + 5 * (a[k] || 0);
  return out;
}

export interface ResumenModelo {
  m: ModeloGA;
  perfil: PerfilModelo;
  puntosInteres: number;     // vistas + 5×WhatsApp
  tasaWhatsapp: number;      // % de vistas que terminaron en WhatsApp
  horas: { hora: number; valor: number }[];   // ya en hora CDMX, de mayor a menor
  dias: { dia: string; valor: number }[];
  canalTop: string;
  pctMovil: number;
  pctCdmx: number; pctEdomex: number;
  confianza: 'baja' | 'media' | 'alta';
}

export function resumirModelos(ga: RespuestaGA): ResumenModelo[] {
  const off = desfaseHoras(ga.avisos);
  return ga.modelos
    .filter(m => m.marca !== 'nissan')
    .map(m => {
      const h = interes(m, 'hora'), d = interes(m, 'dia'), c = interes(m, 'canal');
      const r = interes(m, 'region'), dv = interes(m, 'dispositivo');
      const horas = Object.entries(h).filter(([, v]) => v > 0)
        .map(([k, v]) => ({ hora: (Number(k) + off + 24) % 24, valor: v })).sort((a, b) => b.valor - a.valor);
      const dias = DIAS.map(k => ({ dia: k, valor: d[k] || 0 })).filter(x => x.valor > 0).sort((a, b) => b.valor - a.valor);
      const canalTop = Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
      const totR = suma(r) || 1, totD = suma(dv) || 1;
      const puntos = m.vistas + 5 * m.clics_whatsapp;
      return {
        m, perfil: perfilDeModelo(m.modelo), puntosInteres: puntos,
        tasaWhatsapp: m.vistas ? Math.round((100 * m.clics_whatsapp) / m.vistas) : (m.clics_whatsapp ? 100 : 0),
        horas, dias, canalTop,
        pctMovil: Math.round((100 * (dv.mobile || 0)) / totD),
        pctCdmx: Math.round((100 * (r['Ciudad de México'] || 0)) / totR),
        pctEdomex: Math.round((100 * (r['Estado de México'] || 0)) / totR),
        confianza: (m.clics_whatsapp >= 10 || m.vistas >= 100 ? 'alta' : m.clics_whatsapp >= 3 || m.vistas >= 30 ? 'media' : 'baja') as ResumenModelo['confianza'],
      };
    })
    .filter(x => x.puntosInteres > 0)
    .sort((a, b) => b.puntosInteres - a.puntosInteres);
}

/** Franjas de 2 horas con más interés (CDMX), p. ej. "15:00–17:00". */
export function mejoresFranjas(horas: { hora: number; valor: number }[], n = 2): string[] {
  const porFranja: Record<number, number> = {};
  for (const h of horas) { const f = Math.floor(h.hora / 2) * 2; porFranja[f] = (porFranja[f] || 0) + h.valor; }
  return Object.entries(porFranja).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([f]) => `${String(f).padStart(2, '0')}:00–${String((Number(f) + 2) % 24).padStart(2, '0')}:00`);
}

export function nombreDia(k: string) { return NOMBRE_DIA[k] || k; }

// ─────────────────────────────────────────────────────────────
// Zonas calientes por modelo (INEGI)
// ─────────────────────────────────────────────────────────────
export interface ZonaCaliente {
  z: ZonaCp;
  puntaje: number;      // tamaño del mercado del modelo en ese CP (ponderado por región de GA)
  afinidad: number;     // veces vs. el promedio de la zona escaneada (1 = promedio)
  motivo: string;
}

const esCdmx = (cp: string) => { const n = Number(cp.slice(0, 2)); return n >= 1 && n <= 16; };
const esEdomex = (cp: string) => { const n = Number(cp.slice(0, 2)); return n >= 50 && n <= 57; };

export function zonasDelModelo(zonas: ZonaCp[], r: ResumenModelo, max = 12): ZonaCaliente[] {
  const p = r.perfil;
  const mercado = (z: ZonaCp): number => {
    if (p.tipo === 'trabajo') return p.segmentos.reduce((s, k) => s + (z.seg[k] || 0), 0);
    if (!p.niveles.includes(z.nivelHogar)) return 0;
    if (p.tipo === 'primer') return z.sinAuto;
    if (p.tipo === 'premium') return z.vivAlto;
    return z.conAuto;
  };
  const base = (z: ZonaCp) => (p.tipo === 'trabajo' ? z.negocios : z.viviendas) || 0;
  // Ponderación por región donde está el interés en GA (sin anular ninguna)
  const pesoRegion = (cp: string) => esCdmx(cp) ? 0.6 + r.pctCdmx / 100 : esEdomex(cp) ? 0.6 + r.pctEdomex / 100 : 0.6;

  const filas = zonas.map(z => ({ z, bruto: mercado(z), base: base(z) })).filter(x => x.bruto > 0 && x.base > 0);
  const totB = filas.reduce((s, x) => s + x.bruto, 0) || 1;
  const totBase = filas.reduce((s, x) => s + x.base, 0) || 1;
  return filas.map(x => {
    const afin = (x.bruto / totB) / (x.base / totBase);
    const motivo = p.tipo === 'trabajo'
      ? `${x.bruto.toLocaleString('es-MX')} negocios de ${p.segmentos.join(', ')}`
      : p.tipo === 'primer' ? `${x.bruto.toLocaleString('es-MX')} hogares sin auto (nivel ${x.z.nivelHogar})`
      : p.tipo === 'premium' ? `${x.bruto.toLocaleString('es-MX')} viviendas en manzanas C+/A/B con auto`
      : `${x.bruto.toLocaleString('es-MX')} hogares con auto (nivel ${x.z.nivelHogar})`;
    return { z: x.z, puntaje: x.bruto * pesoRegion(x.z.cp), afinidad: Number(afin.toFixed(1)), motivo };
  }).sort((a, b) => b.puntaje - a.puntaje).slice(0, max);
}

// ─────────────────────────────────────────────────────────────
// Evaluador de publicación
// ─────────────────────────────────────────────────────────────
export interface Publicacion {
  modelo: string;
  cps: string[];              // códigos postales a pautar (vacío = radio completo)
  edadMin: number; edadMax: number;
  franja: string;             // "15:00–17:00" o "todo el día"
  dias: string[];             // ['lun','jue'] o []
  formato: 'video_vertical' | 'imagen' | 'carrusel' | 'video_horizontal';
  copy: string;
  palabrasClave: string;
}

export interface Evaluacion {
  total: number;
  nivel: 'Alta' | 'Media' | 'Baja';
  partes: { nombre: string; puntos: number; max: number; nota: string }[];
  mejoras: string[];
  confianza: string;
}

const PALABRAS_CREDITO = /cr[eé]dito|enganche|mensualidad|financ|tasa|pagos? (fijos|chiquitos)|bur[oó]|sin aval|a meses/i;

export function evaluarPublicacion(
  pub: Publicacion, resumenes: ResumenModelo[], zonas: ZonaCp[],
): Evaluacion {
  const r = resumenes.find(x => x.m.modelo === pub.modelo);
  const partes: Evaluacion['partes'] = [];
  const mejoras: string[] = [];

  // 1) Interés del modelo en tu público (GA) — 25
  const maxPts = Math.max(1, ...resumenes.map(x => x.puntosInteres));
  let pInteres = 8, nInteres = 'Sin datos de GA para este modelo: es una apuesta nueva.';
  if (r) {
    pInteres = Math.round(25 * Math.min(1, 0.35 + 0.65 * r.puntosInteres / maxPts));
    if (r.m.clics_whatsapp > 0) pInteres = Math.min(25, pInteres + 3);
    nInteres = `${r.m.vistas} vistas y ${r.m.clics_whatsapp} clics a WhatsApp en tu web.`;
    if (r.m.clics_whatsapp === 0 && r.m.vistas >= 10) mejoras.push(`${pub.modelo} se ve mucho pero nadie pidió cotización: refuerza el "por qué ahora" (beneficio concreto, existencia, entrega inmediata).`);
  } else mejoras.push('Este modelo no tiene datos en tu web: pruébalo primero con poco presupuesto.');
  partes.push({ nombre: 'Interés de tu público en el modelo', puntos: pInteres, max: 25, nota: nInteres });

  // 2) Zonas — 25
  let pZona = 10, nZona = 'Pautando a todo el radio (sin elegir códigos postales).';
  if (r) {
    const calientes = zonasDelModelo(zonas, r, 50);
    const top = new Set(calientes.slice(0, 8).map(x => x.z.cp));
    if (pub.cps.length) {
      const enTop = pub.cps.filter(cp => top.has(cp)).length;
      pZona = Math.round(25 * (0.3 + 0.7 * enTop / pub.cps.length));
      nZona = `${enTop} de ${pub.cps.length} códigos postales están entre las zonas más calientes para este modelo.`;
      if (enTop < pub.cps.length) mejoras.push(`Usa solo las zonas calientes del modelo: ${[...top].slice(0, 6).join(', ')}.`);
    } else {
      mejoras.push(`Elige las zonas calientes en lugar de todo el radio: ${[...top].slice(0, 6).join(', ')}.`);
    }
  }
  partes.push({ nombre: 'Zonas con el perfil del modelo (INEGI)', puntos: pZona, max: 25, nota: nZona });

  // 3) Horario y días — 15
  let pHora = 7, nHora = 'Todo el día.';
  if (r && r.horas.length) {
    const top = mejoresFranjas(r.horas, 3);
    const topDias = r.dias.slice(0, 3).map(d => d.dia);
    const okH = pub.franja === 'todo el día' ? 0.5 : top.includes(pub.franja) ? 1 : 0.2;
    const okD = !pub.dias.length ? 0.5 : pub.dias.filter(d => topDias.includes(d)).length / pub.dias.length;
    pHora = Math.round(15 * (0.6 * okH + 0.4 * okD));
    nHora = `Más interés: ${top.join(', ')} · ${topDias.map(nombreDia).join(', ')} (hora CDMX).`;
    if (okH < 1) mejoras.push(`Programa el anuncio en ${top.slice(0, 2).join(' y ')}.`);
    if (okD < 1 && topDias.length) mejoras.push(`Concentra el presupuesto en ${topDias.map(nombreDia).join(', ')}.`);
  }
  partes.push({ nombre: 'Horario y días', puntos: pHora, max: 15, nota: nHora });

  // 4) Formato — 10
  const movil = r ? r.pctMovil : 74;
  const pForm = pub.formato === 'video_vertical' ? 10 : pub.formato === 'carrusel' ? 7 : pub.formato === 'imagen' ? 5 : 4;
  if (pForm < 10) mejoras.push(`${movil}% te ve en el celular: usa video vertical (reel/historia), idealmente tus videos de TikTok.`);
  partes.push({ nombre: 'Formato del arte', puntos: pForm, max: 10, nota: `${movil}% de tu público entra desde el celular.` });

  // 5) Copy — 15
  let pCopy = 15; const notas: string[] = [];
  const copy = pub.copy.trim();
  if (!copy) { pCopy = 4; notas.push('Sin copy.'); mejoras.push('Escribe el copy: beneficio + modelo + llamada a WhatsApp.'); }
  else {
    if (PALABRAS_CREDITO.test(copy)) { pCopy -= 7; notas.push('menciona crédito/enganche'); mejoras.push('Quita crédito/enganche/mensualidades del anuncio: Meta lo pasa a "productos financieros" y pierdes la segmentación por zona y edad. Llévalo al WhatsApp.'); }
    const modeloCorto = pub.modelo.split(' ').slice(0, 2).join(' ').toLowerCase();
    if (!copy.toLowerCase().includes(modeloCorto.split(' ')[0])) { pCopy -= 2; notas.push('no nombra el modelo'); mejoras.push(`Nombra el modelo (${pub.modelo}) en la primera línea.`); }
    if (!/whats|escr[ií]b|mensaje|cotiza|agenda|llama/i.test(copy)) { pCopy -= 3; notas.push('sin llamada a la acción'); mejoras.push('Cierra con una acción clara: "Escríbeme por WhatsApp".'); }
    if (copy.length > 400) { pCopy -= 2; notas.push('muy largo'); mejoras.push('Acorta el copy: las primeras 2 líneas deben decir todo.'); }
    if (copy.length < 40) { pCopy -= 2; notas.push('muy corto'); }
  }
  pCopy = Math.max(0, pCopy);
  partes.push({ nombre: 'Copy', puntos: pCopy, max: 15, nota: notas.length ? notas.join(', ') : 'Bien: nombra el modelo, invita a escribir y no menciona crédito.' });

  // 6) Edad — 10 (referencia por perfil; GA aún no trae edad)
  const [a, b] = (r?.perfil || perfilDeModelo(pub.modelo)).edad;
  const inter = Math.max(0, Math.min(b, pub.edadMax) - Math.max(a, pub.edadMin));
  const cobertura = inter / (b - a);
  const amplitud = pub.edadMax - pub.edadMin;
  let pEdad = Math.round(10 * cobertura);
  if (amplitud > 35) { pEdad = Math.max(0, pEdad - 3); mejoras.push(`El rango de edad es muy amplio: prueba ${a} a ${b}.`); }
  else if (cobertura < 0.8) mejoras.push(`Para ${pub.modelo} el comprador típico tiene ${a} a ${b} años.`);
  partes.push({ nombre: 'Edad', puntos: pEdad, max: 10, nota: `Referencia del perfil: ${a}–${b} años (GA aún no reporta edad).` });

  // Con palabras de crédito Meta exige la categoría especial: sin C.P. ni edad, así que esas partes no cuentan.
  if (PALABRAS_CREDITO.test(`${pub.copy} ${pub.palabrasClave}`)) {
    for (const p of partes) if (p.nombre.startsWith('Zonas') || p.nombre === 'Edad') {
      p.puntos = 0; p.nota = 'No aplica: con crédito/enganche en el anuncio Meta no deja segmentar por código postal ni edad.';
    }
  }
  const total = partes.reduce((s, p) => s + p.puntos, 0);
  const confianza = !r ? 'Baja: el modelo no tiene datos en tu web.'
    : r.confianza === 'alta' ? 'Alta: suficientes visitas y clics.'
    : r.confianza === 'media' ? 'Media: hay señal, pero aún con pocos datos.'
    : 'Baja: muy pocos datos de este modelo; tómalo como pista.';
  return { total, nivel: total >= 70 ? 'Alta' : total >= 50 ? 'Media' : 'Baja', partes, mejoras: [...new Set(mejoras)].slice(0, 7), confianza };
}
