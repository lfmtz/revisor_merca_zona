// Perfil de comprador por modelo: a qué tipo de zona (negocios u hogares) apunta cada auto.
// Se usa para cruzar el interés de Google Analytics con INEGI (DENUE + Censo 2020).
// Ajusta este catálogo si cambia tu línea de autos.

export type TipoPerfil = 'trabajo' | 'primer' | 'familia' | 'premium';

export interface PerfilModelo {
  tipo: TipoPerfil;
  etiqueta: string;
  niveles: string[];          // niveles de hogar objetivo (Censo)
  segmentos: string[];        // giros de negocio objetivo (DENUE), para unidades de trabajo
  edad: [number, number];     // edad típica del comprador (referencia; GA no tiene edad aún)
}

export const PERFILES: Record<TipoPerfil, Omit<PerfilModelo, 'segmentos'>> = {
  trabajo: { tipo: 'trabajo', etiqueta: 'Unidad de trabajo (negocios)', niveles: ['C+', 'C', 'C-', 'D+'], edad: [30, 55] },
  primer: { tipo: 'primer', etiqueta: 'Primer auto (hogares sin auto)', niveles: ['C', 'C-', 'D+'], edad: [22, 40] },
  familia: { tipo: 'familia', etiqueta: 'Familia / cambio de auto', niveles: ['C+', 'C'], edad: [28, 50] },
  premium: { tipo: 'premium', etiqueta: 'Renovación premium (SUV / pick-up grande)', niveles: ['A/B', 'C+'], edad: [32, 58] },
};

// Reglas por palabra clave del nombre del modelo (en minúsculas, sin acentos)
const REGLAS: { re: RegExp; tipo: TipoPerfil; segmentos?: string[] }[] = [
  { re: /4000|chasis|redilla/, tipo: 'trabajo', segmentos: ['construccion', 'reparto'] },
  { re: /ram 700|700 |1200/, tipo: 'trabajo', segmentos: ['construccion', 'automotriz', 'alimentos'] },
  { re: /promaster|rapid|expert|furgon|manager/, tipo: 'trabajo', segmentos: ['reparto', 'alimentos', 'comida'] },
  { re: /partner|fiorino/, tipo: 'trabajo', segmentos: ['alimentos', 'reparto', 'comida'] },
  { re: /demos/, tipo: 'trabajo', segmentos: ['construccion', 'reparto', 'alimentos'] },
  { re: /attitude|mobi|pulse(?! abarth)|march|v-drive|versa/, tipo: 'primer' },
  { re: /fastback|rifter|renegade|2008|sentra|b10|leapmotor/, tipo: 'familia' },
  { re: /compass|3008|5008|grand cherokee|wrangler|rubicon|jt|1500|durango|charger|commander|abarth/, tipo: 'premium' },
];

export function perfilDeModelo(modelo: string): PerfilModelo {
  const m = (modelo || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const r = REGLAS.find(x => x.re.test(m));
  const tipo: TipoPerfil = r?.tipo || 'familia';
  return { ...PERFILES[tipo], segmentos: r?.segmentos || [] };
}

export const NOMBRE_SEGMENTO: Record<string, string> = {
  construccion: 'Construcción y oficios',
  reparto: 'Reparto, mayoreo y transporte',
  alimentos: 'Abarrotes y alimentos',
  automotriz: 'Talleres y servicios automotrices',
  comida: 'Restaurantes y comida preparada',
};

// Palabras para buscar en el DENUE los negocios de cada segmento (búsqueda gratuita)
export const BUSQUEDAS_SEGMENTO: Record<string, string[]> = {
  construccion: ['materiales', 'ferreteria', 'herreria', 'tlapaleria'],
  reparto: ['distribuidora', 'transporte', 'mudanzas', 'purificadora'],
  alimentos: ['abarrotes', 'carniceria', 'panaderia', 'tortilleria'],
  automotriz: ['taller mecanico', 'refacciones', 'llantas'],
  comida: ['restaurante', 'antojitos', 'cocina economica'],
};
