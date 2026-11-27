// Censo de Población y Vivienda 2020 (INEGI) por AGEB urbana: quién vive en la zona.
// Los datos se preparan una vez (scripts/procesar_censo.py) y se sirven como archivo
// estático en /censo/agebs.json. Aquí se cargan y se resumen para el círculo escaneado.

export interface Ageb {
  cvegeo: string; lat: number; lon: number; mun: string; pob: number;
  p0_14: number | null; p18_24: number | null; p25_59: number | null; p60: number | null;
  esc: number | null; ocupados: number | null; seg_social: number | null;
  viv: number | null; ocup_viv: number | null;
  auto: number | null; moto: number | null; internet: number | null; pc: number | null;
  tvpaga: number | null; streaming: number | null;
  indice: number | null;      // NSE de hogares 0–100 (estimado)
  nivel: string;              // A/B … D/E
  distancia_km: number;
}

let cache: Promise<Ageb[]> | null = null;

export function cargarAgebs(): Promise<Ageb[]> {
  if (!cache) {
    cache = fetch('/censo/agebs.json')
      .then(r => {
        if (!r.ok) throw new Error('Los datos del Censo 2020 todavía no están cargados en la app.');
        return r.json();
      })
      .then((d: { campos: string[]; agebs: unknown[][] }) => d.agebs.map(fila => {
        const o: any = {};
        d.campos.forEach((c, i) => { o[c] = fila[i]; });
        o.indice = indiceHogar(o);
        o.nivel = nivelHogar(o.indice);
        o.distancia_km = 0;
        return o as Ageb;
      }))
      .catch(e => { cache = null; throw e; });
  }
  return cache;
}

/**
 * Índice de nivel socioeconómico de HOGARES (0–100), aproximación a la regla AMAI con
 * variables del censo: escolaridad promedio, % viviendas con auto, con internet y con computadora.
 */
export function indiceHogar(a: Pick<Ageb, 'esc' | 'auto' | 'internet' | 'pc'>): number | null {
  if (a.esc == null || a.auto == null || a.internet == null || a.pc == null) return null;
  const esc = Math.min(Math.max((a.esc - 7) / (16 - 7), 0), 1);
  const v = 0.35 * esc + 0.25 * (a.auto / 100) + 0.2 * (a.internet / 100) + 0.2 * (a.pc / 100);
  return Math.round(100 * v);
}

export function nivelHogar(i: number | null): string {
  if (i == null) return '—';
  if (i >= 78) return 'A/B';
  if (i >= 66) return 'C+';
  if (i >= 55) return 'C';
  if (i >= 45) return 'C-';
  if (i >= 35) return 'D+';
  return 'D/E';
}

function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export interface PerfilHogares {
  agebs: Ageb[];
  poblacion: number;
  viviendas: number;
  edades: { p0_14: number; p18_24: number; p25_59: number; p60: number };   // % de la población
  escolaridad: number | null;        // años promedio
  pctAuto: number | null;            // % viviendas con auto
  viviendasSinAuto: number;
  pctMoto: number | null;
  pctInternet: number | null;
  pctPc: number | null;
  pctSegSocial: number | null;       // % población con seguridad social
  pctOcupados: number | null;        // % de 18+ ocupados (aprox.)
  indice: number | null;
  nivel: string;
  distribucionNivel: Record<string, number>;   // viviendas por nivel
}

/** Resume los AGEB dentro del círculo (o los del municipio si se indica). */
export function perfilZona(todos: Ageb[], centro: { lat: number; lon: number }, radioKm: number, municipio = ''): PerfilHogares {
  const normal = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const mun = normal(municipio).split(' de ')[0];
  const agebs = todos
    .map(a => ({ ...a, distancia_km: Number(km(centro.lat, centro.lon, a.lat, a.lon).toFixed(1)) }))
    .filter(a => mun ? normal(a.mun).includes(mun) : a.distancia_km <= radioKm);

  let pob = 0, viv = 0, e0 = 0, e18 = 0, e25 = 0, e60 = 0, escS = 0, escP = 0, auto = 0, moto = 0, inter = 0, pc = 0, vivDatos = 0;
  let ss = 0, ssP = 0, ocu = 0, adultos = 0, idxS = 0, idxV = 0;
  const dist: Record<string, number> = {};
  for (const a of agebs) {
    pob += a.pob;
    e0 += a.p0_14 || 0; e18 += a.p18_24 || 0; e25 += a.p25_59 || 0; e60 += a.p60 || 0;
    if (a.esc != null) { escS += a.esc * a.pob; escP += a.pob; }
    if (a.seg_social != null) { ss += a.seg_social; ssP += a.pob; }
    if (a.ocupados != null) { ocu += a.ocupados; adultos += (a.p18_24 || 0) + (a.p25_59 || 0) + (a.p60 || 0); }
    const v = a.viv || 0;
    viv += v;
    if (v && a.auto != null) {
      vivDatos += v;
      auto += a.auto * v / 100; moto += (a.moto || 0) * v / 100;
      inter += (a.internet || 0) * v / 100; pc += (a.pc || 0) * v / 100;
    }
    if (v && a.indice != null) { idxS += a.indice * v; idxV += v; dist[a.nivel] = (dist[a.nivel] || 0) + v; }
  }
  const p = (x: number, t: number) => (t ? Math.round((1000 * x) / t) / 10 : null);
  const indice = idxV ? Math.round(idxS / idxV) : null;
  return {
    agebs, poblacion: pob, viviendas: viv,
    edades: { p0_14: p(e0, pob) || 0, p18_24: p(e18, pob) || 0, p25_59: p(e25, pob) || 0, p60: p(e60, pob) || 0 },
    escolaridad: escP ? Math.round((10 * escS) / escP) / 10 : null,
    pctAuto: p(auto, vivDatos), viviendasSinAuto: Math.round(vivDatos - auto),
    pctMoto: p(moto, vivDatos), pctInternet: p(inter, vivDatos), pctPc: p(pc, vivDatos),
    pctSegSocial: p(ss, ssP), pctOcupados: p(ocu, adultos),
    indice, nivel: nivelHogar(indice), distribucionNivel: dist,
  };
}
