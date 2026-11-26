import { llamarApi } from './apiCliente';
import { PUNTO_PARTIDA, rutaDesdeTrabajo } from './apifyService';
import { ReporteInteligencia, ProspectoB2B, CompetidorAgencia } from '../types';

export const DENUE_API_BASE = "https://www.inegi.org.mx/app/api/denue/v1/consulta/Buscar";
export const DENUE_MAPA_URL = "https://www.inegi.org.mx/app/mapa/denue/default.aspx";
export const INEGI_NSE_URL = "https://www.inegi.org.mx/app/mapa/espacioydatos/default.aspx";

// Alcaldías y municipios de alta densidad comercial e industrial en México
export const MUNICIPIOS_ALTA_DENSIDAD = new Set([
  "iztacalco", "iztapalapa", "venustiano carranza", "gustavo a madero",
  "cuauhtémoc", "cuauhtemoc", "benito juárez", "benito juarez",
  "miguel hidalgo", "alvaro obregón", "alvaro obregon", "azcapotzalco",
  "zapopan", "guadalajara", "tlaquepaque", "tonala", "tlajomulco",
  "monterrey", "san pedro garza garcía", "san pedro garza garcia", "san nicolás", "guadalupe", "apodaca",
  "puebla", "querétaro", "queretaro", "león", "leon", "tijuana", "mexicali",
  "toluca", "naucalpan", "tlalnepantla", "ecatepec", "cuautitlan izcalli",
  "mérida", "merida", "san luis potosí", "san luis potosi", "hermosillo", "chihuahua", "aguascalientes"
]);

export const MARCAS_AUTOMOTRICES = [
  "Chevrolet", "Nissan", "Volkswagen", "Ford", "Toyota", "Honda",
  "Kia", "Hyundai", "Mazda", "Stellantis", "Renault", "Suzuki",
  "BYD", "MG", "Chirey", "Geely", "GWM", "Omoda", "JAC", "Peugeot",
  "Audi", "BMW", "Mercedes-Benz"
];

export function calcularDistanciaHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371; // Radio terrestre km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((r * c).toFixed(2));
}

export function obtenerTokenDenue(): string | null {
  try {
    return localStorage.getItem('INEGI_DENUE_TOKEN') || '39518023-869c-4571-84a3-6a731a853a48';
  } catch {
    return null;
  }
}

export function guardarTokenDenue(token: string): void {
  try {
    localStorage.setItem('INEGI_DENUE_TOKEN', token.trim());
  } catch {
    // Ignore
  }
}

export function generarLinkDenue(termino: string, estado: string = "", municipio: string = ""): string {
  const query = `${termino} ${municipio} ${estado}`.trim();
  return `${DENUE_MAPA_URL}?q=${encodeURIComponent(query)}`;
}

export function generarLinkInegiNse(lat: number, lon: number): string {
  return `${INEGI_NSE_URL}?lat=${lat}&lon=${lon}&z=14`;
}

function deducirMarcaAutomotriz(nombre: string): string {
  const lower = nombre.toLowerCase();
  for (const m of MARCAS_AUTOMOTRICES) {
    if (lower.includes(m.toLowerCase())) return m;
  }
  return "Multimarca / Agencia Local";
}

// Búsqueda REAL en el DENUE vía el servidor (/api/denue). Sin datos inventados de respaldo:
// si falla, se lanza el error para mostrarlo.
export async function buscarEnDenue(
  lat: number,
  lon: number,
  radioMetros: number = 5000,
  termino: string = "hospital",
  _tokenInegi?: string | null
): Promise<any[]> {
  const qs = new URLSearchParams({
    termino, lat: String(lat), lon: String(lon), radio_m: String(Math.min(5000, radioMetros)),
  });
  const d = await llamarApi(`/api/denue?${qs.toString()}`);
  return (d.items || []).map((it: any) => ({
    nombre: it.nombre || "Establecimiento sin nombre",
    actividad: it.actividad || termino,
    telefono: it.telefono || "Sin teléfono registrado",
    email: it.correo || "No disponible",
    web: it.web || "",
    direccion: it.direccion || "Dirección no disponible",
    // Distancia desde tu lugar de trabajo (punto de partida de las rutas)
    distancia_km: calcularDistanciaHaversine(PUNTO_PARTIDA.lat, PUNTO_PARTIDA.lon, it.lat, it.lon),
    coordenadas: { lat: it.lat, lon: it.lon }
  }));
}

