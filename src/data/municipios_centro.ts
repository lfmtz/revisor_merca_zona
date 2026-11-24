// Centro aproximado (zona urbana) de alcaldías y municipios de la zona metropolitana.
// Se usa para ubicar la cuadrícula del escaneo en el municipio correcto.
export const CENTROS_MUNICIPIO: Record<string, { lat: number; lon: number; radio_km: number }> = {
  // Ciudad de México
  'alvaro obregon': { lat: 19.3590, lon: -99.2030, radio_km: 6 },
  'azcapotzalco': { lat: 19.4870, lon: -99.1840, radio_km: 4 },
  'benito juarez': { lat: 19.3720, lon: -99.1580, radio_km: 3 },
  'coyoacan': { lat: 19.3300, lon: -99.1580, radio_km: 5 },
  'cuajimalpa de morelos': { lat: 19.3570, lon: -99.2990, radio_km: 5 },
  'cuauhtemoc': { lat: 19.4330, lon: -99.1510, radio_km: 3.5 },
  'gustavo a madero': { lat: 19.4930, lon: -99.1110, radio_km: 7 },
  'iztacalco': { lat: 19.3960, lon: -99.0970, radio_km: 3 },
  'iztapalapa': { lat: 19.3570, lon: -99.0580, radio_km: 8 },
  'la magdalena contreras': { lat: 19.3180, lon: -99.2330, radio_km: 4 },
  'miguel hidalgo': { lat: 19.4240, lon: -99.2000, radio_km: 5 },
  'milpa alta': { lat: 19.1920, lon: -99.0230, radio_km: 6 },
  'tlahuac': { lat: 19.2860, lon: -99.0150, radio_km: 5 },
  'tlalpan': { lat: 19.2850, lon: -99.1700, radio_km: 6 },
  'venustiano carranza': { lat: 19.4300, lon: -99.1000, radio_km: 4 },
  'xochimilco': { lat: 19.2570, lon: -99.1030, radio_km: 5 },
  // Estado de México (zona metropolitana)
  'nezahualcoyotl': { lat: 19.4006, lon: -99.0148, radio_km: 5 },
  'ecatepec de morelos': { lat: 19.6010, lon: -99.0500, radio_km: 8 },
  'naucalpan de juarez': { lat: 19.4780, lon: -99.2380, radio_km: 6 },
  'tlalnepantla de baz': { lat: 19.5400, lon: -99.1950, radio_km: 6 },
  'chimalhuacan': { lat: 19.4210, lon: -98.9540, radio_km: 5 },
  'la paz': { lat: 19.3600, lon: -98.9800, radio_km: 4 },
  'ixtapaluca': { lat: 19.3180, lon: -98.8820, radio_km: 6 },
  'valle de chalco solidaridad': { lat: 19.2900, lon: -98.9400, radio_km: 4 },
  'chalco': { lat: 19.2640, lon: -98.8970, radio_km: 5 },
  'chicoloapan': { lat: 19.4160, lon: -98.9020, radio_km: 4 },
  'texcoco': { lat: 19.5130, lon: -98.8820, radio_km: 5 },
  'atenco': { lat: 19.5390, lon: -98.9180, radio_km: 4 },
  'acolman': { lat: 19.6380, lon: -98.9140, radio_km: 4 },
  'tecamac': { lat: 19.7130, lon: -98.9680, radio_km: 7 },
  'coacalco de berriozabal': { lat: 19.6280, lon: -99.1100, radio_km: 4 },
  'tultitlan': { lat: 19.6450, lon: -99.1690, radio_km: 5 },
  'tultepec': { lat: 19.6850, lon: -99.1280, radio_km: 4 },
  'cuautitlan': { lat: 19.6700, lon: -99.1790, radio_km: 3 },
  'cuautitlan izcalli': { lat: 19.6470, lon: -99.2460, radio_km: 6 },
  'atizapan de zaragoza': { lat: 19.5590, lon: -99.2670, radio_km: 5 },
  'nicolas romero': { lat: 19.6220, lon: -99.3130, radio_km: 5 },
  'huixquilucan': { lat: 19.3900, lon: -99.2900, radio_km: 5 },
  'zumpango': { lat: 19.7970, lon: -99.0990, radio_km: 5 },
  'toluca': { lat: 19.2920, lon: -99.6570, radio_km: 7 },
  'metepec': { lat: 19.2510, lon: -99.6040, radio_km: 4 },
};

function normalizar(t: string): string {
  return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function centroMunicipio(municipio: string): { lat: number; lon: number; radio_km: number } | null {
  const m = normalizar(municipio);
  if (!m) return null;
  if (CENTROS_MUNICIPIO[m]) return CENTROS_MUNICIPIO[m];
  // "Ecatepec" → "ecatepec de morelos", "Neza" no (muy corto)
  if (m.length >= 5) {
    const k = Object.keys(CENTROS_MUNICIPIO).find(k => k.startsWith(m) || m.startsWith(k));
    if (k) return CENTROS_MUNICIPIO[k];
  }
  return null;
}
