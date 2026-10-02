import { GridMode, GridModeConfig, GridEstimation, GridCell, CategorySummary, EntityType } from '../types';
import { ESTADOS_MEXICO, ESTADOS_DATA } from '../data/mexico_geo';

export const MODOS_CUADRICULA: Record<GridMode, GridModeConfig> = {
  express: {
    modo: 'express',
    paso_km: 3.0,
    radio_celda_km: 2.5,
    descripcion: 'Express — 5 a 15 min',
    cobertura: '~40% del total real',
    cobertura_pct: 40,
    factor_estimacion: 10,
    uso: 'Vista rápida de categorías'
  },
  estandar: {
    modo: 'estandar',
    paso_km: 1.5,
    radio_celda_km: 1.2,
    descripcion: 'Estándar — 20 a 45 min',
    cobertura: '~70% del total real',
    cobertura_pct: 70,
    factor_estimacion: 3,
    uso: 'Análisis de mercado confiable'
  },
  completo: {
    modo: 'completo',
    paso_km: 0.8,
    radio_celda_km: 0.7,
    descripcion: 'Completo — 1 a 3 horas',
    cobertura: '~90% del total real',
    cobertura_pct: 90,
    factor_estimacion: 1.2,
    uso: 'Base de datos definitiva de la zona'
  }
};

export const ESTADOS_GEO: Record<string, { lat: number; lon: number; radio_km: number }> = {
  "Aguascalientes":      { lat: 21.8853, lon: -102.2916, radio_km: 50 },
  "Baja California":     { lat: 30.8406, lon: -115.2838, radio_km: 220 },
  "Baja California Sur": { lat: 26.0444, lon: -111.6661, radio_km: 280 },
  "Campeche":            { lat: 19.8301, lon: -90.5349,  radio_km: 140 },
  "Chiapas":             { lat: 16.7569, lon: -93.1292,  radio_km: 180 },
  "Chihuahua":           { lat: 28.6333, lon: -106.0691, radio_km: 320 },
  "Ciudad de México":    { lat: 19.4326, lon: -99.1332,  radio_km: 25 },
  "Coahuila":            { lat: 27.0587, lon: -101.7068, radio_km: 280 },
  "Colima":              { lat: 19.2452, lon: -103.7241, radio_km: 35 },
  "Durango":             { lat: 24.0277, lon: -104.6532, radio_km: 230 },
  "Guanajuato":          { lat: 21.0190, lon: -101.2574, radio_km: 90 },
  "Guerrero":            { lat: 17.4392, lon: -100.2200, radio_km: 190 },
  "Hidalgo":             { lat: 20.0911, lon: -98.7624,  radio_km: 75 },
  "Jalisco":             { lat: 20.6595, lon: -103.3494, radio_km: 190 },
  "México":              { lat: 19.2952, lon: -99.6569,  radio_km: 110 },
  "Michoacán":           { lat: 19.5665, lon: -101.7068, radio_km: 170 },
  "Morelos":             { lat: 18.6813, lon: -99.1013,  radio_km: 45 },
  "Nayarit":             { lat: 21.7514, lon: -104.8455, radio_km: 110 },
  "Nuevo León":          { lat: 25.5922, lon: -99.9962,  radio_km: 180 },
  "Oaxaca":              { lat: 17.0732, lon: -96.7266,  radio_km: 190 },
  "Puebla":              { lat: 18.8938, lon: -98.2035,  radio_km: 110 },
  "Querétaro":           { lat: 20.5888, lon: -100.3899, radio_km: 75 },
  "Quintana Roo":        { lat: 19.1817, lon: -88.4791,  radio_km: 190 },
  "San Luis Potosí":     { lat: 22.1565, lon: -100.9855, radio_km: 190 },
  "Sinaloa":             { lat: 25.1721, lon: -107.4795, radio_km: 230 },
  "Sonora":              { lat: 29.2972, lon: -110.3309,  radio_km: 290 },
  "Tabasco":             { lat: 17.8409, lon: -92.6189,  radio_km: 110 },
  "Tamaulipas":          { lat: 24.2669, lon: -98.8363,  radio_km: 240 },
  "Tlaxcala":            { lat: 19.3182, lon: -98.2375,  radio_km: 35 },
  "Veracruz":            { lat: 19.1738, lon: -96.1342,  radio_km: 290 },
  "Yucatán":             { lat: 20.7099, lon: -89.0943,  radio_km: 190 },
  "Zacatecas":           { lat: 22.7709, lon: -102.5832, radio_km: 170 }
};

export function estimarRadioMunicipio(municipio: string): number {
  const grandes: Record<string, number> = {
    "iztapalapa": 12, "gustavo a madero": 10,
    "tlalpan": 15, "xochimilco": 12,
    "ecatepec": 15, "nezahualcoyotl": 8,
    "guadalajara": 20, "monterrey": 18,
    "puebla": 18, "tijuana": 20,
    "leon": 18, "juarez": 20,
    "zapopan": 18, "naucalpan": 10,
    "toluca": 15, "merida": 18,
    "cancun": 15, "aguascalientes": 15,
    "hermosillo": 18, "mexicali": 20,
    "culiacan": 18, "acapulco": 15,
    "tlaquepaque": 10, "tonala": 8,
    "cuauhtemoc": 8, "benito juarez": 8, "miguel hidalgo": 10
  };
  const mLower = municipio.toLowerCase().trim();
  for (const [key, radio] of Object.entries(grandes)) {
    if (mLower.includes(key)) {
      return radio;
    }
  }
  return 8;
}