export async function generarReporteInteligencia(
  estado: string,
  municipio: string,
  lat: number,
  lon: number,
  tokenInegi?: string | null,
  radioKm: number = 10
): Promise<ReporteInteligencia> {
  const token = tokenInegi || obtenerTokenDenue();
  const radioM = Math.round(radioKm * 1000);

  // 1. Prospectos B2B (búsquedas reales en el DENUE; máx. 5 km de radio por consulta)
  const terminos = ["hospital", "transporte", "construccion", "escuela", "restaurante", "gobierno", "automoviles"];
  const resultados = await Promise.allSettled(terminos.map(t => buscarEnDenue(lat, lon, radioM, t, token)));
  const fallidas = resultados.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
  if (fallidas.length === resultados.length) {
    throw new Error(fallidas[0]?.reason?.message || 'No se pudo consultar el DENUE.');
  }
  // La búsqueda del DENUE también encuentra coincidencias en el NOMBRE (p. ej. "Hospital de Ropa"),
  // así que cada sección se filtra por el GIRO real.
  const GIRO_POR_TERMINO: RegExp[] = [
    /hospital|clinica|consultorio|laboratorio|medic|enfermer|ambulancia/,
    /transporte|mensajeria|paqueteria|mudanza|carga|almacen|logistic/,
    /construccion|edificacion|obra|fabricacion|manufactur|industria|maquinaria|herreria|estructura/,
    /escuela|educacion|colegio|universid|bufete|contabilidad|notari|arquitect|ingenieria/,
    /restaurante|alimentos|cafeteria|banquete|cocina|comida/,
    /administracion publica|gobierno|seguridad|organismo|legislativ|imparticion|proteccion civil|policia/,
    /automoviles|camionetas|agencia/,
  ];
  const norm = (t: string) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const [hospRaw, repRaw, flotRaw, eduRaw, restRaw, gobRaw, agenciasRawTodos] =
    resultados.map((r, i) => (r.status === 'fulfilled' ? r.value : [])
      .filter((it: any) => GIRO_POR_TERMINO[i].test(norm(it.actividad))));
  // Competencia: solo agencias / venta de autos
  const agenciasRaw = agenciasRawTodos.filter((it: any) => /automoviles y camionetas|agencia/i.test(
    (it.actividad || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')));

  const cleanProspects = (arr: any[], enfoque: string): ProspectoB2B[] => {
    const seen = new Set<string>();
    const res: ProspectoB2B[] = [];
    for (const it of arr) {
      const nom = it.nombre?.trim();
      if (nom && !seen.has(nom)) {
        seen.add(nom);
        const coords = it.coordenadas;
        const linkGps = (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon))
          ? rutaDesdeTrabajo(coords.lat, coords.lon)
          : rutaDesdeTrabajo(undefined, undefined, undefined, it.direccion || nom);

        res.push({
          nombre: nom,
          actividad: it.actividad || "Giro comercial",
          telefono: it.telefono || "Sin teléfono registrado",
          web: it.web || "",
          email: it.email && it.email !== "No disponible" ? it.email : "",
          direccion: it.direccion || "Dirección no disponible",
          distancia_km: it.distancia_km || 0,
          enfoque_vehiculo: enfoque,
          coordenadas: coords,
          link_gps: linkGps
        });
      }
    }
    return res.sort((a, b) => a.distancia_km - b.distancia_km);
  };

  const hospitales = cleanProspects(hospRaw, "Médicos / Flotilla Ambulancias & Ejecutivos");
  const empresas_reparto = cleanProspects(repRaw, "Comercial / RAM & Utilitarios de Reparto");
  const empresas_flotilla = cleanProspects(flotRaw, "Pesado & Flotillas / RAM Heavy Duty & Pick-ups");
  const educacion_profesionistas = cleanProspects(eduRaw, "Pasajeros & Ejecutivos / Jeep, Peugeot, Dodge, Fiat");
  const restaurantes_comercio = cleanProspects(restRaw, "Utilitarios & Carga Ligera / RAM 700, Vans");
  const gobierno_servicios = cleanProspects(gobRaw, "Licitaciones & Utilitarios / RAM ProMaster, Seguridad");

  // 2. Competencia
  const compSeen = new Set<string>();
  const competencia: CompetidorAgencia[] = [];
  for (const it of agenciasRaw) {
    const nom = it.nombre?.trim();
    if (nom && !compSeen.has(nom)) {
      compSeen.add(nom);
      const coords = it.coordenadas;
      const linkGps = (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon))
        ? rutaDesdeTrabajo(coords.lat, coords.lon)
        : rutaDesdeTrabajo(undefined, undefined, undefined, `${nom} ${municipio} ${estado}`);

      competencia.push({
        nombre: nom,
        marca_estimada: deducirMarcaAutomotriz(nom),
        distancia_km: it.distancia_km || 0,
        link_maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nom} ${municipio} ${estado}`)}`,
        coordenadas: coords,
        link_gps: linkGps
      });
    }
  }
  competencia.sort((a, b) => a.distancia_km - b.distancia_km);

  // 3. Links Útiles
  const links_utiles = {
    denue_hospitales: generarLinkDenue("hospital", estado, municipio),
    denue_transporte: generarLinkDenue("transporte", estado, municipio),
    denue_educacion: generarLinkDenue("escuela", estado, municipio),
    denue_restaurantes: generarLinkDenue("restaurante", estado, municipio),
    denue_gobierno: generarLinkDenue("alcaldia", estado, municipio),
    inegi_nse: generarLinkInegiNse(lat, lon),
    google_maps_competencia: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`agencias de autos en ${municipio} ${estado}`)}`
  };

  // 4. Score de Oportunidad (1 al 10)
  let score = 0;
  const desglose_puntos: string[] = [];

  // +2 si > 5 hospitales o clínicas
  if (hospitales.length > 5) {
    score += 2;
    desglose_puntos.push("+2 pts: Alta concentración médica (>5 hospitales o clínicas)");
  } else if (hospitales.length >= 2) {
    score += 1;
    desglose_puntos.push("+1 pto: Presencia médica identificada");
  }

  // +2 si > 3 empresas de reparto
  if (empresas_reparto.length > 3) {
    score += 2;
    desglose_puntos.push("+2 pts: Hub logístico comercial (>3 empresas de reparto/transporte)");
  } else if (empresas_reparto.length >= 1) {
    score += 1;
    desglose_puntos.push("+1 pto: Red logística básica");
  }

  // +2 si > 5 empresas de construcción/industria
  if (empresas_flotilla.length > 5) {
    score += 2;
    desglose_puntos.push("+2 pts: Foco industrial para flotillas (>5 industrias o constructoras)");
  } else if (empresas_flotilla.length >= 2) {
    score += 1;
    desglose_puntos.push("+1 pto: Presencia industrial moderada");
  }

  // NUEVA REGLA: +1 pt si hay más de 3 escuelas privadas en la zona
  const escuelasPrivadas = educacion_profesionistas.filter(p => 
    /colegio|escuela|universidad|instituto/i.test(p.nombre) || /privad|superior|media|bachillerato|colegio/i.test(p.actividad)
  );
  if (escuelasPrivadas.length >= 3 || educacion_profesionistas.length >= 4) {
    score += 1;
    desglose_puntos.push("+1 pto: Clúster educativo relevante (>3 escuelas/colegios privados para autos familiares y ejecutivos)");
  }

  // NUEVA REGLA: +1 pt si hay más de 5 restaurantes con empleados
  if (restaurantes_comercio.length >= 5) {
    score += 1;
    desglose_puntos.push("+1 pto: Zona gastronómica y comercial activa (>5 restaurantes/plazas para reparto y utilitarios)");
  }

  // NUEVA REGLA: +1 pt si hay despachos profesionales registrados
  const hayDespachos = educacion_profesionistas.some(p => 
    /despacho|notar|arquitect|fiscal|juridic|legal|auditor/i.test(p.nombre) || /contabil|bufete|notar|abogad|arquitect/i.test(p.actividad)
  );
  if (hayDespachos || educacion_profesionistas.length >= 5) {
    score += 1;
    desglose_puntos.push("+1 pto: Concentración de profesionistas independientes (despachos, notarías y consultorías)");
  }

  // +2 si < 2 agencias competidoras directas
  if (competencia.length < 2) {
    score += 2;
    desglose_puntos.push("+2 pts: Baja saturación de agencias competidoras (<2 agencias)");
  } else if (competencia.length <= 3) {
    score += 1;
    desglose_puntos.push("+1 pto: Competencia automotriz moderada");
  } else {
    desglose_puntos.push("0 pts: Zona con alta densidad de agencias competidoras");
  }

  // +2 si municipio de alta densidad comercial
  const munNorm = municipio.toLowerCase().trim();
  const isHighDensity = Array.from(MUNICIPIOS_ALTA_DENSIDAD).some(m => munNorm.includes(m));
  if (isHighDensity) {
    score += 2;
    desglose_puntos.push(`+2 pts: Municipio o Alcaldía '${municipio}' con alta densidad comercial e industrial`);
  } else {
    desglose_puntos.push(`0 pts: Municipio '${municipio}' residencial o densidad regular`);
  }

  const scoreFinal = Math.max(1, Math.min(10, score));

  // 5. Interpretación
  let interpretacion = "⚪ ZONA FRÍA - No priorizar en este período";
  if (scoreFinal >= 8) {
    interpretacion = "🔥 ZONA CALIENTE - Prioridad máxima de prospección (Flotillas + Pasajeros)";
  } else if (scoreFinal >= 5) {
    interpretacion = "✅ ZONA BUENA - Vale la pena trabajar sistemáticamente con visitas mixtas";
  } else if (scoreFinal >= 3) {
    interpretacion = "🟡 ZONA MEDIA - Visitar con estrategia de financiamiento y precio";
  }

  return {
    PROSPECTOS_B2B: {
      hospitales,
      empresas_reparto,
      empresas_flotilla,
      educacion_profesionistas,
      restaurantes_comercio,
      gobierno_servicios
    },
    COMPETENCIA: competencia,
    LINKS_UTILES: links_utiles,
    SCORE_OPORTUNIDAD: scoreFinal,
    INTERPRETACION_SCORE: interpretacion,
    DESGLOSE_PUNTOS: desglose_puntos,
    METADATA: {
      estado,
      municipio,
      coordenadas: { lat, lon },
      radio_km: radioKm,
      total_prospectos_encontrados: (
        hospitales.length + empresas_reparto.length + 
        empresas_flotilla.length + educacion_profesionistas.length + 
        restaurantes_comercio.length + gobierno_servicios.length
      ),
      total_competidores: competencia.length,
      cobertura_vehicular: "Comerciales (RAM, Pick-ups) + Pasajeros (Jeep, Peugeot, Dodge, Fiat)",
      origen_datos: fallidas.length
        ? `API Oficial DENUE INEGI (${fallidas.length} de ${terminos.length} búsquedas fallaron)`
        : "API Oficial DENUE INEGI"
    }
  };
}

export interface FilaComparativaIndicador {
  indicador: string;
  zona1: string | number;
  zona2: string | number;
  lider: 'zona1' | 'zona2' | 'empate';
}

export interface ComparativaZonasResult {
  indicadores: FilaComparativaIndicador[];
  zona1: {
    nombre: string;
    score: number;
    recomendacion: string;
  };
  zona2: {
    nombre: string;
    score: number;
    recomendacion: string;
  };
  zonaGanadora: string;
  diagnostico: string;
}

export function compararReportesInteligencia(
  nombreZona1: string,
  rep1: ReporteInteligencia,
  nombreZona2: string,
  rep2: ReporteInteligencia
): ComparativaZonasResult {
  const getRecomendacionEmoji = (score: number) => {
    if (score >= 8) return "🔥 Caliente";
    if (score >= 5) return "⚡ Buena";
    if (score >= 3) return "🟡 Media";
    return "❄️ Fría";
  };

  const getLiderNum = (n1: number, n2: number): 'zona1' | 'zona2' | 'empate' => {
    if (n1 > n2) return 'zona1';
    if (n2 > n1) return 'zona2';
    return 'empate';
  };

  const hosp1 = rep1.PROSPECTOS_B2B.hospitales.length;
  const hosp2 = rep2.PROSPECTOS_B2B.hospitales.length;

  const repL1 = rep1.PROSPECTOS_B2B.empresas_reparto.length;
  const repL2 = rep2.PROSPECTOS_B2B.empresas_reparto.length;

  const flot1 = rep1.PROSPECTOS_B2B.empresas_flotilla.length;
  const flot2 = rep2.PROSPECTOS_B2B.empresas_flotilla.length;

  const comp1 = rep1.COMPETENCIA.length;
  const comp2 = rep2.COMPETENCIA.length;

  const score1 = rep1.SCORE_OPORTUNIDAD;
  const score2 = rep2.SCORE_OPORTUNIDAD;

  const indicadores: FilaComparativaIndicador[] = [
    {
      indicador: "Score total",
      zona1: `${score1}/10`,
      zona2: `${score2}/10`,
      lider: getLiderNum(score1, score2)
    },
    {
      indicador: "Hospitales",
      zona1: hosp1,
      zona2: hosp2,
      lider: getLiderNum(hosp1, hosp2)
    },
    {
      indicador: "Empresas reparto",
      zona1: repL1,
      zona2: repL2,
      lider: getLiderNum(repL1, repL2)
    },
    {
      indicador: "Flotillas",
      zona1: flot1,
      zona2: flot2,
      lider: getLiderNum(flot1, flot2)
    },
    {
      indicador: "Competencia autos",
      zona1: comp1,
      zona2: comp2,
      lider: comp1 < comp2 ? 'zona1' : comp2 < comp1 ? 'zona2' : 'empate' // menos competencia es mejor
    },
    {
      indicador: "Recomendación",
      zona1: getRecomendacionEmoji(score1),
      zona2: getRecomendacionEmoji(score2),
      lider: getLiderNum(score1, score2)
    }
  ];

  const z1Ganadora = score1 >= score2;
  const ganadora = z1Ganadora ? nombreZona1 : nombreZona2;
  const perdedora = z1Ganadora ? nombreZona2 : nombreZona1;
  const diff = Math.abs(score1 - score2);

  const diagnostico = score1 === score2
    ? `Empate técnico con ${score1}/10. Ambas zonas presentan un potencial similar de prospección.`
    : `Se recomienda trabajar prioritariamente en ${ganadora} esta semana (+${diff} pts sobre ${perdedora}). Presenta mayor densidad de oportunidades comerciales.`;

  return {
    indicadores,
    zona1: {
      nombre: nombreZona1,
      score: score1,
      recomendacion: getRecomendacionEmoji(score1)
    },
    zona2: {
      nombre: nombreZona2,
      score: score2,
      recomendacion: getRecomendacionEmoji(score2)
    },
    zonaGanadora: ganadora,
    diagnostico
  };
}
