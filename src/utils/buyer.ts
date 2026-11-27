// Perfil de zona → segmentos de compradores, buyer personas y recomendaciones de pauta.
// Fase 1: se basa en el DENUE (negocios) y el nivel socioeconómico estimado.
// Es una ESTIMACIÓN para orientar la pauta, no datos de personas.

import { CategorySummary } from '../types';
import { ResultadoNse, ColoniaNse } from '../services/denueScan';
import type { PerfilHogares } from '../services/censo';

function norm(t: string): string {
  return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// ─────────────────────────────────────────────────────────────
// Segmentos de negocio según su necesidad de vehículo
// ─────────────────────────────────────────────────────────────
export interface SegmentoDef {
  id: string;
  nombre: string;
  emoji: string;
  patrones: RegExp[];
  vehiculo: string;
  modelos: string;              // ejemplos Stellantis (ajustar al catálogo vigente)
  mensaje: string;
  necesidad: string;
  intereses: string[];          // Meta
  palabras: string[];           // Google Ads ({lugar} se reemplaza por el municipio)
}

export const SEGMENTOS: SegmentoDef[] = [
  {
    id: 'construccion', nombre: 'Construcción y oficios', emoji: '🏗️',
    patrones: [/construccion|edificacion|materiales para la construccion|ferreteria|tlapaleria|herreria|carpinteria|vidrio|plomeria|electrico|pintura|aluminio|cerrajeria|instalaciones/],
    vehiculo: 'Pick-up de trabajo', modelos: 'RAM 700, RAM 1200, RAM 2500/4000',
    mensaje: 'Tu herramienta de trabajo que se paga sola: carga material, llega a la obra y factura como gasto.',
    necesidad: 'Cargar material y herramienta y llegar a la obra; que la unidad genere ingreso.',
    intereses: ['Construcción', 'Herramientas', 'Remodelación', 'Camionetas pickup', 'Propietarios de pequeñas empresas'],
    palabras: ['camioneta pick up a crédito', 'pick up para trabajo {lugar}', 'ram 700 precio', 'camioneta de carga con enganche bajo'],
  },
  {
    id: 'reparto', nombre: 'Distribución, reparto y mayoreo', emoji: '📦',
    patrones: [/al por mayor|transporte|mensajeria|paqueteria|mudanza|almacen|distribu|purificacion y embotellado de agua|reparto/],
    vehiculo: 'Van o carga ligera', modelos: 'RAM ProMaster, Peugeot Partner, Fiat Fiorino, RAM 700',
    mensaje: 'Más entregas por día y menos gasto en fletes: unidad de carga a crédito con mensualidades fijas.',
    necesidad: 'Hacer más entregas por día y dejar de pagar fletes.',
    intereses: ['Logística', 'Comercio mayorista', 'Vehículos comerciales', 'Propietarios de pequeñas empresas'],
    palabras: ['van de carga a crédito', 'camioneta de reparto {lugar}', 'ram promaster precio', 'camioneta para reparto con enganche bajo'],
  },
  {
    id: 'alimentos', nombre: 'Comercio de alimentos y abarrotes', emoji: '🛒',
    patrones: [/abarrotes|carne|frutas y verduras|tortillas|panificacion|leche|dulces|semillas|pollo|pescados|huevo|bebidas|hielo|minisuper/],
    vehiculo: 'Carga ligera / utilitario', modelos: 'Fiat Fiorino, Peugeot Partner, RAM 700',
    mensaje: 'Surte tu negocio tú mismo: ahorra en proveedores y fletes con una unidad que cabe en cualquier calle.',
    necesidad: 'Surtir su negocio sin depender de proveedores ni fletes.',
    intereses: ['Comercio minorista', 'Tiendas de abarrotes', 'Emprendimiento', 'Propietarios de pequeñas empresas'],
    palabras: ['camioneta para negocio a crédito', 'auto de carga pequeño {lugar}', 'fiat fiorino precio', 'camioneta para surtir negocio'],
  },
  {
    id: 'automotriz', nombre: 'Talleres y servicios automotrices', emoji: '🔧',
    patrones: [/reparacion mecanica|hojalateria|automoviles|refacciones|llantas|lavado|autopartes|vulcaniz|alineacion/],
    vehiculo: 'Pick-up o van de servicio', modelos: 'RAM 700, RAM 1200, Peugeot Partner',
    mensaje: 'Servicio a domicilio y traslado de refacciones: amplía tu taller sobre ruedas.',
    necesidad: 'Dar servicio a domicilio y mover refacciones.',
    intereses: ['Mecánica automotriz', 'Refacciones', 'Camionetas pickup', 'Propietarios de pequeñas empresas'],
    palabras: ['pick up para taller a crédito', 'camioneta de servicio {lugar}', 'ram 700 a crédito'],
  },
  {
    id: 'salud', nombre: 'Salud y profesionistas', emoji: '🩺',
    patrones: [/consultorio|medic|dental|laboratorio|hospital|clinica|bufete|contabilidad|notari|arquitect|ingenieria|veterinari|psicolog|optica/],
    vehiculo: 'Sedán, hatchback o SUV', modelos: 'Peugeot 208/2008, Fiat Pulse, Jeep Compass',
    mensaje: 'Imagen profesional y comodidad para tus traslados: estrena con un plan a tu medida.',
    necesidad: 'Trasladarse con comodidad e imagen profesional.',
    intereses: ['Medicina', 'Odontología', 'Profesionales independientes', 'SUV', 'Automóviles'],
    palabras: ['auto para profesionistas a crédito', 'suv a crédito {lugar}', 'peugeot 2008 precio', 'jeep compass mensualidades'],
  },
  {
    id: 'comida', nombre: 'Restaurantes y comida preparada', emoji: '🌮',
    patrones: [/restaurante|antojitos|cafeteria|comida|banquetes|cocina|alimentos para llevar|pizzas|tacos/],
    vehiculo: 'Utilitario de reparto', modelos: 'Fiat Fiorino, Peugeot Partner, RAM 700',
    mensaje: 'Reparto propio sin comisiones de apps y compras de insumos sin depender de nadie.',
    necesidad: 'Repartir pedidos sin pagar comisiones de apps y comprar insumos.',
    intereses: ['Restaurantes', 'Comida a domicilio', 'Emprendimiento', 'Propietarios de pequeñas empresas'],
    palabras: ['auto para reparto de comida a crédito', 'camioneta para negocio de comida {lugar}', 'fiat fiorino a crédito'],
  },
  {
    id: 'servicios', nombre: 'Servicios personales y comercio', emoji: '🏪',
    patrones: [/salon|belleza|peluqueria|estetica|lavanderia|papeleria|ropa|calzado|regalos|telefonos|celulares|computadoras|gimnasio|escuela|guarderia/],
    vehiculo: 'Subcompacto o SUV compacta', modelos: 'Fiat Mobi, Fiat Pulse, Peugeot 208',
    mensaje: 'Tu primer auto o el familiar: mensualidades que caben en lo que gana tu negocio.',
    necesidad: 'Moverse por su cuenta y llevar material de su negocio; muchas veces es el auto de la familia.',
    intereses: ['Emprendimiento', 'Belleza', 'Comercio minorista', 'Automóviles', 'Familia'],
    palabras: ['primer auto a crédito', 'auto con enganche bajo {lugar}', 'fiat mobi precio', 'fiat pulse mensualidades'],
  },
];

export interface ConteoSegmento {
  def: SegmentoDef;
  negocios: number;
  grandes: number;     // con más de 10 empleados
  pct: number;
}

export function contarSegmentos(categorias: CategorySummary[]): ConteoSegmento[] {
  const total = categorias.reduce((s, c) => s + c.cantidad, 0) || 1;
  return SEGMENTOS.map(def => {
    let negocios = 0, grandes = 0;
    for (const c of categorias) {
      if (def.patrones.some(p => p.test(norm(c.categoria)))) {
        negocios += c.cantidad;
        if (c.tipo_entidad === 'empresa') grandes += c.cantidad;
      }
    }
    return { def, negocios, grandes, pct: Math.round((negocios / total) * 100) };
  }).filter(s => s.negocios > 0).sort((a, b) => b.negocios - a.negocios);
}

// ─────────────────────────────────────────────────────────────
// Buyer personas
// ─────────────────────────────────────────────────────────────
export interface BuyerPersona {
  titulo: string;
  emoji: string;
  tipo: 'Negocio' | 'Particular';
  quien: string;
  edad: string;
  necesita: string;
  vehiculos: string;
  oferta: string;
  mensajes: string[];
  objeciones: string[];
  intereses: string[];           // para segmentar en Meta
  palabrasClave: string[];       // para Google Ads
  peso: number;                  // tamaño relativo del segmento
}

const nivelGrupo = (n: string) => (n === 'A/B' || n === 'C+') ? 'alto' : (n === 'C' ? 'medio' : 'popular');

/**
 * Nombre de la zona para textos y palabras clave. Si la zona es "X km alrededor de …",
 * se toma la colonia/municipio de la dirección del punto de partida.
 */
export function lugarDeZona(zona: string, direccionPunto: string): { lugar: string; municipio: string } {
  if (!/^\d+(\.\d+)? km alrededor/.test(zona)) {
    const mun = zona.split(',')[0].trim();
    return { lugar: mun, municipio: mun };
  }
  const partes = direccionPunto.split(',').map(p => p.trim())
    .filter(p => p && !/^\d/.test(p) && !/^(calle|calz|calzada|av|avenida|blvd|boulevard|privada|cerrada|eje)\b/i.test(p)
      && !/m[eé]xico|cdmx|ciudad de|estado de/i.test(p));
  const municipio = partes[partes.length - 1] || 'tu zona';
  const colonia = partes.length > 1 ? partes[partes.length - 2] : '';
  return { lugar: colonia ? `${colonia}, ${municipio}` : municipio, municipio };
}

/** Rango de edad del comprador según la pirámide de la zona (Censo 2020). */
function edadCompradores(h: PerfilHogares | null | undefined, porDefecto: string): string {
  if (!h || !h.poblacion) return porDefecto;
  const { p18_24, p25_59, p60 } = h.edades;
  const adultos = p18_24 + p25_59 + p60 || 1;
  if (p18_24 / adultos >= 0.2) return '22 a 45 años';
  if (p60 / adultos >= 0.3) return '35 a 60 años';
  return '28 a 50 años';
}

export function generarPersonas(
  segmentos: ConteoSegmento[], nse: ResultadoNse, zona: string, direccionPunto = '',
  hogares?: PerfilHogares | null,
): BuyerPersona[] {
  // Con datos del censo, el perfil de particulares usa el nivel de HOGARES; si no, el de negocios
  const grupo = nivelGrupo(hogares?.nivel && hogares.nivel !== '—' ? hogares.nivel : nse.nivel.nivel);
  const nivelTxt = hogares?.nivel && hogares.nivel !== '—' ? hogares.nivel : nse.nivel.nivel;
  const datoAuto = hogares?.pctAuto != null
    ? ` En la zona ${hogares.pctAuto}% de los hogares tiene auto: ~${hogares.viviendasSinAuto.toLocaleString('es-MX')} viviendas no tienen.`
    : '';
  const { lugar, municipio } = lugarDeZona(zona, direccionPunto);
  const mun = municipio.toLowerCase();
  const personas: BuyerPersona[] = [];

  // 1–2 personas de NEGOCIO (los segmentos más grandes)
  for (const s of segmentos.slice(0, 2)) {
    const d = s.def;
    personas.push({
      titulo: `Dueño(a) de negocio · ${d.nombre}`,
      emoji: d.emoji,
      tipo: 'Negocio',
      quien: `Propietario(a) de un negocio pequeño de ${d.nombre.toLowerCase()} en la zona de ${lugar}. ` +
        `Hay ~${s.negocios.toLocaleString('es-MX')} negocios así en la zona (${s.pct}% del total)` +
        (s.grandes ? `, ${s.grandes.toLocaleString('es-MX')} con más de 10 empleados (posibles flotillas).` : '.'),
      edad: '30 a 55 años',
      necesita: `${d.vehiculo}. ${d.necesidad}`,
      vehiculos: d.modelos,
      oferta: grupo === 'popular'
        ? 'Enganche bajo, mensualidad fija y plazo largo; aceptar comprobación de ingresos de negocio.'
        : 'Crédito empresarial o arrendamiento; deducibilidad y facturación a nombre del negocio.',
      mensajes: [d.mensaje, 'Te llevamos la cotización a tu negocio.', 'Crédito con comprobantes de tu negocio.'],
      objeciones: grupo === 'popular'
        ? ['"No me van a aprobar el crédito"', '"No tengo para el enganche"', '"Mi negocio no está formalizado"']
        : ['"Prefiero esperar a fin de año"', '"Me sale mejor rentar"', '"Ya tengo una unidad"'],
      intereses: d.intereses,
      palabrasClave: [...d.palabras.map(w => w.replace('{lugar}', mun)), `crédito automotriz para negocio ${mun}`],
      peso: s.negocios,
    });
  }

  // Persona PARTICULAR según nivel socioeconómico
  const particular: BuyerPersona = grupo === 'alto' ? {
    titulo: 'Profesionista que renueva su auto', emoji: '👔', tipo: 'Particular',
    quien: `Vive o trabaja en la zona de ${lugar}, de nivel ${nivelTxt}. Ya tiene auto y busca cambiarlo por uno más nuevo, seguro o espacioso.${datoAuto}`,
    edad: '30 a 50 años',
    necesita: 'Comodidad, tecnología y seguridad para la familia o el trabajo.',
    vehiculos: 'Jeep Compass/Commander, Peugeot 2008/3008, RAM 1500',
    oferta: 'Toma de auto a cuenta, crédito a 36–48 meses, versiones tope.',
    mensajes: ['Cambia tu auto: tomamos el tuyo a cuenta.', 'Prueba de manejo a domicilio.', 'Equipamiento y seguridad de serie.'],
    objeciones: ['"Mi auto todavía sirve"', '"Las tasas están altas"', '"Quiero ver otras marcas"'],
    intereses: ['SUV', 'Automóviles', 'Viajes', 'Tecnología', 'Familia'],
    palabrasClave: [`suv a crédito ${mun}`, 'cambiar mi auto', 'jeep compass precio', 'peugeot 2008 precio'],
    peso: 0,
  } : grupo === 'medio' ? {
    titulo: 'Familia que compra auto nuevo', emoji: '👨‍👩‍👧', tipo: 'Particular',
    quien: `Familia de la zona de ${lugar} (nivel ${nivelTxt}) con ingreso estable; busca auto nuevo confiable o cambiar un usado.${datoAuto}`,
    edad: '28 a 45 años',
    necesita: 'Auto rendidor y seguro, mensualidad que no apriete.',
    vehiculos: 'Fiat Pulse, Peugeot 208, Fiat Mobi; seminuevos certificados',
    oferta: 'Enganche desde 10–20%, plazos a 48–60 meses, seguro incluido.',
    mensajes: ['Estrena con mensualidades que sí te caben.', 'Rendimiento de gasolina que se nota.', 'Seguro incluido el primer año.'],
    objeciones: ['"Me alcanza solo para un usado"', '"No sé si me aprueban"', '"Los seguros son caros"'],
    intereses: ['Automóviles', 'Familia', 'Finanzas personales', 'Compras'],
    palabrasClave: [`auto nuevo a crédito ${mun}`, 'auto con enganche bajo', 'fiat pulse precio', 'peugeot 208 mensualidades'],
    peso: 0,
  } : {
    titulo: 'Trabajador(a) que busca su primer auto', emoji: '🧑‍🔧', tipo: 'Particular',
    quien: `Vive en la zona de ${lugar} (nivel ${nivelTxt}); se mueve en transporte público o moto y quiere su primer auto, o uno para trabajar en plataforma.${datoAuto}`,
    edad: '23 a 40 años',
    necesita: 'Movilidad propia y, muchas veces, generar ingreso (apps de transporte o reparto).',
    vehiculos: 'Fiat Mobi, Dodge Attitude, seminuevos económicos',
    oferta: 'Enganche mínimo, plazos largos, autofinanciamiento o crédito con buró flexible.',
    mensajes: ['Tu primer auto con enganche mínimo.', 'Trabaja en plataforma con tu propio auto.', 'Te ayudamos aunque no tengas historial.'],
    objeciones: ['"No tengo historial de crédito"', '"Gano en efectivo"', '"Me da miedo endeudarme"'],
    intereses: ['Automóviles', 'Uber', 'DiDi', 'Empleo', 'Finanzas personales'],
    palabrasClave: [`primer auto a crédito ${mun}`, 'auto sin historial crediticio', 'auto para uber a crédito', 'auto con enganche bajo'],
    peso: 0,
  };
  particular.edad = edadCompradores(hogares, particular.edad);
  personas.push(particular);
  return personas;
}

// ─────────────────────────────────────────────────────────────
// Recomendación de pauta
// ─────────────────────────────────────────────────────────────
export interface CpRecomendado {
  cp: string;
  colonias: string[];
  negocios: number;
  nivel: string;
  distancia_km: number;
}

/** Códigos postales de la zona ordenados por número de negocios (filtrables por nivel). */
export function codigosPostales(colonias: ColoniaNse[], niveles?: Set<string>): CpRecomendado[] {
  const m = new Map<string, CpRecomendado & { _idx: number; _n: number }>();
  for (const c of colonias) {
    if (!/^\d{5}$/.test(c.cp)) continue;
    if (niveles && c.indice !== null && !niveles.has(c.nivel.nivel)) continue;
    const v = m.get(c.cp) || { cp: c.cp, colonias: [], negocios: 0, nivel: '', distancia_km: c.distancia_km, _idx: 0, _n: 0 };
    v.colonias.push(c.colonia);
    v.negocios += c.total;
    v.distancia_km = Math.min(v.distancia_km, c.distancia_km);
    if (c.indice !== null) { v._idx += c.indice * c.total; v._n += c.total; }
    m.set(c.cp, v);
  }
  return [...m.values()].map(v => {
    const idx = v._n ? v._idx / v._n : null;
    const nivel = idx === null ? '—' : idx >= 80 ? 'A/B' : idx >= 60 ? 'C+' : idx >= 35 ? 'C' : idx >= 18 ? 'C-' : idx >= 9 ? 'D+' : 'D/E';
    return { cp: v.cp, colonias: v.colonias, negocios: v.negocios, nivel, distancia_km: v.distancia_km };
  }).sort((a, b) => b.negocios - a.negocios);
}

export function briefTexto(
  zona: string, punto: { lat: number; lon: number; direccion: string }, radioKm: number,
  nse: ResultadoNse, segmentos: ConteoSegmento[], personas: BuyerPersona[], cps: CpRecomendado[],
  hogares?: PerfilHogares | null,
): string {
  const L: string[] = [];
  L.push(`BRIEF DE PAUTA — ${zona}`);
  L.push(`Generado: ${new Date().toLocaleString('es-MX')} · Fuente: DENUE INEGI (estimación)`);
  L.push('');
  L.push('1. ZONA');
  L.push(`Centro: ${punto.direccion} (${punto.lat.toFixed(5)}, ${punto.lon.toFixed(5)}) · Radio: ${radioKm} km`);
  L.push(`Nivel socioeconómico estimado: ${nse.nivel.nivel} (${nse.nivel.descripcion}, índice ${nse.indice ?? '—'}/100)`);
  L.push(`Negocios registrados: ${nse.indicadores.total.toLocaleString('es-MX')}`);
  if (hogares && hogares.poblacion) {
    L.push('');
    L.push('QUIÉN VIVE AQUÍ (Censo 2020, INEGI)');
    L.push(`Población: ${hogares.poblacion.toLocaleString('es-MX')} · Viviendas: ${hogares.viviendas.toLocaleString('es-MX')} · NSE de hogares estimado: ${hogares.nivel}`);
    L.push(`Edades: 0–14 ${hogares.edades.p0_14}% · 18–24 ${hogares.edades.p18_24}% · 25–59 ${hogares.edades.p25_59}% · 60+ ${hogares.edades.p60}%`);
    L.push(`Escolaridad promedio: ${hogares.escolaridad ?? '—'} años · Con seguridad social: ${hogares.pctSegSocial ?? '—'}%`);
    L.push(`Hogares con auto: ${hogares.pctAuto ?? '—'}% (≈${hogares.viviendasSinAuto.toLocaleString('es-MX')} sin auto) · con moto: ${hogares.pctMoto ?? '—'}% · internet: ${hogares.pctInternet ?? '—'}% · computadora: ${hogares.pctPc ?? '—'}%`);
  }
  L.push('');
  L.push('2. SEGMENTOS DE NEGOCIO (necesidad de vehículo)');
  segmentos.forEach(s => L.push(`- ${s.def.nombre}: ${s.negocios.toLocaleString('es-MX')} (${s.pct}%) → ${s.def.vehiculo} · ${s.def.modelos}`));
  L.push('');
  L.push('3. BUYER PERSONAS');
  personas.forEach((p, i) => {
    L.push(`${i + 1}) ${p.titulo} [${p.tipo}] · Edad sugerida: ${p.edad}`);
    L.push(`   Quién: ${p.quien}`);
    L.push(`   Necesita: ${p.necesita}`);
    L.push(`   Vehículos: ${p.vehiculos}`);
    L.push(`   Oferta: ${p.oferta}`);
    L.push(`   Mensajes: ${p.mensajes.join(' | ')}`);
    L.push(`   Objeciones: ${p.objeciones.join(' | ')}`);
    L.push(`   Meta – intereses: ${p.intereses.join(', ')}`);
    L.push(`   Google Ads – palabras clave: ${p.palabrasClave.join(', ')}`);
  });
  L.push('');
  L.push('4. SEGMENTACIÓN GEOGRÁFICA');
  L.push(`Opción A (radio): pin en ${punto.lat.toFixed(5)}, ${punto.lon.toFixed(5)} con ${radioKm} km.`);
  L.push(`Opción B (códigos postales, ordenados por negocios): ${cps.slice(0, 25).map(c => c.cp).join(', ')}`);
  L.push('');
  L.push('Nota: perfiles estimados con datos públicos agregados (no son datos personales). Validar con resultados de campaña.');
  return L.join('\n');
}
