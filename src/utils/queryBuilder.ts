export interface QueryResult {
  query: string | null;
  url: string | null;
  coverage: string;
  geo_scope: string | null;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Builds Google Maps search query and URL based on geographical scope in Mexico.
 * Municipality is strictly optional.
 */
export function build_search_query(
  business_type: string = "",
  estado: string = "",
  municipio: string = ""
): QueryResult {
  const cleanBusinessType = business_type.trim();
  const cleanEstado = estado.trim();
  const cleanMunicipio = municipio.trim();

  // Validate state selection
  if (!cleanEstado || cleanEstado === "-- Selecciona un estado --") {
    return {
      query: null,
      url: null,
      coverage: "⚠️ Selecciona al menos un estado para continuar",
      geo_scope: null,
      isValid: false,
      errorMessage: "⚠️ Selecciona al menos un estado"
    };
  }

  // Determine geographic scope
  let geo_scope = "";
  let coverage = "";

  if (cleanMunicipio && cleanEstado) {
    geo_scope = `${cleanMunicipio}, ${cleanEstado}`;
    coverage = `📍 ${cleanMunicipio}, ${cleanEstado}`;
  } else if (cleanEstado) {
    geo_scope = cleanEstado;
    coverage = `🗺️ Todo el estado de ${cleanEstado}`;
  }

  // Build query
  const query = cleanBusinessType
    ? `${cleanBusinessType} en ${geo_scope} México`
    : `negocios en ${geo_scope} México`;

  const encodedQuery = query.replace(/\s+/g, '+');
  const url = `https://www.google.com/maps/search/${encodedQuery}`;

  return {
    query,
    url,
    coverage,
    geo_scope,
    isValid: true
  };
}
