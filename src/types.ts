export type EntityType = 'negocio' | 'empresa';
export type GridMode = 'express' | 'estandar' | 'completo';

export interface OperationBase {
  estado: string;
  municipio: string;
  radio_op_km: number;
}

export interface GridModeConfig {
  modo: GridMode;
  paso_km: number;
  radio_celda_km: number;
  descripcion: string;
  cobertura: string;
  cobertura_pct: number;
  factor_estimacion: number;
  uso: string;
}

export interface GridEstimation {
  modo: GridMode;
  descripcion: string;
  cobertura: string;
  cobertura_pct: number;
  num_celdas: number;
  max_teorico: number;
  resultados_esperados: number;
  tiempo_estimado_min: number;
  tiempo_estimado_str: string;
}

export interface GridCell {
  lat: number;
  lon: number;
  zoom: number;
  radio_celda_km: number;
  dist_al_centro_km: number;
}

export interface Lead {
  id: string;
  nombre_negocio: string;
  categoria: string;
  tipo_entidad?: EntityType;
  direccion_completa: string;
  municipio_detectado: string;
  estado_detectado: string;
  telefono: string;
  url_google_maps: string;
  sitio_web: string;
  calificacion: number;
  num_resenas: number;
  horario: string;
  estado_apertura: 'Abierto ahora' | 'Cerrado' | 'N/A';
  link_navegacion: string;
  fecha_extraccion: string;
  cobertura_busqueda: string;
  lat?: number;
  lng?: number;
}

export interface CategorySummary {
  rank: number;
  categoria: string;
  tipo_entidad: EntityType;
  cantidad: number;
  porcentaje: number;
  estimado_real?: number;
  costo_apify_usd?: number;
}

export interface GridScanProgress {
  celda_actual: number;
  total_celdas: number;
  porcentaje: number;
  total_encontrados: number;
  nuevos_en_celda: number;
  categorias_detectadas: number;
  mensaje: string;
  tipo: 'inicio' | 'progreso' | 'pausa' | 'pausa_auto' | 'advertencia' | 'completado';
}

export interface ZoneAnalysisResult {
  coverage: string;
  modo_escaneo: GridMode;
  total_negocios: number;
  celdas_procesadas: number;
  celdas_totales: number;
  cobertura_pct: number;
  categorias_unicas: number;
  tiempo_escaneo: number;
  query_usada: string;
  url_maps: string;
  categorias: CategorySummary[];
  densidad_puntos: {
    lat: number;
    lng: number;
    nombre: string;
    categoria: string;
    calificacion: number;
    tipo_entidad?: EntityType;
  }[];
  resumen_mercado: {
    categoria_dominante: string;
    promedio_calificacion: number;
    porcentaje_con_telefono: number;
    porcentaje_con_web: number;
    total_empresas?: number;
    total_negocios_locales?: number;
  };
}

export interface ScraperSettings {
  delay_min: number;
  delay_max: number;
  batch_size: number;
  stealth_mode: boolean;
  max_results: number;
  user_agent_rotativo: boolean;
  filtro_entidad?: 'todos' | 'negocios' | 'empresas';
}

export type StepNumber = 1 | 2 | 3 | 4;
export type ActiveModule = 'modulo1' | 'modulo2' | 'modulo3';

export interface ExtractionLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'stealth';
}

export interface ProspectoB2B {
  nombre: string;
  actividad: string;
  telefono: string;
  web: string;
  direccion: string;
  distancia_km: number;
  enfoque_vehiculo?: string;
  coordenadas?: { lat: number; lon: number };
  link_gps?: string;
}

export interface CompetidorAgencia {
  nombre: string;
  marca_estimada: string;
  distancia_km: number;
  link_maps: string;
  coordenadas?: { lat: number; lon: number };
  link_gps?: string;
}

export interface LinksUtilesIntel {
  denue_hospitales: string;
  denue_transporte: string;
  denue_educacion?: string;
  denue_restaurantes?: string;
  denue_gobierno?: string;
  inegi_nse: string;
  google_maps_competencia: string;
}

export interface ReporteInteligencia {
  PROSPECTOS_B2B: {
    hospitales: ProspectoB2B[];
    empresas_reparto: ProspectoB2B[];
    empresas_flotilla: ProspectoB2B[];
    educacion_profesionistas: ProspectoB2B[];
    restaurantes_comercio: ProspectoB2B[];
    gobierno_servicios: ProspectoB2B[];
  };
  COMPETENCIA: CompetidorAgencia[];
  LINKS_UTILES: LinksUtilesIntel;
  SCORE_OPORTUNIDAD: number;
  INTERPRETACION_SCORE: string;
  DESGLOSE_PUNTOS?: string[];
  METADATA?: {
    estado: string;
    municipio: string;
    coordenadas: { lat: number; lon: number };
    radio_km: number;
    total_prospectos_encontrados: number;
    total_competidores: number;
    cobertura_vehicular?: string;
    origen_datos: string;
  };
}

