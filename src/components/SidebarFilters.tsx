import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Sparkles, 
  Sliders, 
  ChevronDown, 
  ChevronRight, 
  Info, 
  ExternalLink,
  ShieldCheck,
  Code2,
  FileText,
  Target,
  Compass,
  Zap,
  Layers,
  Clock,
  Download
} from 'lucide-react';
import { ESTADOS_MEXICO } from '../data/mexico_geo';
import { build_search_query } from '../utils/queryBuilder';
import { ActiveModule, ScraperSettings, CategorySummary, GridMode, GridEstimation } from '../types';
import { MODOS_CUADRICULA, estimarAntesDeEjecutar, generarApifyQueriesTxt } from '../utils/gridEngine';

interface SidebarFiltersProps {
  businessType: string;
  setBusinessType: (val: string) => void;
  estado: string;
  setEstado: (val: string) => void;
  municipio: string;
  setMunicipio: (val: string) => void;
  // Base de operaciones y radio de acción
  baseEstado: string;
  setBaseEstado: (val: string) => void;
  baseMunicipio: string;
  setBaseMunicipio: (val: string) => void;
  radioKm: number;
  setRadioKm: (val: number) => void;
  gridMode: GridMode;
  setGridMode: (val: GridMode) => void;
  // Modulos
  activeModule: ActiveModule;
  setActiveModule: (mod: ActiveModule) => void;
  settings: ScraperSettings;
  setSettings: React.Dispatch<React.SetStateAction<ScraperSettings>>;
  onExecute: () => void;
  isExecuting: boolean;
  categoriesFound: CategorySummary[];
  onOpenPythonModal: () => void;
  onOpenEthicalModal: () => void;
}

