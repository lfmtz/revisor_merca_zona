import { ESTADOS_MEXICO, ESTADOS_DATA } from '../data/mexico_geo';

export interface GeoValidationResult {
  isValidMexico: boolean;
  estado_detectado: string;
  municipio_detectado: string;
  codigo_postal: string;
  reason?: string;
}

const ABREVIATURAS_MAP: Record<string, string> = {
  "CDMX": "Ciudad de México",
  "C.D.M.X.": "Ciudad de México",
  "DF": "Ciudad de México",
  "D.F.": "Ciudad de México",
  "EDOMEX": "México",
  "EDO. MEX.": "México",
  "EDO MEX": "México",
  "ESTADO DE MÉXICO": "México",
  "ESTADO DE MEXICO": "México",
  "NL": "Nuevo León",
  "N.L.": "Nuevo León",
  "BC": "Baja California",
  "B.C.": "Baja California",
  "BCS": "Baja California Sur",
  "B.C.S.": "Baja California Sur",
  "QROO": "Quintana Roo",
  "Q. ROO": "Quintana Roo",
  "SLP": "San Luis Potosí",
  "S.L.P.": "San Luis Potosí",
  "AGS": "Aguascalientes",
  "CHIS": "Chiapas",
  "CHIH": "Chihuahua",
  "COAH": "Coahuila",
  "COL": "Colima",
  "DGO": "Durango",
  "GTO": "Guanajuato",
  "GRO": "Guerrero",
  "HGO": "Hidalgo",
  "JAL": "Jalisco",
  "MICH": "Michoacán",
  "MOR": "Morelos",
  "NAY": "Nayarit",
  "OAX": "Oaxaca",
  "PUE": "Puebla",
  "QRO": "Querétaro",
  "SIN": "Sinaloa",
  "SON": "Sonora",
  "TAB": "Tabasco",
  "TAMPS": "Tamaulipas",
  "TLAX": "Tlaxcala",
  "VER": "Veracruz",
  "YUC": "Yucatán",
  "ZAC": "Zacatecas"
};

/**
 * Validates whether an address string is within Mexico and extracts state/municipality.
 */
export function validateAndExtractMexicoGeo(
  address: string,
  fallbackEstado: string = "",
  fallbackMunicipio: string = ""
): GeoValidationResult {
  if (!address || address === "N/A") {
    return {
      isValidMexico: true,
      estado_detectado: fallbackEstado || "México",
      municipio_detectado: fallbackMunicipio || "Zona Metropolitana",
      codigo_postal: "N/A"
    };
  }

  const upperAddress = address.toUpperCase();

  // Extract Postal Code (5-digit Mexican CP between 01000 and 99999)
  const cpMatch = address.match(/\b(0[1-9]\d{3}|[1-9]\d{4})\b/);
  const cp = cpMatch ? cpMatch[1] : "N/A";

  // Check Mexico indicators
  let isValidMexico = false;
  let detectedEstado = "";
  let detectedMunicipio = "";

  // 1. Direct keywords
  if (
    upperAddress.includes("MÉXICO") ||
    upperAddress.includes("MEXICO") ||
    upperAddress.includes("MEX.") ||
    upperAddress.includes("CDMX") ||
    upperAddress.includes("C.P.") ||
    cp !== "N/A"
  ) {
    isValidMexico = true;
  }

  // 2. Check each state
  for (const estado of ESTADOS_MEXICO) {
    const estadoUpper = estado.toUpperCase();
    if (upperAddress.includes(estadoUpper)) {
      isValidMexico = true;
      detectedEstado = estado;
      break;
    }
  }

  // 3. Check abbreviations if not detected
  if (!detectedEstado) {
    for (const [abbr, fullEstado] of Object.entries(ABREVIATURAS_MAP)) {
      const regex = new RegExp(`\\b${abbr.replace('.', '\\.')}\\b`, 'i');
      if (regex.test(upperAddress)) {
        isValidMexico = true;
        detectedEstado = fullEstado;
        break;
      }
    }
  }

  if (!detectedEstado && fallbackEstado) {
    detectedEstado = fallbackEstado;
  }

  // 4. Try detecting municipality from state data
  const targetState = detectedEstado || fallbackEstado;
  if (targetState && ESTADOS_DATA[targetState]) {
    const municipios = ESTADOS_DATA[targetState].municipios;
    for (const mun of municipios) {
      if (upperAddress.includes(mun.toUpperCase())) {
        detectedMunicipio = mun;
        break;
      }
    }
  }

  if (!detectedMunicipio && fallbackMunicipio) {
    detectedMunicipio = fallbackMunicipio;
  }

  if (!detectedMunicipio) {
    // Extract comma segment heuristic
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      detectedMunicipio = parts[parts.length - 2] || parts[0];
    } else {
      detectedMunicipio = targetState || "Cabecera / Centro";
    }
  }

  return {
    isValidMexico,
    estado_detectado: detectedEstado || fallbackEstado || "México",
    municipio_detectado: detectedMunicipio || fallbackMunicipio || "Centro",
    codigo_postal: cp
  };
}