export function geocodificarZona(estado: string, municipio: string = ''): { lat: number; lon: number; radio_km: number } {
  const estadoData = ESTADOS_DATA[estado];
  const estadoGeo = ESTADOS_GEO[estado] || { lat: 19.4326, lon: -99.1332, radio_km: 50 };

  if (municipio && municipio.trim()) {
    const radio_mun = estimarRadioMunicipio(municipio);
    // Coordenadas con ligeros offsets naturales si es municipio conocido
    if (estadoData && estadoData.lat && estadoData.lng) {
      return {
        lat: estadoData.lat,
        lon: estadoData.lng,
        radio_km: radio_mun
      };
    }
    return {
      lat: estadoGeo.lat,
      lon: estadoGeo.lon,
      radio_km: radio_mun
    };
  }

  return {
    lat: estadoGeo.lat,
    lon: estadoGeo.lon,
    radio_km: estadoGeo.radio_km
  };
}

function radioAZoom(radio_km: number): number {
  if (radio_km <= 0.3) return 17;
  if (radio_km <= 0.7) return 16;
  if (radio_km <= 1.2) return 15;
  if (radio_km <= 2.5) return 14;
  if (radio_km <= 5.0) return 13;
  if (radio_km <= 10) return 12;
  return 11;
}

// Distancia Haversine en KM
function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function generarCuadricula(
  latCenter: number,
  lonCenter: number,
  radioKm: number,
  modo: GridMode = 'estandar'
): GridCell[] {
  const config = MODOS_CUADRICULA[modo];
  const pasoKm = config.paso_km;
  const radioCelda = config.radio_celda_km;

  const kmLat = 111.0;
  const kmLon = 111.0 * Math.cos(latCenter * (Math.PI / 180));

  const pasoLat = pasoKm / kmLat;
  const pasoLon = pasoKm / kmLon;
  const radioLat = radioKm / kmLat;
  const radioLon = radioKm / kmLon;

  const celdas: GridCell[] = [];
  let lat = latCenter - radioLat;

  while (lat <= latCenter + radioLat + 0.0001) {
    let lon = lonCenter - radioLon;
    while (lon <= lonCenter + radioLon + 0.0001) {
      const dist = distanciaKm(latCenter, lonCenter, lat, lon);
      if (dist <= radioKm) {
        celdas.push({
          lat: Number(lat.toFixed(6)),
          lon: Number(lon.toFixed(6)),
          zoom: radioAZoom(radioCelda),
          radio_celda_km: radioCelda,
          dist_al_centro_km: Number(dist.toFixed(2))
        });
      }
      lon += pasoLon;
    }
    lat += pasoLat;
  }

  // Garantizar al menos 1 celda central si el radio es muy pequeño
  if (celdas.length === 0) {
    celdas.push({
      lat: Number(latCenter.toFixed(6)),
      lon: Number(lonCenter.toFixed(6)),
      zoom: radioAZoom(radioCelda),
      radio_celda_km: radioCelda,
      dist_al_centro_km: 0
    });
  }

  return celdas;
}

export function estimarAntesDeEjecutar(
  radioKm: number,
  modo: GridMode = 'estandar'
): GridEstimation {
  const celdas = generarCuadricula(19.4326, -99.1332, radioKm, modo);
  const numCeldas = celdas.length;
  const config = MODOS_CUADRICULA[modo];
  const segPorCelda = 8; // Promedio conservador

  const tiempoMin = (numCeldas * segPorCelda) / 60;
  const maxResultados = numCeldas * 120;
  const resultadosEsperados = Math.round(maxResultados * 0.6);

  let tiempoStr = `~${Math.max(1, Math.round(tiempoMin))} minutos`;
  if (tiempoMin >= 60) {
    tiempoStr = `~${(tiempoMin / 60).toFixed(1)} horas`;
  }

  return {
    modo,
    descripcion: config.descripcion,
    cobertura: config.cobertura,
    cobertura_pct: config.cobertura_pct,
    num_celdas: numCeldas,
    max_teorico: maxResultados,
    resultados_esperados: resultadosEsperados,
    tiempo_estimado_min: Math.round(tiempoMin),
    tiempo_estimado_str: tiempoStr
  };
}

export function generarApifyQueriesTxt(
  estado: string,
  municipio: string,
  categorias: CategorySummary[],
  totalGeneral: number,
  modo: GridMode = 'estandar'
): string {
  const ubicacion = municipio.trim() ? `${municipio.trim()} ${estado}` : estado;
  const factor = MODOS_CUADRICULA[modo]?.factor_estimacion || 3;

  const header = [
    'QUERIES PARA APIFY GOOGLE MAPS SCRAPER',
    `Zona: ${ubicacion}, México`,
    `Total encontrado en muestra: ${totalGeneral.toLocaleString()} negocios`,
    `Categorías detectadas: ${categorias.length}`,
    '='.repeat(50),
    '',
    'URL de Apify:',
    'https://apify.com/compass/crawler-google-places',
    '',
    'INSTRUCCIONES:',
    '1. Abre el link de Apify de arriba',
    "2. En 'Search terms' pega el query de la categoría",
    "3. Configura 'Max items' según necesites",
    '   Costo: $4 USD por cada 1,000 resultados',
    '='.repeat(50),
    '',
    'QUERIES ORDENADOS POR CANTIDAD (mayor a menor):',
    ''
  ];

  const itemsLines = categorias.map((cat, i) => {
    const est = Math.round(cat.cantidad * factor);
    const costo = (est / 1000) * 4;
    return [
      `#${i + 1} ${cat.categoria}`,
      `   En muestra: ${cat.cantidad}`,
      `   Estimado real: ~${est.toLocaleString()}`,
      `   Costo Apify: ~$${costo.toFixed(1)} USD`,
      `   Query: ${cat.categoria} en ${ubicacion} México`,
      ''
    ].join('\n');
  });

  return header.join('\n') + itemsLines.join('\n');
}
