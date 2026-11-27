// Plan de pauta para Meta (Facebook/Instagram) por micro-zonas.
// Combina negocios (DENUE) y hogares (Censo 2020) por código postal y arma 3 conjuntos de anuncios:
//   A) Dueños de negocio (unidad de trabajo)   B) Primer auto   C) Renovación / SUV
// Todo es gratis: no usa Apify.

import type { ColoniaNse } from '../services/denueScan';
import type { Ageb } from '../services/censo';
import { nivelHogar } from '../services/censo';

export interface ZonaCp {
  cp: string;
  colonias: string[];
  lat: number; lon: number;          // centro aproximado
  distancia_km: number;
  negocios: number;
  seg: Record<string, number>;       // negocios por segmento
  viviendas: number;
  conAuto: number;
  sinAuto: number;
  vivAlto: number;                   // viviendas en AGEB de nivel C+ o A/B con mayoría de hogares con auto
  pob: number;
  p18_24: number; p25_59: number; p60: number;
  indiceHogar: number | null;
  nivelHogar: string;
}

const km = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const r = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
};

/** Junta colonias (DENUE) y AGEB (censo) por código postal. Cada AGEB va al CP de la colonia más cercana. */
export function zonasPorCp(colonias: ColoniaNse[], agebs: Ageb[]): ZonaCp[] {
  const m = new Map<string, ZonaCp & { _lat: number; _lon: number; _n: number; _idx: number; _idxV: number }>();
  const conCp = colonias.filter(c => /^\d{5}$/.test(c.cp));
  for (const c of conCp) {
    const z = m.get(c.cp) || {
      cp: c.cp, colonias: [], lat: 0, lon: 0, distancia_km: c.distancia_km, negocios: 0, seg: {},
      viviendas: 0, conAuto: 0, sinAuto: 0, vivAlto: 0, pob: 0, p18_24: 0, p25_59: 0, p60: 0, indiceHogar: null, nivelHogar: '—',
      _lat: 0, _lon: 0, _n: 0, _idx: 0, _idxV: 0,
    };
    z.colonias.push(c.colonia);
    z.negocios += c.total;
    for (const [k, v] of Object.entries(c.seg || {})) z.seg[k] = (z.seg[k] || 0) + v;
    z._lat += c.lat * c.total; z._lon += c.lon * c.total; z._n += c.total;
    z.distancia_km = Math.min(z.distancia_km, c.distancia_km);
    m.set(c.cp, z);
  }
  for (const a of agebs) {
    let mejor: ColoniaNse | null = null, dMin = 1.5;
    for (const c of conCp) {
      const d = km(a.lat, a.lon, c.lat, c.lon);
      if (d < dMin) { dMin = d; mejor = c; }
    }
    if (!mejor) continue;
    const z = m.get(mejor.cp)!;
    const v = a.viv || 0;
    z.viviendas += v;
    if (a.auto != null) { z.conAuto += Math.round(v * a.auto / 100); z.sinAuto += Math.round(v * (100 - a.auto) / 100); }
    if ((a.indice ?? 0) >= 66 && (a.auto ?? 0) >= 50) z.vivAlto += v;
    z.pob += a.pob;
    z.p18_24 += a.p18_24 || 0; z.p25_59 += a.p25_59 || 0; z.p60 += a.p60 || 0;
    if (a.indice != null && v) { z._idx += a.indice * v; z._idxV += v; }
  }
  return [...m.values()].map(z => {
    const idx = z._idxV ? Math.round(z._idx / z._idxV) : null;
    return {
      cp: z.cp, colonias: z.colonias, lat: z._n ? z._lat / z._n : 0, lon: z._n ? z._lon / z._n : 0,
      distancia_km: z.distancia_km, negocios: z.negocios, seg: z.seg, viviendas: z.viviendas,
      conAuto: z.conAuto, sinAuto: z.sinAuto, vivAlto: z.vivAlto, pob: z.pob, p18_24: z.p18_24, p25_59: z.p25_59, p60: z.p60,
      indiceHogar: idx, nivelHogar: nivelHogar(idx),
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Conjuntos de anuncios
// ─────────────────────────────────────────────────────────────
export interface ConjuntoMeta {
  id: 'A' | 'B' | 'C';
  persona: string;
  emoji: string;
  nombre: string;                // nombre sugerido del conjunto en Meta
  codigo: string;                // código para el mensaje de WhatsApp
  zonas: ZonaCp[];               // CPs incluidos (ordenados por puntaje)
  excluir: string[];             // CPs a excluir
  pines: { lat: number; lon: number; radioKm: number; etiqueta: string }[];
  edadMin: number; edadMax: number;
  intereses: string[];
  vehiculos: string;
  textos: { principal: string[]; titulo: string[]; descripcion: string };
  mensajeWhatsapp: string;
  tamano: number;                // negocios o viviendas objetivo
  tamanoTxt: string;
  porQue: string;
  presupuesto: number;           // MXN por día
  pctPresupuesto: number;
}

const SEG_INFO: Record<string, { nombre: string; vehiculos: string; intereses: string[] }> = {
  alimentos: { nombre: 'abarrotes y alimentos', vehiculos: 'Fiat Fiorino, Peugeot Partner, RAM 700', intereses: ['Tiendas de abarrotes', 'Comercio minorista'] },
  construccion: { nombre: 'construcción y oficios', vehiculos: 'RAM 700, RAM 1200, RAM 2500', intereses: ['Construcción', 'Herramientas'] },
  automotriz: { nombre: 'talleres', vehiculos: 'RAM 700, RAM 1200, Peugeot Partner', intereses: ['Mecánica automotriz', 'Refacciones'] },
  reparto: { nombre: 'reparto y mayoreo', vehiculos: 'RAM ProMaster, Peugeot Partner, Fiat Fiorino', intereses: ['Logística', 'Comercio mayorista'] },
  comida: { nombre: 'comida y restaurantes', vehiculos: 'Fiat Fiorino, Peugeot Partner', intereses: ['Restaurantes', 'Comida a domicilio'] },
};
const SEG_TRABAJO = Object.keys(SEG_INFO);

function edadDe(zs: ZonaCp[], defMin: number, defMax: number): [number, number] {
  const a18 = zs.reduce((s, z) => s + z.p18_24, 0), a25 = zs.reduce((s, z) => s + z.p25_59, 0), a60 = zs.reduce((s, z) => s + z.p60, 0);
  const adultos = a18 + a25 + a60;
  if (!adultos) return [defMin, defMax];
  if (a18 / adultos >= 0.2) return [Math.max(21, defMin - 5), defMax];
  if (a60 / adultos >= 0.3) return [defMin, Math.min(65, defMax + 5)];
  return [defMin, defMax];
}

/** Toma los CPs con mayor puntaje hasta cubrir `cobertura` del total (máx. `max`). */
function elegir(zs: ZonaCp[], puntaje: (z: ZonaCp) => number, cobertura = 0.75, max = 20): ZonaCp[] {
  const orden = zs.map(z => ({ z, p: puntaje(z) })).filter(x => x.p > 0).sort((a, b) => b.p - a.p);
  const total = orden.reduce((s, x) => s + x.p, 0);
  const out: ZonaCp[] = [];
  let acum = 0;
  for (const x of orden) {
    if (out.length >= max || (acum >= total * cobertura && out.length >= 3)) break;
    out.push(x.z); acum += x.p;
  }
  return out;
}

function pinesDe(zs: ZonaCp[], n = 5) {
  return zs.slice(0, n).filter(z => z.lat).map(z => ({
    lat: Number(z.lat.toFixed(5)), lon: Number(z.lon.toFixed(5)), radioKm: 1, etiqueta: `${z.cp} ${z.colonias[0] || ''}`.trim(),
  }));
}

const fmt = (n: number) => n.toLocaleString('es-MX');

export function generarPlanMeta(
  zonas: ZonaCp[], zonaNombre: string, municipio: string, presupuestoDiario: number,
): ConjuntoMeta[] {
  const codigoZona = (municipio || zonaNombre).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'ZNA';
  const etiquetaZona = municipio || zonaNombre;
  const conjuntos: Omit<ConjuntoMeta, 'presupuesto' | 'pctPresupuesto'>[] = [];

  // ── A) Dueños de negocio ─────────────────────────────────
  const segTot: Record<string, number> = {};
  zonas.forEach(z => SEG_TRABAJO.forEach(s => { segTot[s] = (segTot[s] || 0) + (z.seg[s] || 0); }));
  const segTop = SEG_TRABAJO.filter(s => segTot[s] > 0).sort((a, b) => segTot[b] - segTot[a]).slice(0, 3);
  if (segTop.length) {
    const zs = elegir(zonas, z => segTop.reduce((s, k) => s + (z.seg[k] || 0), 0));
    const neg = zs.reduce((s, z) => s + segTop.reduce((t, k) => t + (z.seg[k] || 0), 0), 0);
    const [eMin, eMax] = edadDe(zs, 30, 55);
    const veh = [...new Set(segTop.flatMap(s => SEG_INFO[s].vehiculos.split(', ')))].slice(0, 4).join(', ');
    conjuntos.push({
      id: 'A', persona: 'Dueños de negocio', emoji: '🏪',
      nombre: `${codigoZona} | A Dueños de negocio | ${segTop.map(s => SEG_INFO[s].nombre.split(' ')[0]).join('+')}`,
      codigo: `${codigoZona}-A`, zonas: zs, excluir: [], pines: pinesDe(zs),
      edadMin: eMin, edadMax: eMax,
      intereses: ['Propietarios de pequeñas empresas', 'Emprendimiento', 'Pequeñas y medianas empresas',
        ...segTop.flatMap(s => SEG_INFO[s].intereses)].slice(0, 7),
      vehiculos: veh,
      textos: {
        principal: [
          `¿Tienes un negocio de ${SEG_INFO[segTop[0]].nombre} en ${etiquetaZona}? Una unidad propia te ahorra fletes y te deja surtir y entregar a tu ritmo. ${veh.split(', ').slice(0, 2).join(' y ')} listas para trabajar.`,
          `Tu negocio crece cuando tú controlas las entregas. Conoce las unidades de trabajo que se pagan solas y agenda una prueba en tu negocio.`,
          `Pick-ups y vans de carga para negocios de ${etiquetaZona}: te llevamos la cotización a tu local. Escríbenos por WhatsApp.`,
        ],
        titulo: ['La unidad de trabajo que tu negocio necesita', 'Carga más, gasta menos en fletes', 'Te llevamos la cotización a tu negocio'],
        descripcion: 'Agenda tu prueba de manejo sin salir de tu negocio.',
      },
      mensajeWhatsapp: `Hola, vi su anuncio (${codigoZona}-A) y quiero información de una unidad para mi negocio.`,
      tamano: neg, tamanoTxt: `${fmt(neg)} negocios de ${segTop.map(s => SEG_INFO[s].nombre).join(', ')}`,
      porQue: `Son los giros con más negocios en la zona; se eligieron los códigos postales donde se concentran.`,
    });
  }

  // ── B) Primer auto ───────────────────────────────────────
  const conCenso = zonas.filter(z => z.viviendas > 0);
  const zsB = elegir(conCenso.filter(z => ['C', 'C-', 'D+'].includes(z.nivelHogar)), z => z.sinAuto);
  if (zsB.length) {
    const sin = zsB.reduce((s, z) => s + z.sinAuto, 0);
    const [eMin, eMax] = edadDe(zsB, 25, 45);
    conjuntos.push({
      id: 'B', persona: 'Primer auto', emoji: '🚗',
      nombre: `${codigoZona} | B Primer auto | ${[...new Set(zsB.map(z => z.nivelHogar))].join('/')}`,
      codigo: `${codigoZona}-B`, zonas: zsB,
      excluir: conCenso.filter(z => z.nivelHogar === 'D/E').map(z => z.cp),
      pines: pinesDe(zsB),
      edadMin: eMin, edadMax: eMax,
      intereses: ['Automóviles', 'Finanzas personales', 'Uber', 'DiDi', 'Empleo'],
      vehiculos: 'Fiat Mobi, Dodge Attitude, Fiat Pulse, seminuevos',
      textos: {
        principal: [
          `Deja el transporte público: estrena tu primer auto. Fiat Mobi y Dodge Attitude, rendidores y fáciles de mantener. Escríbenos y te decimos cómo.`,
          `En ${etiquetaZona} miles de familias todavía no tienen auto. Este puede ser el año del tuyo: conoce las opciones que te acercan a estrenar.`,
          `¿Trabajas en plataforma o te mueves todos los días? Un auto propio te da tiempo e ingresos. Pregunta por nuestras opciones.`,
        ],
        titulo: ['Tu primer auto está más cerca', 'Estrena y muévete a tu ritmo', 'Deja el transporte, estrena auto'],
        descripcion: 'Atención personalizada por WhatsApp.',
      },
      mensajeWhatsapp: `Hola, vi su anuncio (${codigoZona}-B) y quiero información para mi primer auto.`,
      tamano: sin, tamanoTxt: `${fmt(sin)} hogares sin auto`,
      porQue: `Códigos postales con hogares de nivel C, C- y D+ y más viviendas sin auto (Censo 2020).`,
    });
  }

  // ── C) Renovación / SUV ──────────────────────────────────
  // Bolsillos de nivel alto: CPs con al menos 300 viviendas en AGEB C+ o A/B con auto
  const zsC = elegir(conCenso.filter(z => z.vivAlto >= 300), z => z.vivAlto, 0.85);
  if (zsC.length) {
    const con = zsC.reduce((s, z) => s + z.vivAlto, 0);
    const [eMin, eMax] = edadDe(zsC, 30, 55);
    conjuntos.push({
      id: 'C', persona: 'Renovación / SUV', emoji: '🚙',
      nombre: `${codigoZona} | C Renovación SUV | manzanas C+ y A/B`,
      codigo: `${codigoZona}-C`, zonas: zsC,
      excluir: conCenso.filter(z => ['D+', 'D/E'].includes(z.nivelHogar)).map(z => z.cp),
      pines: pinesDe(zsC),
      edadMin: eMin, edadMax: eMax,
      intereses: ['SUV', 'Automóviles', 'Viajes', 'Familia', 'Tecnología'],
      vehiculos: 'Jeep Compass, Jeep Commander, Peugeot 2008/3008, RAM 1500',
      textos: {
        principal: [
          `Es momento de cambiar tu auto: más espacio, seguridad y tecnología. Conoce Jeep Compass y Peugeot 2008 y recibe una valuación de tu auto actual.`,
          `Tu familia merece más. SUV con equipamiento de seguridad y la comodidad que buscas. Agenda tu prueba de manejo.`,
          `Recibimos tu auto a cuenta. Descubre cuánto vale hoy y llévate una SUV nueva.`,
        ],
        titulo: ['Cambia a una SUV', 'Tomamos tu auto a cuenta', 'Prueba de manejo a domicilio'],
        descripcion: 'Valuación de tu auto sin compromiso.',
      },
      mensajeWhatsapp: `Hola, vi su anuncio (${codigoZona}-C) y quiero cambiar mi auto.`,
      tamano: con, tamanoTxt: `${fmt(con)} viviendas en manzanas de nivel C+ o A/B con auto`,
      porQue: `Códigos postales que tienen manzanas (AGEB) de nivel C+ o A/B donde la mayoría de los hogares ya tiene auto (Censo 2020).`,
    });
  }

  // ── Reparto inicial del presupuesto (fase de prueba): A 40% · B 40% · C 20% ──
  // Negocios y hogares no son comparables; se reparte parejo y luego se mueve al que mejor convierta.
  const base: Record<string, number> = { A: 0.4, B: 0.4, C: 0.2 };
  const sp = conjuntos.reduce((s, c) => s + base[c.id], 0) || 1;
  const pcts = conjuntos.map(c => base[c.id] / sp);
  return conjuntos.map((c, i) => ({
    ...c,
    pctPresupuesto: Math.round(pcts[i] * 100),
    presupuesto: Math.round((presupuestoDiario * pcts[i]) / 10) * 10,
  }));
}

export function planTexto(conjuntos: ConjuntoMeta[], zona: string, presupuesto: number): string {
  const L: string[] = [`PLAN DE PAUTA META — ${zona}`, `Presupuesto diario total: $${fmt(presupuesto)} MXN`, ''];
  for (const c of conjuntos) {
    L.push(`=== Conjunto ${c.id}: ${c.persona} ===`);
    L.push(`Nombre del conjunto: ${c.nombre}`);
    L.push(`Presupuesto diario: $${fmt(c.presupuesto)} MXN (${c.pctPresupuesto}%)`);
    L.push(`Público objetivo: ${c.tamanoTxt}`);
    L.push(`Ubicación (códigos postales, México): ${c.zonas.map(z => z.cp).join(', ')}`);
    if (c.excluir.length) L.push(`Excluir códigos postales: ${c.excluir.join(', ')}`);
    L.push(`Alternativa con pines (radio 1 km): ${c.pines.map(p => `${p.lat}, ${p.lon}`).join(' | ')}`);
    L.push(`Edad: ${c.edadMin} a ${c.edadMax} · Sexo: todos`);
    L.push(`Segmentación detallada (intereses): ${c.intereses.join(', ')}`);
    L.push(`Vehículos a mostrar: ${c.vehiculos}`);
    L.push('Textos principales:'); c.textos.principal.forEach(t => L.push(`  - ${t}`));
    L.push(`Títulos: ${c.textos.titulo.join(' | ')}`);
    L.push(`Descripción: ${c.textos.descripcion}`);
    L.push(`Mensaje prellenado de WhatsApp: ${c.mensajeWhatsapp}`);
    L.push(`Por qué: ${c.porQue}`);
    L.push('');
  }
  L.push('Nota: los textos evitan mencionar crédito/enganche para no caer en la categoría especial de productos financieros de Meta.');
  return L.join('\n');
}