export const SidebarFilters: React.FC<SidebarFiltersProps> = ({
  businessType,
  setBusinessType,
  estado,
  setEstado,
  municipio,
  setMunicipio,
  baseEstado,
  setBaseEstado,
  baseMunicipio,
  setBaseMunicipio,
  radioKm,
  setRadioKm,
  gridMode,
  setGridMode,
  activeModule,
  setActiveModule,
  settings,
  setSettings,
  onExecute,
  isExecuting,
  categoriesFound,
  onOpenPythonModal,
  onOpenEthicalModal
}) => {
  const [showQueryExpander, setShowQueryExpander] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [showBaseExpander, setShowBaseExpander] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const queryInfo = build_search_query(businessType, estado, municipio);

  // Estimación matemática en tiempo real según el radio y el modo
  const estimation: GridEstimation = useMemo(() => {
    return estimarAntesDeEjecutar(radioKm, gridMode);
  }, [radioKm, gridMode]);

  const handleRunClick = () => {
    setValidationError(null);
    if (!estado || estado === "-- Selecciona un estado --") {
      setValidationError("⚠️ Selecciona al menos un estado de la República Mexicana.");
      return;
    }
    if (activeModule === 'modulo3' && !businessType.trim()) {
      setValidationError("⚠️ Escribe el tipo o giro de negocio que quieres buscar en el Módulo 3.");
      return;
    }
    onExecute();
  };

  const handleDownloadApifyQueries = () => {
    const txt = generarApifyQueriesTxt(estado, municipio, categoriesFound, 150, gridMode);
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apify_queries_${estado.toLowerCase().replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="w-full lg:w-80 xl:w-96 bg-[#2D2540] border-r border-[#6B21A8]/40 flex flex-col h-full overflow-y-auto p-4 shrink-0 shadow-2xl">
      {/* Brand Header */}
      <div className="pb-4 border-b border-[#6B21A8]/40 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6B21A8] to-[#9333EA] flex items-center justify-center shadow-lg border border-[#C084FC]/30">
              <span className="text-xl">🇲🇽</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#FFFFFF] tracking-tight flex items-center gap-1.5">
                LeadScrapper <span className="text-[#C084FC]">MX</span>
              </h1>
              <p className="text-xs text-[#E9D5FF]/80">Prospección en Google Maps México</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#9333EA]/30 text-[#C084FC] border border-[#9333EA]/60">
            v2.5 Grid
          </span>
        </div>
      </div>

      <div className="space-y-5 flex-1">
        {/* SECCIÓN 1 — MI BASE DE OPERACIONES Y RADIO */}
        <div className="space-y-3 bg-[#1E1B2E]/60 p-3.5 rounded-xl border border-[#6B21A8]/40">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#9333EA]" />
              <span>⭐ Mi Base y Radio de Operación</span>
            </label>
            <span className="text-[10px] font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded border border-[#22C55E]/30">
              {radioKm} km
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-[11px] font-medium text-[#E9D5FF]/80">📍 Mi Municipio / Colonia Base:</label>
              <input
                type="text"
                value={baseMunicipio}
                onChange={(e) => setBaseMunicipio(e.target.value)}
                placeholder="Ej: Zapopan Centro, Polanco, Centro..."
                className="w-full mt-1 bg-[#1E1B2E] text-[#FFFFFF] placeholder:text-[#E9D5FF]/40 text-xs rounded-lg border border-[#6B21A8] px-2.5 py-1.5 focus:outline-none focus:border-[#C084FC]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-[#E9D5FF]/80">🎯 Radio de visita:</span>
                <span className="font-bold text-[#C084FC]">{radioKm} km a la redonda</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={radioKm}
                onChange={(e) => setRadioKm(parseInt(e.target.value, 10))}
                className="w-full accent-[#9333EA] h-1.5 bg-[#2D2540] rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#E9D5FF]/50 mt-0.5">
                <span>1 km (Local)</span>
                <span>15 km (Medio)</span>
                <span>30 km (Metropolitano)</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2 — ZONA A EXPLORAR */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#C084FC]" />
              <span>🗺️ Zona a Explorar</span>
            </label>
            <span className="text-[10px] text-[#C084FC] bg-[#1E1B2E] px-2 py-0.5 rounded border border-[#6B21A8]">
              32 Estados
            </span>
          </div>

          {/* Campo A — Estado (obligatorio) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#E9D5FF]">🗺️ Estado <span className="text-[#EF4444]">*</span></label>
            <select
              id="estado_select"
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value);
                setValidationError(null);
              }}
              className="w-full bg-[#1E1B2E] text-[#FFFFFF] text-sm rounded-lg border border-[#6B21A8] px-3 py-2 focus:outline-none focus:border-[#C084FC] transition-colors"
            >
              <option value="">-- Selecciona un estado --</option>
              {ESTADOS_MEXICO.map((est) => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </select>
          </div>

          {/* Campo B — Municipio o Alcaldía (OPCIONAL) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#E9D5FF]">
                📍 Municipio o Ciudad <span className="text-[#C084FC] text-[10px]">(opcional)</span>
              </label>
            </div>
            <input
              type="text"
              id="municipio_input"
              value={municipio}
              onChange={(e) => {
                setMunicipio(e.target.value);
                setValidationError(null);
              }}
              placeholder="Ej: Guadalajara, Monterrey, Puebla..."
              className="w-full bg-[#1E1B2E] text-[#FFFFFF] placeholder:text-[#E9D5FF]/40 text-sm rounded-lg border border-[#6B21A8] px-3 py-2 focus:outline-none focus:border-[#C084FC] transition-all"
            />
            <p className="text-[11px] text-[#E9D5FF]/70 leading-tight">
              💡 Si no sabes el municipio exacto, déjalo vacío. La búsqueda se hará en todo el estado.
            </p>
          </div>
        </div>

        {/* SECCIÓN 3 — MODO DE ESCANEO POR CUADRÍCULA */}
        <div className="space-y-2.5 pt-3 border-t border-[#6B21A8]/30">
          <label className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#C084FC]" />
            <span>⚡ Modo de Escaneo (Cuadrículas)</span>
          </label>

          <div className="grid grid-cols-3 gap-1.5">
            {(['express', 'estandar', 'completo'] as GridMode[]).map((mode) => {
              const cfg = MODOS_CUADRICULA[mode];
              const isSelected = gridMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setGridMode(mode)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    isSelected
                      ? 'bg-[#9333EA] border-[#C084FC] text-white shadow-md'
                      : 'bg-[#1E1B2E] border-[#6B21A8]/50 text-[#E9D5FF]/70 hover:border-[#9333EA]'
                  }`}
                >
                  <div className="text-xs font-bold capitalize">{mode}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">{cfg.cobertura}</div>
                </button>
              );
            })}
          </div>

          {/* TARJETA DE ESTIMACIÓN ANTES DE EJECUTAR */}
          <div className="bg-[#1E1B2E] border border-[#9333EA]/40 rounded-xl p-3 space-y-2 text-xs">
            <div className="text-[11px] font-bold text-[#C084FC] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Estimación de Cobertura en {radioKm} km:</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-[#2D2540]/80 p-2 rounded border border-[#6B21A8]/30">
                <div className="text-[#E9D5FF]/70">Zonas de búsqueda:</div>
                <div className="text-sm font-bold text-white mt-0.5">{estimation.num_celdas} celdas</div>
              </div>
              <div className="bg-[#2D2540]/80 p-2 rounded border border-[#6B21A8]/30">
                <div className="text-[#E9D5FF]/70">Negocios esperados:</div>
                <div className="text-sm font-bold text-[#22C55E] mt-0.5">~{estimation.resultados_esperados.toLocaleString()}</div>
              </div>
              <div className="bg-[#2D2540]/80 p-2 rounded border border-[#6B21A8]/30">
                <div className="text-[#E9D5FF]/70">Tiempo estimado:</div>
                <div className="text-xs font-bold text-[#F59E0B] mt-0.5">{estimation.tiempo_estimado_str}</div>
              </div>
              <div className="bg-[#2D2540]/80 p-2 rounded border border-[#6B21A8]/30">
                <div className="text-[#E9D5FF]/70">Cobertura real:</div>
                <div className="text-xs font-bold text-[#C084FC] mt-0.5">{estimation.cobertura}</div>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 4 — TIPO DE NEGOCIO (OPCIONAL O SELECCIONADO) */}
        <div className="space-y-2 pt-3 border-t border-[#6B21A8]/30">
          <label className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#C084FC]" />
            <span>🏪 Giro comercial específico</span>
          </label>

          {categoriesFound.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs text-[#E9D5FF]/75">O selecciona de las categorías encontradas:</label>
              <select
                className="w-full bg-[#1E1B2E] text-[#FFFFFF] text-xs rounded-lg border border-[#6B21A8] px-3 py-2 focus:outline-none focus:border-[#C084FC] transition-colors"
                value={categoriesFound.some(c => c.categoria.toLowerCase() === businessType.toLowerCase()) ? businessType : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setBusinessType(e.target.value);
                  }
                }}
              >
                <option value="">-- Elige una categoría detectada --</option>
                {categoriesFound.map((cat) => (
                  <option key={cat.rank} value={cat.categoria}>
                    {cat.categoria} ({cat.cantidad} negocios - {cat.porcentaje}%)
                  </option>
                ))}
              </select>
            </div>
          )}

          <input
            type="text"
            id="business_type_input"
            value={businessType}
            onChange={(e) => {
              setBusinessType(e.target.value);
              setValidationError(null);
            }}
            placeholder="Ej: Restaurantes, Ferreterías, Dentistas, Hoteles"
            className="w-full bg-[#1E1B2E] text-[#FFFFFF] placeholder:text-[#E9D5FF]/40 text-sm rounded-lg border border-[#6B21A8] px-3 py-2 focus:outline-none focus:border-[#C084FC] transition-all"
          />
        </div>

        {/* SECCIÓN 5 — MÓDULO A EJECUTAR */}
        <div className="space-y-2 pt-3 border-t border-[#6B21A8]/30">
          <label className="text-sm font-semibold text-[#FFFFFF] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C084FC]" />
            <span>🎯 ¿Qué quieres visualizar?</span>
          </label>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveModule('modulo1');
                setValidationError(null);
              }}
              className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-start gap-2 ${
                activeModule === 'modulo1'
                  ? 'bg-[#9333EA]/25 border-[#C084FC] text-white shadow-md'
                  : 'bg-[#1E1B2E] border-[#6B21A8]/60 text-[#E9D5FF] hover:border-[#9333EA]'
              }`}
            >
              <span className="text-sm leading-none mt-0.5">🔍</span>
              <div>
                <div className="font-semibold text-white">Módulo 1 — Radiografía y Densidad</div>
                <div className="text-[10px] text-[#E9D5FF]/70">Potencial de mercado territorial</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModule('modulo2');
                setValidationError(null);
              }}
              className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-start gap-2 ${
                activeModule === 'modulo2'
                  ? 'bg-[#9333EA]/25 border-[#C084FC] text-white shadow-md'
                  : 'bg-[#1E1B2E] border-[#6B21A8]/60 text-[#E9D5FF] hover:border-[#9333EA]'
              }`}
            >
              <span className="text-sm leading-none mt-0.5">📋</span>
              <div>
                <div className="font-semibold text-white">Módulo 2 — Inventario de Categorías</div>
                <div className="text-[10px] text-[#E9D5FF]/70">Clasificación dual (Negocios vs Empresas)</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveModule('modulo3');
                setValidationError(null);
              }}
              className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-start gap-2 ${
                activeModule === 'modulo3'
                  ? 'bg-[#9333EA]/25 border-[#C084FC] text-white shadow-md'
                  : 'bg-[#1E1B2E] border-[#6B21A8]/60 text-[#E9D5FF] hover:border-[#9333EA]'
              }`}
            >
              <span className="text-sm leading-none mt-0.5">🎯</span>
              <div>
                <div className="font-semibold text-white">Módulo 3 — Leads y Rutas de Visita</div>
                <div className="text-[10px] text-[#E9D5FF]/70">Teléfonos, direcciones y navegación</div>
              </div>
            </button>
          </div>
        </div>

        {/* VALIDATION ERROR DISPLAY */}
        {validationError && (
          <div className="p-3 bg-[#EF4444]/20 border border-[#EF4444] rounded-lg text-xs text-[#EF4444] font-medium animate-pulse">
            {validationError}
          </div>
        )}

        {/* BOTÓN PRINCIPAL */}
        <button
          type="button"
          id="main_execute_btn"
          disabled={isExecuting}
          onClick={handleRunClick}
          className={`w-full py-3 px-4 rounded-lg font-bold text-white text-sm shadow-xl flex items-center justify-center gap-2 transition-all ${
            isExecuting
              ? 'bg-[#6B21A8] opacity-75 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#6B21A8] via-[#9333EA] to-[#C084FC] hover:shadow-[#9333EA]/40 hover:scale-[1.01] active:scale-[0.99]'
          }`}
        >
          {isExecuting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>ESCANEANDO CUADRÍCULAS...</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>INICIAR ESCANEO CON CUADRÍCULAS</span>
            </>
          )}
        </button>

        {/* EXPORTADOR DE QUERIES PARA APIFY */}
        {categoriesFound.length > 0 && (
          <button
            type="button"
            onClick={handleDownloadApifyQueries}
            className="w-full py-2 px-3 bg-[#1E1B2E] hover:bg-[#6B21A8]/30 text-xs font-semibold text-[#22C55E] border border-[#22C55E]/40 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Queries para Apify (.txt)</span>
          </button>
        )}

        {/* CONFIGURACIÓN AVANZADA COLAPSABLE */}
        <div className="border border-[#6B21A8]/40 rounded-lg bg-[#1E1B2E]/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
            className="w-full px-3 py-2 text-xs font-semibold text-[#E9D5FF] flex items-center justify-between hover:bg-[#6B21A8]/20 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#C084FC]" />
              ⚙️ Parámetros Playwright Stealth
            </span>
            {showAdvancedConfig ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {showAdvancedConfig && (
            <div className="p-3.5 pt-2 border-t border-[#6B21A8]/30 space-y-3 text-xs text-[#E9D5FF]">
              {/* Delay Slider */}
              <div>
                <div className="flex justify-between mb-1">
                  <span>Delay entre celdas:</span>
                  <span className="font-semibold text-[#C084FC]">{settings.delay_min} - {settings.delay_max} s</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="8"
                  value={settings.delay_min}
                  onChange={(e) => {
                    const min = parseInt(e.target.value, 10);
                    setSettings(prev => ({ ...prev, delay_min: min, delay_max: min + 2 }));
                  }}
                  className="w-full accent-[#9333EA] h-1.5 bg-[#2D2540] rounded-lg cursor-pointer"
                />
              </div>

              {/* Stealth Mode */}
              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                  Modo stealth:
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40">
                  ON (Siempre activo)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* QUICK CODE EXPORT & LEGAL LINKS */}
        <div className="pt-2 border-t border-[#6B21A8]/30 space-y-2">
          <button
            type="button"
            onClick={onOpenPythonModal}
            className="w-full py-2 px-3 bg-[#1E1B2E] hover:bg-[#6B21A8]/30 text-xs font-semibold text-[#C084FC] border border-[#6B21A8]/60 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Código Python Streamlit (Grid Engine)</span>
          </button>

          <button
            type="button"
            onClick={onOpenEthicalModal}
            className="w-full py-1.5 px-3 text-[11px] text-[#E9D5FF]/80 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <FileText className="w-3 h-3 text-[#22C55E]" />
            <span>Nota Ética y Legal LFPDPPP México</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

