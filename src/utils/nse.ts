// Nivel socioeconómico (NSE) ESTIMADO por la mezcla de negocios del DENUE (INEGI).
//
// No es el NSE oficial AMAI (ese requiere encuestas a hogares). Es un indicador
// calibrado con zonas de nivel conocido de CDMX y Edomex:
//   Polanco 94 · Satélite 86 · Del Valle 78 · Lindavista 71
//   Agrícola Oriental 19 · Neza 12 · Ecatepec norte 11 · Chalco 6
//
// Señales:
//  - Giros típicos de zonas de mayor ingreso (consultorios de especialidad privados,
//    restaurantes a la carta, despachos, bancos, inmobiliarias...).
//  - Giros típicos de zonas populares (abarrotes, tortillerías, purificadoras,
//    papelerías, pollerías...).
//  - % de establecimientos con más de 10 empleados.
//  - % de establecimientos con sitio web.
// Este archivo lo usan tanto el servidor (api/denue.ts) como el navegador.

export function normalizarTexto(t: string): string {
  return (t || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

const GIROS_ALTO: RegExp[] = [
  /medicina especializada del sector privado/, /dentales del sector privado/,
  /a la carta o de comida corrida/, /bufetes juridicos/, /contabilidad y auditoria/,
  /consultoria en administracion/, /banca multiple/, /estacionamientos y pensiones/,
  /inmobiliarias/, /diseno de sistemas de computo/, /laboratorios medicos.*privado/,
  /agencias de viajes/, /agencias de publicidad/, /joyeria/, /muebles para el hogar/,
  /aparatos deportivos/, /nutriologos/, /servicios de ingenieria/,
  /administracion de negocios/, /alquiler sin intermediacion de oficinas/, /audiologia/,
  /hoteles con/, /automoviles y camionetas nuevos/,
  /acondicionamiento fisico del sector privado/, /escuelas.*sector privado/,
  /hospitales.*sector privado/,
];

const GIROS_BAJO: RegExp[] = [
  /abarrotes, ultramarinos/, /articulos de papeleria/, /articulos para la limpieza/,
  /carne de aves/, /frutas y verduras frescas/, /purificacion y embotellado de agua/,
  /tortillas de maiz/, /carnes rojas/, /productos de herreria/, /dulces y materias primas/,
  /semillas y granos/, /leche, otros productos lacteos/, /preparacion de antojitos/,
  /reparacion mecanica en general/, /ferreterias y tlapalerias/, /casas de empeno/,
  /panificacion tradicional/,
];

export type TipoGiro = 'alto' | 'bajo' | null;

export function clasificarGiro(claseActividad: string): TipoGiro {
  const c = normalizarTexto(claseActividad);
  if (GIROS_ALTO.some(r => r.test(c))) return 'alto';
  if (GIROS_BAJO.some(r => r.test(c))) return 'bajo';
  return null;
}

/** true si el establecimiento tiene más de 10 empleados. */
export function esEstablecimientoGrande(estrato: string): boolean {
  const e = normalizarTexto(estrato);
  return !!e && !e.startsWith('0 a 5') && !e.startsWith('6 a 10');
}

export interface IndicadoresZona {
  total: number;
  alto: number;
  bajo: number;
  grandes: number;
  web: number;
}

export function indicadoresVacios(): IndicadoresZona {
  return { total: 0, alto: 0, bajo: 0, grandes: 0, web: 0 };
}

export function sumarIndicadores(a: IndicadoresZona, b: IndicadoresZona): IndicadoresZona {
  return {
    total: a.total + b.total,
    alto: a.alto + b.alto,
    bajo: a.bajo + b.bajo,
    grandes: a.grandes + b.grandes,
    web: a.web + b.web,
  };
}

/** Índice 0–100 (más alto = mayor nivel socioeconómico estimado). null si hay pocos datos. */
export function calcularIndiceNse(ind: IndicadoresZona, minimo = 25): number | null {
  if (ind.total < minimo) return null;
  const ratio = ind.alto + ind.bajo > 0 ? ind.alto / (ind.alto + ind.bajo) : 0.5;
  const grandes = ind.grandes / ind.total;
  const web = ind.web / ind.total;
  const idx = 100 * (0.55 * ratio + 0.25 * Math.min(grandes / 0.30, 1) + 0.20 * Math.min(web / 0.40, 1));
  return Math.round(idx);
}

export interface NivelNse {
  nivel: 'A/B' | 'C+' | 'C' | 'C-' | 'D+' | 'D/E' | 'Sin datos';
  descripcion: string;
  color: string;
  perfilVenta: string;
}

export function nivelDesdeIndice(indice: number | null): NivelNse {
  if (indice === null) {
    return { nivel: 'Sin datos', descripcion: 'Muy pocos negocios para estimar', color: '#6B7280', perfilVenta: '—' };
  }
  if (indice >= 80) return {
    nivel: 'A/B', descripcion: 'Alto', color: '#22C55E',
    perfilVenta: 'Autos nuevos de gama media-alta, SUV y versiones tope; contado o crédito con enganche alto.',
  };
  if (indice >= 60) return {
    nivel: 'C+', descripcion: 'Medio alto', color: '#84CC16',
    perfilVenta: 'Autos nuevos medianos y SUV compactas; crédito a 36–48 meses.',
  };
  if (indice >= 35) return {
    nivel: 'C', descripcion: 'Medio', color: '#EAB308',
    perfilVenta: 'Compactos y subcompactos nuevos; crédito con enganche bajo.',
  };
  if (indice >= 18) return {
    nivel: 'C-', descripcion: 'Medio bajo', color: '#F97316',
    perfilVenta: 'Subcompactos de entrada y seminuevos; planes de enganche mínimo.',
  };
  if (indice >= 9) return {
    nivel: 'D+', descripcion: 'Bajo', color: '#EF4444',
    perfilVenta: 'Seminuevos y unidades de trabajo (pick-up, van) para negocios; autofinanciamiento.',
  };
  return {
    nivel: 'D/E', descripcion: 'Muy bajo', color: '#B91C1C',
    perfilVenta: 'Unidades de trabajo para negocios establecidos; seminuevos económicos.',
  };
}
