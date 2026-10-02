import React from 'react';
import { 
  Building2, 
  Layers, 
  Clock, 
  MapPin, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2, 
  PieChart, 
  Smartphone,
  Globe
} from 'lucide-react';
import { ZoneAnalysisResult, ActiveModule } from '../types';
import { ESTADOS_DATA } from '../data/mexico_geo';
import { TerritoryMap } from './TerritoryMap';

interface Module1ZoneAnalysisProps {
  estado: string;
  municipio: string;
  result: ZoneAnalysisResult | null;
  isScanning: boolean;
  baseLocation?: { lat: number; lng: number; nombre: string; radioKm: number };
  gridCells?: { lat: number; lon: number; radio_celda_km: number }[];
  onNavigateToModule: (module: ActiveModule, category?: string) => void;
  onRunScan: () => void;
}

export const Module1ZoneAnalysis: React.FC<Module1ZoneAnalysisProps> = ({
  estado,
  municipio,
  result,
  isScanning,
  baseLocation,
  gridCells,
  onNavigateToModule,
  onRunScan
}) => {
  const stateData = ESTADOS_DATA[estado] || ESTADOS_DATA["Ciudad de México"];
  const centerLat = stateData?.lat || 19.4326;
  const centerLng = stateData?.lng || -99.1332;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#2D2540] border border-[#6B21A8]/60 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#9333EA]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#9333EA]/30 text-[#C084FC] border border-[#9333EA]/60">
                MÓDULO 1
              </span>
              <span className="text-xs text-[#E9D5FF]/70">Análisis Territorial de Mercado</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Potencial de Mercado y Densidad Territorial
            </h2>
            <p className="text-xs md:text-sm text-[#E9D5FF]/80 mt-1 max-w-2xl">
              Escanea una zona geográfica completa en México para dimensionar el mercado total, identificar las categorías dominantes y planificar la expansión comercial.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={onRunScan}
              disabled={isScanning || !estado}
              className="w-full md:w-auto px-5 py-2.5 rounded-lg font-bold text-xs md:text-sm text-white bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#C084FC] shadow-lg border border-[#C084FC]/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Escaneando zona...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Escanear esta Zona</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* CUATRO TARJETAS MÉTRICAS MORADAS GRANDES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="metric-card bg-[#2D2540] border border-[#6B21A8] rounded-xl p-4 text-center shadow-lg transition-transform hover:scale-[1.02]">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#9333EA]/20 flex items-center justify-center text-[#22C55E]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs text-[#E9D5FF]/80 font-medium">Zona Escaneada</div>
              <div className="text-base md:text-lg font-bold text-white mt-1 truncate">
                {result.coverage}
              </div>
              <div className="text-[11px] text-[#22C55E] mt-1 font-semibold">100% Territorio MX</div>
            </div>

            <div className="metric-card bg-[#2D2540] border border-[#6B21A8] rounded-xl p-4 text-center shadow-lg transition-transform hover:scale-[1.02]">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#9333EA]/20 flex items-center justify-center text-[#C084FC]">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-xs text-[#E9D5FF]/80 font-medium">Total Estimado de Negocios</div>
              <div className="text-2xl font-bold text-white mt-1">
                {result.total_negocios.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#E9D5FF]/70 mt-1">Unidades comerciales activas</div>
            </div>

            <div className="metric-card bg-[#2D2540] border border-[#6B21A8] rounded-xl p-4 text-center shadow-lg transition-transform hover:scale-[1.02]">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#9333EA]/20 flex items-center justify-center text-[#C084FC]">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-xs text-[#E9D5FF]/80 font-medium">Categorías Únicas</div>
              <div className="text-2xl font-bold text-white mt-1">
                {result.categorias_unicas}
              </div>
              <div className="text-[11px] text-[#E9D5FF]/70 mt-1">Giros de negocio detectados</div>
            </div>

            <div className="metric-card bg-[#2D2540] border border-[#6B21A8] rounded-xl p-4 text-center shadow-lg transition-transform hover:scale-[1.02]">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#9333EA]/20 flex items-center justify-center text-[#F59E0B]">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-xs text-[#E9D5FF]/80 font-medium">Tiempo de Escaneo</div>
              <div className="text-2xl font-bold text-white mt-1">
                {result.tiempo_escaneo}s
              </div>
              <div className="text-[11px] text-[#22C55E] mt-1">Extracción optimizada</div>
            </div>
          </div>

          {/* DENSITY MAP & TERRITORY RADAR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Visualizer (2 Cols) */}
            <div className="lg:col-span-2 bg-[#2D2540] border border-[#6B21A8]/50 rounded-xl p-4 shadow-lg flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#C084FC]" />
                  <h3 className="text-sm font-bold text-white">Mapa de Densidad y Concentración Comercial</h3>
                </div>
                <span className="text-[11px] bg-[#1E1B2E] text-[#C084FC] px-2.5 py-0.5 rounded-full border border-[#6B21A8]/60">
                  {result.coverage}
                </span>
              </div>
              
              <div className="h-[360px] w-full rounded-lg overflow-hidden">
                <TerritoryMap
                  centerLat={centerLat}
                  centerLng={centerLng}
                  zoom={municipio.trim() ? 12 : 9}
                  densityPoints={result.densidad_puntos}
                  baseLocation={baseLocation}
                  gridCells={gridCells}
                />
              </div>
              <p className="text-[11px] text-[#E9D5FF]/70 mt-2">
                📍 Círculos morados representan conglomerados con mayor densidad de comercios en {result.coverage}.
              </p>
            </div>

            {/* Market Highlights & Top Categories */}
            <div className="bg-[#2D2540] border border-[#6B21A8]/50 rounded-xl p-4 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[#C084FC]" />
                  <h3 className="text-sm font-bold text-white">Top Giros Dominantes</h3>
                </div>

                <div className="space-y-2.5">
                  {result.categorias.slice(0, 6).map((cat) => (
                    <div
                      key={cat.rank}
                      onClick={() => onNavigateToModule('modulo3', cat.categoria)}
                      className="p-2.5 bg-[#1E1B2E] hover:bg-[#6B21A8]/30 rounded-lg border border-[#6B21A8]/40 transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#9333EA]/30 text-[#C084FC] text-[10px] font-bold flex items-center justify-center">
                          #{cat.rank}
                        </span>
                        <span className="text-xs font-semibold text-white group-hover:text-[#C084FC] transition-colors">
                          {cat.categoria}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-white">{cat.cantidad}</span>
                        <span className="text-[10px] text-[#E9D5FF]/60 ml-1">({cat.porcentaje}%)</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional Stats */}
                <div className="mt-4 pt-3 border-t border-[#6B21A8]/30 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-[#1E1B2E]/60 rounded border border-[#6B21A8]/30">
                    <div className="flex items-center gap-1 text-[#22C55E]">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span className="font-bold">{result.resumen_mercado.porcentaje_con_telefono}%</span>
                    </div>
                    <div className="text-[10px] text-[#E9D5FF]/70">Con Teléfono directo</div>
                  </div>

                  <div className="p-2 bg-[#1E1B2E]/60 rounded border border-[#6B21A8]/30">
                    <div className="flex items-center gap-1 text-[#C084FC]">
                      <Globe className="w-3.5 h-3.5" />
                      <span className="font-bold">{result.resumen_mercado.porcentaje_con_web}%</span>
                    </div>
                    <div className="text-[10px] text-[#E9D5FF]/70">Con Sitio Web / Redes</div>
                  </div>
                </div>
              </div>

              {/* View all categories CTA */}
              <button
                onClick={() => onNavigateToModule('modulo2')}
                className="w-full mt-4 py-2 px-3 bg-[#9333EA]/20 hover:bg-[#9333EA]/40 text-xs font-semibold text-[#C084FC] border border-[#9333EA]/50 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Ver todas las {result.categorias.length} categorías en Módulo 2</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* NEXT STEPS CALLOUT BOX */}
          <div className="bg-gradient-to-r from-[#2D2540] via-[#1E1B2E] to-[#2D2540] border border-[#9333EA]/50 rounded-xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="text-sm font-bold text-white flex items-center justify-center md:justify-start gap-2">
                <span>🎯</span>
                <span>¿Qué paso sigue en tu prospección comercial?</span>
              </h4>
              <p className="text-xs text-[#E9D5FF]/80 max-w-xl">
                ¿Quieres ver el desglose por categorías? Ve al Módulo 2. ¿Ya sabes qué categoría te interesa? Ve directo al Módulo 3 para extraer teléfonos, direcciones y rutas.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                onClick={() => onNavigateToModule('modulo2')}
                className="px-4 py-2 bg-[#2D2540] hover:bg-[#6B21A8]/40 text-xs font-bold text-[#E9D5FF] border border-[#6B21A8] rounded-lg transition-colors flex items-center gap-1.5"
              >
                <PieChart className="w-3.5 h-3.5 text-[#C084FC]" />
                <span>Explorar Módulo 2 (Categorías)</span>
              </button>

              <button
                onClick={() => onNavigateToModule('modulo3')}
                className="px-4 py-2 bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#C084FC] text-xs font-bold text-white rounded-lg shadow-lg transition-all flex items-center gap-1.5"
              >
                <span>Extraer Leads (Módulo 3)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
