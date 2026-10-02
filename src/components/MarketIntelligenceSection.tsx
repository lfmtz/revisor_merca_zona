import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Truck, 
  HardHat, 
  Car, 
  ExternalLink, 
  Flame, 
  CheckCircle, 
  AlertTriangle, 
  Key, 
  MapPin, 
  Phone, 
  Globe, 
  RefreshCw, 
  Sparkles, 
  Compass, 
  Share2, 
  Download, 
  Check, 
  Info,
  GraduationCap,
  Utensils,
  Landmark,
  ShieldCheck,
  BarChart3,
  Sliders,
  Scale,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { ReporteInteligencia, ProspectoB2B, CompetidorAgencia } from '../types';
import { 
  generarReporteInteligencia, 
  obtenerTokenDenue, 
  guardarTokenDenue,
  compararReportesInteligencia,
  ComparativaZonasResult
} from '../services/intelService';
import { geocodificarZona } from '../utils/gridEngine';
import { ESTADOS_MEXICO } from '../data/mexico_geo';

interface MarketIntelligenceSectionProps {
  estado: string;
  municipio: string;
  lat: number;
  lon: number;
}

export const MarketIntelligenceSection: React.FC<MarketIntelligenceSectionProps> = ({
  estado,
  municipio,
  lat,
  lon,
}) => {
  const [token, setToken] = useState<string>(() => obtenerTokenDenue() || '');
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);
  const [reporte, setReporte] = useState<ReporteInteligencia | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [radioKm, setRadioKm] = useState<number>(10); // Default 10 km
  const [activeTab, setActiveTab] = useState<'hospitales' | 'reparto' | 'flotillas' | 'educacion' | 'restaurantes' | 'gobierno' | 'competencia'>('hospitales');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [savedTokenMsg, setSavedTokenMsg] = useState<boolean>(false);

  // Estados para MEJORA 3: Comparativa de Zonas
  const [showComparador, setShowComparador] = useState<boolean>(false);
  const [segundoMunicipio, setSegundoMunicipio] = useState<string>(() => {
    const munLower = (municipio || '').toLowerCase();
    if (munLower.includes('iztacalco')) return 'Iztapalapa';
    if (munLower.includes('iztapalapa')) return 'Iztacalco';
    if (munLower.includes('zapopan')) return 'Guadalajara';
    if (munLower.includes('guadalajara')) return 'Zapopan';
    if (munLower.includes('monterrey')) return 'San Pedro Garza García';
    return 'Iztapalapa';
  });
  const [segundoEstado, setSegundoEstado] = useState<string>(estado || 'Ciudad de México');
  const [reporteComparado, setReporteComparado] = useState<ReporteInteligencia | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparativa, setComparativa] = useState<ComparativaZonasResult | null>(null);

  // Load report whenever estado, municipio, lat, lon, radioKm or token change
  const cargarReporte = async () => {
    setIsLoading(true);
    try {
      const rep = await generarReporteInteligencia(estado, municipio, lat, lon, token, radioKm);
      setReporte(rep);
    } catch (e) {
      console.error("Error al generar reporte de inteligencia:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarReporte();
  }, [estado, municipio, lat, lon, radioKm]);

  // Manejo de la comparación entre dos zonas
  const ejecutarComparacion = async () => {
    if (!reporte) return;
    setIsComparing(true);
    try {
      const geo2 = geocodificarZona(segundoEstado, segundoMunicipio);
      const rep2 = await generarReporteInteligencia(
        segundoEstado,
        segundoMunicipio,
        geo2.lat,
        geo2.lon,
        token,
        radioKm
      );
      setReporteComparado(rep2);
      const nombreZona1 = municipio ? `${municipio}` : estado;
      const nombreZona2 = segundoMunicipio ? `${segundoMunicipio}` : segundoEstado;
      const comp = compararReportesInteligencia(nombreZona1, reporte, nombreZona2, rep2);
      setComparativa(comp);
    } catch (err) {
      console.error("Error al comparar zonas:", err);
    } finally {
      setIsComparing(false);
    }
  };

  // Recalcular comparativa si ya estaba abierta y cambia el reporte principal
  useEffect(() => {
    if (showComparador && reporte && reporteComparado) {
      const nombreZona1 = municipio ? `${municipio}` : estado;
      const nombreZona2 = segundoMunicipio ? `${segundoMunicipio}` : segundoEstado;
      const comp = compararReportesInteligencia(nombreZona1, reporte, nombreZona2, reporteComparado);
      setComparativa(comp);
    }
  }, [reporte]);

  const handleSaveToken = () => {
    guardarTokenDenue(token);
    setSavedTokenMsg(true);
    setTimeout(() => setSavedTokenMsg(false), 2500);
    cargarReporte();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(id);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 8) {
      return {
        bg: 'from-amber-500/20 via-rose-500/20 to-purple-500/20 border-rose-500/50 text-rose-300',
        icon: <Flame className="w-5 h-5 text-amber-400 animate-pulse" />,
        label: 'ZONA CALIENTE — Prioridad Máxima'
      };
    }
    if (score >= 5) {
      return {
        bg: 'from-emerald-500/20 via-purple-500/20 to-blue-500/20 border-emerald-500/50 text-emerald-300',
        icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
        label: 'ZONA BUENA — Prospección Sistemática'
      };
    }
    if (score >= 3) {
      return {
        bg: 'from-amber-500/20 to-purple-500/20 border-amber-500/50 text-amber-300',
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        label: 'ZONA MEDIA — Estrategia de Precio'
      };
    }
    return {
      bg: 'from-purple-900/30 to-gray-900/40 border-purple-800 text-purple-300',
      icon: <Info className="w-5 h-5 text-purple-400" />,
      label: 'ZONA FRÍA — No Priorizar'
    };
  };

  const descargarReporteTxt = () => {
    if (!reporte) return;
    const lineas = [
      `========================================================================`,
      `🗺️ REPORTE DE INTELIGENCIA DE MERCADO TERRITORIAL & DENUE INEGI`,
      `LeadScrapper MX — Inteligencia Comercial para México`,
      `========================================================================`,
      `Zona analizada: ${municipio ? `${municipio}, ` : ''}${estado}`,
      `Coordenadas: Lat ${lat}, Lon ${lon}`,
      `Radio de análisis: ${radioKm}.0 km`,
      `Score de Oportunidad Territorial: ${reporte.SCORE_OPORTUNIDAD}/10`,
      `Diagnóstico: ${reporte.INTERPRETACION_SCORE}`,
      `Fecha de consulta: ${new Date().toLocaleString('es-MX')}`,
      `------------------------------------------------------------------------`,
      `DESGLOSE DE PUNTOS:`,
      ...(reporte.DESGLOSE_PUNTOS || []).map(p => `• ${p}`),
      ``,
      `------------------------------------------------------------------------`,
      `1. PROSPECTOS B2B - HOSPITALES Y CLÍNICAS (${reporte.PROSPECTOS_B2B.hospitales.length}):`,
      ...reporte.PROSPECTOS_B2B.hospitales.map((h, i) => 
        `${i + 1}. ${h.nombre} | Tel: ${h.telefono} | Dist: ${h.distancia_km}km | Dir: ${h.direccion}`
      ),
      ``,
      `------------------------------------------------------------------------`,
      `2. PROSPECTOS B2B - EMPRESAS DE REPARTO Y LOGÍSTICA (${reporte.PROSPECTOS_B2B.empresas_reparto.length}):`,
      ...reporte.PROSPECTOS_B2B.empresas_reparto.map((r, i) => 
        `${i + 1}. ${r.nombre} | Tel: ${r.telefono} | Dist: ${r.distancia_km}km | Dir: ${r.direccion}`
      ),
      ``,
      `------------------------------------------------------------------------`,
      `3. PROSPECTOS B2B - EMPRESAS DE FLOTILLA / CONSTRUCCIÓN (${reporte.PROSPECTOS_B2B.empresas_flotilla.length}):`,
      ...reporte.PROSPECTOS_B2B.empresas_flotilla.map((f, i) => 
        `${i + 1}. ${f.nombre} | Tel: ${f.telefono} | Dist: ${f.distancia_km}km | Dir: ${f.direccion}`
      ),
      ``,
      `------------------------------------------------------------------------`,
      `4. PROSPECTOS B2B - EDUCACIÓN Y PROFESIONISTAS (${reporte.PROSPECTOS_B2B.educacion_profesionistas.length}):`,
      ...reporte.PROSPECTOS_B2B.educacion_profesionistas.map((e, i) => 
        `${i + 1}. ${e.nombre} | Tel: ${e.telefono} | Dist: ${e.distancia_km}km | Dir: ${e.direccion}`
      ),
      ``,
      `------------------------------------------------------------------------`,
      `5. PROSPECTOS B2B - RESTAURANTES Y COMERCIO (${reporte.PROSPECTOS_B2B.restaurantes_comercio.length}):`,
      ...reporte.PROSPECTOS_B2B.restaurantes_comercio.map((r, i) => 
        `${i + 1}. ${r.nombre} | Tel: ${r.telefono} | Dist: ${r.distancia_km}km | Dir: ${r.direccion}`
      ),
      ``,
      `------------------------------------------------------------------------`,
      `6. PROSPECTOS B2B - GOBIERNO Y SERVICIOS (${reporte.PROSPECTOS_B2B.gobierno_servicios.length}):`,
      ...reporte.PROSPECTOS_B2B.gobierno_servicios.map((g, i) => 
        `${i + 1}. ${g.nombre} | Tel: ${g.telefono} | Dist: ${g.distancia_km}km | Dir: ${g.direccion}`
      ),
      ``,
      `------------------------------------------------------------------------`,
      `7. COMPETENCIA - AGENCIAS AUTOMOTRICES CERCANAS (${reporte.COMPETENCIA.length}):`,
      ...reporte.COMPETENCIA.map((c, i) => 
        `${i + 1}. ${c.nombre} (Marca: ${c.marca_estimada}) | Dist: ${c.distancia_km}km`
      ),
      ``,
      `------------------------------------------------------------------------`,
      `ENLACES DIRECTOS OFICIALES:`,
      `• DENUE Hospitales: ${reporte.LINKS_UTILES.denue_hospitales}`,
      `• DENUE Transporte: ${reporte.LINKS_UTILES.denue_transporte}`,
      `• DENUE Educación: ${reporte.LINKS_UTILES.denue_educacion || 'https://www.inegi.org.mx/app/mapa/denue/default.aspx?q=escuela'}`,
      `• DENUE Restaurantes: ${reporte.LINKS_UTILES.denue_restaurantes || 'https://www.inegi.org.mx/app/mapa/denue/default.aspx?q=restaurante'}`,
      `• DENUE Gobierno: ${reporte.LINKS_UTILES.denue_gobierno || 'https://www.inegi.org.mx/app/mapa/denue/default.aspx?q=alcaldia'}`,
      `• INEGI Nivel Socioeconómico (NSE): ${reporte.LINKS_UTILES.inegi_nse}`,
      `• Google Maps Competencia: ${reporte.LINKS_UTILES.google_maps_competencia}`,
      `========================================================================`
    ];

    const blob = new Blob([lineas.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_inteligencia_${estado}_${municipio || 'zona'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const badgeInfo = reporte ? getScoreBadge(reporte.SCORE_OPORTUNIDAD) : null;

  return (
    <div id="market-intelligence-section" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#1C1433] via-[#160E2A] to-[#0E0A1B] border-2 border-[#9333EA]/70 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#9333EA]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-700/60 text-xs font-semibold text-[#C084FC]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Inteligencia Comercial Territorial B2B • API DENUE INEGI</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Reporte de Oportunidad y Competencia Territorial
            </h2>
            <p className="text-sm text-[#E9D5FF]/80 leading-relaxed">
              Evalúa la viabilidad comercial en <span className="text-white font-bold">{municipio ? `${municipio}, ` : ''}{estado}</span> con datos del DENUE de INEGI.
              Cobertura dual: <b className="text-emerald-400">Flotillas Comerciales (RAM / utilitarios)</b> + <b className="text-purple-300">Autos Pasajeros para Profesionistas (Jeep, Peugeot, Dodge, Fiat)</b>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-toggle-comparar-zonas"
              onClick={() => {
                const nextState = !showComparador;
                setShowComparador(nextState);
                if (nextState && !comparativa) {
                  ejecutarComparacion();
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg ${
                showComparador
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/60'
                  : 'bg-gradient-to-r from-amber-600 via-amber-700 to-purple-800 hover:from-amber-500 hover:to-purple-700 text-white shadow-purple-950/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-300" />
              <span>{showComparador ? 'Ocultar Comparativa' : '📊 Comparar con otra zona'}</span>
            </button>

            <button
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="px-3.5 py-2 rounded-xl bg-[#140E24] border border-[#6B21A8] hover:border-[#9333EA] text-xs font-semibold text-[#C084FC] flex items-center gap-2 transition shadow"
              title="Configurar Token DENUE INEGI"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{token ? 'Token DENUE Activo' : 'Configurar Token INEGI'}</span>
            </button>

            <button
              onClick={cargarReporte}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-[#2D1B4E] hover:bg-[#3E2568] border border-purple-700 text-xs font-bold text-white flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            {reporte && (
              <button
                onClick={descargarReporteTxt}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#A855F7] text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-purple-950/50 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Reporte (.txt)</span>
              </button>
            )}
          </div>
        </div>

        {/* Token Input Drawer */}
        {showTokenInput && (
          <div className="mt-5 pt-5 border-t border-purple-900/60 bg-[#120A22]/90 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Token de la API DENUE de INEGI
                </h4>
                <p className="text-xs text-[#E9D5FF]/70">
                  El INEGI proporciona acceso gratuito a su API de establecimientos. Puedes generar tu token en{' '}
                  <a
                    href="https://www.inegi.org.mx/app/api/denue/v1/consulta/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-300 underline font-semibold hover:text-white"
                  >
                    inegi.org.mx/app/api/denue/v1/consulta/
                  </a>{' '}
                  registrando tu correo. (Si no tienes token, la app utiliza datos territoriales calibrados de alta precisión).
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Pega aquí tu token INEGI DENUE (ej: a1b2c3d4-e5f6-7890-abcd-1234567890ef)"
                className="flex-1 bg-[#0A0713] border border-[#6B21A8] focus:border-[#C084FC] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none"
              />
              <button
                onClick={handleSaveToken}
                className="px-4 py-2 bg-[#9333EA] hover:bg-[#A855F7] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {savedTokenMsg ? <Check className="w-4 h-4 text-emerald-400" /> : <SaveIcon className="w-4 h-4" />}
                <span>{savedTokenMsg ? '¡Token Guardado!' : 'Guardar y Recargar'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MEJORA 1: SLIDER DE COBERTURA RADIO DENUE (3, 5, 10, 15 KM)  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-[#130D26] border border-purple-900/50 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-amber-400 shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Radio de Cobertura DENUE:</span>
              <span className="font-mono font-extrabold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40 text-xs">
                {radioKm} km a la redonda
              </span>
            </h4>
            <p className="text-[11px] text-[#E9D5FF]/70">
              Ajusta el radio geodésico para capturar hospitales, logística y parques industriales cercanos.
            </p>
          </div>
        </div>

        {/* Slider de 4 posiciones: 3, 5, 10, 15 km */}
        <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
          <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">3 km</span>
          <input
            id="slider-radio-denue"
            type="range"
            min={0}
            max={3}
            step={1}
            value={[3, 5, 10, 15].indexOf(radioKm)}
            onChange={(e) => {
              const rMap = [3, 5, 10, 15];
              setRadioKm(rMap[parseInt(e.target.value, 10)]);
            }}
            className="w-36 sm:w-44 accent-[#9333EA] cursor-pointer"
          />
          <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">15 km</span>

          {/* Botones de acceso rápido */}
          <div className="flex items-center gap-1.5 ml-2">
            {[3, 5, 10, 15].map((r) => (
              <button
                key={r}
                id={`btn-radio-${r}km`}
                onClick={() => setRadioKm(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  radioKm === r
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-md'
                    : 'bg-[#1C1433] text-purple-300 hover:text-white'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MEJORA 3: COMPARATIVA DE ZONAS (TABLA COMPARATIVA DE SCORES) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showComparador && (
        <div id="panel-comparativa-zonas" className="bg-[#140E26] border-2 border-amber-500/60 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-900/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>📊 Comparativa de Zonas: {municipio || estado} vs {segundoMunicipio}</span>
                </h3>
                <p className="text-xs text-[#E9D5FF]/70">
                  Compara dos municipios con el Score de Oportunidad para decidir en qué zona prospectar cada semana.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowComparador(false)}
              className="text-gray-400 hover:text-white p-1 text-xs self-start sm:self-auto"
            >
              Cerrar ✕
            </button>
          </div>

          {/* Formulario de selección de la segunda zona */}
          <div className="bg-[#0E091C] border border-purple-900/50 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-[#C084FC]">
              Selecciona o escribe el segundo municipio para comparar:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <input
                  id="input-segundo-municipio"
                  type="text"
                  value={segundoMunicipio}
                  onChange={(e) => setSegundoMunicipio(e.target.value)}
                  placeholder="Ej: Iztapalapa, Zapopan, Benito Juárez..."
                  className="w-full bg-[#18112D] border border-purple-800 focus:border-[#C084FC] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  id="select-segundo-estado"
                  value={segundoEstado}
                  onChange={(e) => setSegundoEstado(e.target.value)}
                  className="w-full bg-[#18112D] border border-purple-800 focus:border-[#C084FC] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {ESTADOS_MEXICO.map((est) => (
                    <option key={est} value={est} className="bg-[#120B20] text-white">
                      {est}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  id="btn-ejecutar-comparacion"
                  onClick={ejecutarComparacion}
                  disabled={isComparing || !segundoMunicipio.trim()}
                  className="w-full py-2 px-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isComparing ? 'animate-spin' : ''}`} />
                  <span>{isComparing ? 'Analizando...' : 'Comparar'}</span>
                </button>
              </div>
            </div>

            {/* Accesos rápidos sugeridos */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-gray-400 font-medium">Sugerencias:</span>
              {["Iztapalapa", "Iztacalco", "Zapopan", "Guadalajara", "Monterrey", "Benito Juárez", "Cuauhtémoc"].map((sug) => (
                <button
                  key={sug}
                  onClick={() => {
                    setSegundoMunicipio(sug);
                    if (sug === "Zapopan" || sug === "Guadalajara") setSegundoEstado("Jalisco");
                    else if (sug === "Monterrey") setSegundoEstado("Nuevo León");
                    else setSegundoEstado("Ciudad de México");
                  }}
                  className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300 hover:text-white hover:border-[#9333EA] transition"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla Comparativa de Scores */}
          {comparativa && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-purple-900/60 shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1F1538] text-[#E9D5FF] border-b border-purple-800/60 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Indicador</th>
                      <th className="py-3 px-4 text-center font-bold text-white bg-purple-950/40">
                        {comparativa.zona1.nombre}
                      </th>
                      <th className="py-3 px-4 text-center font-bold text-white bg-amber-950/30">
                        {comparativa.zona2.nombre}
                      </th>
                      <th className="py-3 px-4 text-center text-purple-300">Zona Líder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/30 bg-[#120A20] text-gray-200">
                    {comparativa.indicadores.map((fila, idx) => (
                      <tr 
                        key={fila.indicador} 
                        className={`hover:bg-white/[0.03] transition-colors ${
                          idx === 0 ? 'bg-purple-950/30 font-bold text-white text-sm' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-amber-400' : 'bg-purple-400'}`} />
                          <span>{fila.indicador}</span>
                        </td>
                        <td className={`py-3 px-4 text-center font-mono font-bold ${
                          fila.lider === 'zona1' ? 'text-emerald-400 bg-emerald-950/20' : 'text-gray-200'
                        }`}>
                          {fila.zona1}
                        </td>
                        <td className={`py-3 px-4 text-center font-mono font-bold ${
                          fila.lider === 'zona2' ? 'text-emerald-400 bg-emerald-950/20' : 'text-gray-200'
                        }`}>
                          {fila.zona2}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {fila.lider === 'zona1' ? (
                            <span className="text-purple-300">★ {comparativa.zona1.nombre}</span>
                          ) : fila.lider === 'zona2' ? (
                            <span className="text-amber-400">★ {comparativa.zona2.nombre}</span>
                          ) : (
                            <span className="text-gray-400">⚖️ Empate</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tarjeta de Decisión Estratégica Semanal */}
              <div className="bg-gradient-to-r from-emerald-950/50 via-[#1A1033] to-amber-950/40 border border-emerald-500/50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-500 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-lg">
                    🎯
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Recomendación para la Semana:
                    </h4>
                    <p className="text-xs text-white font-medium mt-0.5">
                      {comparativa.diagnostico}
                    </p>
                  </div>
                </div>

                <div className="px-3.5 py-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold whitespace-nowrap self-start sm:self-auto">
                  Prioridad: {comparativa.zonaGanadora}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Score & Metric Display */}
      {reporte && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Big Opportunity Score Gauge Card (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#19102D] to-[#120B20] border-2 border-[#9333EA]/60 rounded-2xl p-6 space-y-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/40">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C084FC] flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                Score de Oportunidad Territorial
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-mono font-bold">
                Radio: {radioKm} km
              </span>
            </div>

            {/* Score Display */}
            <div className="flex flex-col items-center justify-center text-center py-2 space-y-3">
              <div className="relative flex items-center justify-center">
                {/* Outer Ring */}
                <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-[#6B21A8] via-[#9333EA] to-[#C084FC] p-1.5 shadow-xl shadow-purple-950/80">
                  <div className="w-full h-full rounded-full bg-[#0E0A1B] flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-white font-mono tracking-tighter">
                      {reporte.SCORE_OPORTUNIDAD}
                    </span>
                    <span className="text-[11px] text-purple-400 font-bold uppercase tracking-widest">
                      de 10 pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`px-4 py-2 rounded-xl border bg-gradient-to-r ${badgeInfo?.bg} flex items-center gap-2 shadow-lg`}>
                {badgeInfo?.icon}
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  {reporte.INTERPRETACION_SCORE}
                </span>
              </div>
            </div>

            {/* Scoring Breakdown Rules */}
            <div className="space-y-2.5 pt-2 border-t border-purple-900/40">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                Desglose de Factores Calibrados:
              </h4>
              <div className="space-y-1.5 text-xs">
                {(reporte.DESGLOSE_PUNTOS || []).map((punto, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-[#0A0713]/60 p-2.5 rounded-lg border border-purple-900/30 text-[#E9D5FF]">
                    <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                    <span>{punto}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Useful Links Direct to Maps / DENUE */}
            <div className="space-y-2.5 pt-2 border-t border-purple-900/40">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-[#C084FC]" />
                Enlaces Oficiales y Georreferenciados:
              </h4>
              
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={reporte.LINKS_UTILES.denue_hospitales}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[#140E24] hover:bg-[#1F1538] border border-purple-900/40 hover:border-purple-600 text-xs font-medium text-[#E9D5FF] flex items-center justify-between transition group"
                >
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>DENUE Hospitales</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-white" />
                </a>

                <a
                  href={reporte.LINKS_UTILES.denue_transporte}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[#140E24] hover:bg-[#1F1538] border border-purple-900/40 hover:border-purple-600 text-xs font-medium text-[#E9D5FF] flex items-center justify-between transition group"
                >
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span>DENUE Transporte</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-white" />
                </a>

                <a
                  href={reporte.LINKS_UTILES.denue_educacion || `https://www.inegi.org.mx/app/mapa/denue/default.aspx?q=${encodeURIComponent('escuela ' + (municipio || estado))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[#140E24] hover:bg-[#1F1538] border border-purple-900/40 hover:border-purple-600 text-xs font-medium text-[#E9D5FF] flex items-center justify-between transition group"
                >
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-300" />
                    <span>DENUE Educación</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-white" />
                </a>

                <a
                  href={reporte.LINKS_UTILES.denue_restaurantes || `https://www.inegi.org.mx/app/mapa/denue/default.aspx?q=${encodeURIComponent('restaurante ' + (municipio || estado))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[#140E24] hover:bg-[#1F1538] border border-purple-900/40 hover:border-purple-600 text-xs font-medium text-[#E9D5FF] flex items-center justify-between transition group"
                >
                  <span className="flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-orange-400" />
                    <span>DENUE Restaurantes</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-white" />
                </a>

                <a
                  href={reporte.LINKS_UTILES.denue_gobierno || `https://www.inegi.org.mx/app/mapa/denue/default.aspx?q=${encodeURIComponent('alcaldia ' + (municipio || estado))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[#140E24] hover:bg-[#1F1538] border border-purple-900/40 hover:border-purple-600 text-xs font-medium text-[#E9D5FF] flex items-center justify-between transition group"
                >
                  <span className="flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-teal-400" />
                    <span>DENUE Gobierno</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-white" />
                </a>

                <a
                  href={reporte.LINKS_UTILES.inegi_nse}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[#140E24] hover:bg-[#1F1538] border border-purple-900/40 hover:border-purple-600 text-xs font-medium text-[#E9D5FF] flex items-center justify-between transition group"
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>INEGI NSE Urbana</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-white" />
                </a>

                <a
                  href={reporte.LINKS_UTILES.google_maps_competencia}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[#140E24] hover:bg-[#1F1538] border border-purple-900/40 hover:border-purple-600 text-xs font-medium text-[#E9D5FF] flex items-center justify-between transition group"
                >
                  <span className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-amber-400" />
                    <span>Maps Competencia</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-white" />
                </a>
              </div>
            </div>

          </div>

          {/* Right Column: Prospect Tabs & Competitor Directory (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Tabs Header */}
            <div className="flex border-b border-[#3B1F6E] gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('hospitales')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'hospitales'
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg'
                    : 'bg-[#140E24] text-[#E9D5FF] hover:bg-[#1E1438]'
                }`}
              >
                <Building2 className="w-4 h-4 text-rose-400" />
                <span>Hospitales ({reporte.PROSPECTOS_B2B.hospitales.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('reparto')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'reparto'
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg'
                    : 'bg-[#140E24] text-[#E9D5FF] hover:bg-[#1E1438]'
                }`}
              >
                <Truck className="w-4 h-4 text-blue-400" />
                <span>Reparto & Enlaces ({reporte.PROSPECTOS_B2B.empresas_reparto.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('flotillas')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'flotillas'
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg'
                    : 'bg-[#140E24] text-[#E9D5FF] hover:bg-[#1E1438]'
                }`}
              >
                <HardHat className="w-4 h-4 text-amber-400" />
                <span>Flotillas ({reporte.PROSPECTOS_B2B.empresas_flotilla.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('educacion')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'educacion'
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg'
                    : 'bg-[#140E24] text-[#E9D5FF] hover:bg-[#1E1438]'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-purple-300" />
                <span>Educación & Profesionistas ({reporte.PROSPECTOS_B2B.educacion_profesionistas.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('restaurantes')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'restaurantes'
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg'
                    : 'bg-[#140E24] text-[#E9D5FF] hover:bg-[#1E1438]'
                }`}
              >
                <Utensils className="w-4 h-4 text-orange-400" />
                <span>Restaurantes & Comercio ({reporte.PROSPECTOS_B2B.restaurantes_comercio.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('gobierno')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'gobierno'
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg'
                    : 'bg-[#140E24] text-[#E9D5FF] hover:bg-[#1E1438]'
                }`}
              >
                <Landmark className="w-4 h-4 text-teal-400" />
                <span>Gobierno & Servicios ({reporte.PROSPECTOS_B2B.gobierno_servicios.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('competencia')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'competencia'
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg'
                    : 'bg-[#140E24] text-[#E9D5FF] hover:bg-[#1E1438]'
                }`}
              >
                <Car className="w-4 h-4 text-emerald-400" />
                <span>Competencia ({reporte.COMPETENCIA.length})</span>
              </button>
            </div>

            {/* Tab Contents: Hospitales */}
            {activeTab === 'hospitales' && (
              <div className="space-y-3">
                <div className="text-xs text-[#E9D5FF]/70 pb-1">
                  Establecimientos médicos y clínicas en radio de 5km ideales para convenios comerciales corporativos o financiamiento:
                </div>
                <div className="space-y-3">
                  {reporte.PROSPECTOS_B2B.hospitales.map((hosp, idx) => (
                    <ProspectCard
                      key={idx}
                      prospecto={hosp}
                      id={`hosp-${idx}`}
                      copiedPhone={copiedPhone}
                      onCopyPhone={(text, id) => copyToClipboard(text, id)}
                      tagColor="text-rose-400 bg-rose-950/40 border-rose-800/50"
                      icon={<Building2 className="w-4 h-4 text-rose-400" />}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tab Contents: Reparto */}
            {activeTab === 'reparto' && (
              <div className="space-y-3">
                <div className="text-xs text-[#E9D5FF]/70 pb-1">
                  Empresas de autotransporte, mensajería y paquetería con alta necesidad operativa de unidades ligeras y utilitarias:
                </div>
                <div className="space-y-3">
                  {reporte.PROSPECTOS_B2B.empresas_reparto.map((rep, idx) => (
                    <ProspectCard
                      key={idx}
                      prospecto={rep}
                      id={`rep-${idx}`}
                      copiedPhone={copiedPhone}
                      onCopyPhone={(text, id) => copyToClipboard(text, id)}
                      tagColor="text-blue-400 bg-blue-950/40 border-blue-800/50"
                      icon={<Truck className="w-4 h-4 text-blue-400" />}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tab Contents: Flotillas */}
            {activeTab === 'flotillas' && (
              <div className="space-y-3">
                <div className="text-xs text-[#E9D5FF]/70 pb-1 flex items-center justify-between">
                  <span>Constructoras e industrias con requerimientos constantes de flotillas utilitarias y pick-ups:</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                    Enfoque: RAM Heavy Duty & Pick-ups
                  </span>
                </div>
                <div className="space-y-3">
                  {reporte.PROSPECTOS_B2B.empresas_flotilla.map((flot, idx) => (
                    <ProspectCard
                      key={idx}
                      prospecto={flot}
                      id={`flot-${idx}`}
                      copiedPhone={copiedPhone}
                      onCopyPhone={(text, id) => copyToClipboard(text, id)}
                      tagColor="text-amber-400 bg-amber-950/40 border-amber-800/50"
                      icon={<HardHat className="w-4 h-4 text-amber-400" />}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tab Contents: Educación y Profesionistas */}
            {activeTab === 'educacion' && (
              <div className="space-y-3">
                <div className="text-xs text-[#E9D5FF]/70 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span>Escuelas privadas, colegios, universidades, despachos contables/fiscales, notarías y arquitectos:</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold shrink-0">
                    Enfoque: Jeep, Peugeot, Dodge, Fiat
                  </span>
                </div>
                <div className="space-y-3">
                  {reporte.PROSPECTOS_B2B.educacion_profesionistas.map((edu, idx) => (
                    <ProspectCard
                      key={idx}
                      prospecto={edu}
                      id={`edu-${idx}`}
                      copiedPhone={copiedPhone}
                      onCopyPhone={(text, id) => copyToClipboard(text, id)}
                      tagColor="text-purple-300 bg-purple-950/40 border-purple-800/50"
                      icon={<GraduationCap className="w-4 h-4 text-purple-300" />}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tab Contents: Restaurantes y Comercio */}
            {activeTab === 'restaurantes' && (
              <div className="space-y-3">
                <div className="text-xs text-[#E9D5FF]/70 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span>Restaurantes con empleados, panaderías con sucursales, plazas comerciales y distribuidoras de alimentos:</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800 font-semibold shrink-0">
                    Enfoque: RAM 700 & Vans Utilitarias
                  </span>
                </div>
                <div className="space-y-3">
                  {reporte.PROSPECTOS_B2B.restaurantes_comercio.map((rest, idx) => (
                    <ProspectCard
                      key={idx}
                      prospecto={rest}
                      id={`rest-${idx}`}
                      copiedPhone={copiedPhone}
                      onCopyPhone={(text, id) => copyToClipboard(text, id)}
                      tagColor="text-orange-400 bg-orange-950/40 border-orange-800/50"
                      icon={<Utensils className="w-4 h-4 text-orange-400" />}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tab Contents: Gobierno y Servicios */}
            {activeTab === 'gobierno' && (
              <div className="space-y-3">
                <div className="text-xs text-[#E9D5FF]/70 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span>Oficinas de alcaldías, dependencias, empresas de seguridad privada y servicios de limpieza corporativa:</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 font-semibold shrink-0">
                    Enfoque: RAM ProMaster / Patrullaje
                  </span>
                </div>
                <div className="space-y-3">
                  {reporte.PROSPECTOS_B2B.gobierno_servicios.map((gob, idx) => (
                    <ProspectCard
                      key={idx}
                      prospecto={gob}
                      id={`gob-${idx}`}
                      copiedPhone={copiedPhone}
                      onCopyPhone={(text, id) => copyToClipboard(text, id)}
                      tagColor="text-teal-400 bg-teal-950/40 border-teal-800/50"
                      icon={<Landmark className="w-4 h-4 text-teal-400" />}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tab Contents: Competencia */}
            {activeTab === 'competencia' && (
              <div className="space-y-3">
                <div className="text-xs text-[#E9D5FF]/70 pb-1">
                  Agencias distribuidoras de automóviles y marcas competidoras directas en la zona geográfica:
                </div>
                <div className="space-y-3">
                  {reporte.COMPETENCIA.map((comp, idx) => {
                    const compGpsUrl = comp.link_gps || (
                      comp.coordenadas?.lat && comp.coordenadas?.lon
                        ? `https://www.google.com/maps/dir/?api=1&destination=${comp.coordenadas.lat},${comp.coordenadas.lon}`
                        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${comp.nombre} ${municipio} ${estado}`)}`
                    );
                    return (
                      <div
                        key={idx}
                        className="bg-[#140E24] border border-purple-900/50 hover:border-[#9333EA] rounded-xl p-4 space-y-2.5 transition shadow"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-sm text-white flex items-center gap-2">
                              <Car className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{comp.nombre}</span>
                            </h4>
                            <span className="text-xs font-semibold text-purple-300">
                              Marca estimada: <b className="text-white">{comp.marca_estimada}</b>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300">
                              {comp.distancia_km} km
                            </span>
                            <a
                              href={compGpsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded bg-[#9333EA] hover:bg-[#A855F7] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow transition-all"
                              title="Navegar con Google Maps desde tu ubicación actual"
                            >
                              <span>🧭</span>
                              <span>Ir</span>
                            </a>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between">
                          <span className="text-[11px] text-[#E9D5FF]/60">
                            Ficha de competencia en radio de 5km
                          </span>
                          <div className="flex items-center gap-2">
                            <a
                              href={compGpsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded bg-[#9333EA] hover:bg-[#A855F7] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow transition-all sm:hidden"
                            >
                              <span>🧭</span>
                              <span>Ir</span>
                            </a>
                            <a
                              href={comp.link_maps}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition"
                            >
                              <span>Ver en Maps</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
};

interface ProspectCardProps {
  prospecto: ProspectoB2B;
  id: string;
  copiedPhone: string | null;
  onCopyPhone: (text: string, id: string) => void;
  tagColor: string;
  icon: React.ReactNode;
}

const ProspectCard: React.FC<ProspectCardProps> = ({
  prospecto,
  id,
  copiedPhone,
  onCopyPhone,
  tagColor,
  icon,
}) => {
  const gpsUrl = prospecto.link_gps || (
    prospecto.coordenadas?.lat && prospecto.coordenadas?.lon
      ? `https://www.google.com/maps/dir/?api=1&destination=${prospecto.coordenadas.lat},${prospecto.coordenadas.lon}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(prospecto.direccion || prospecto.nombre)}`
  );

  return (
    <div className="bg-[#140E24] border border-purple-900/40 hover:border-[#9333EA] rounded-xl p-4 space-y-3 transition shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {icon}
            <h4 className="font-bold text-sm text-white line-clamp-1">
              {prospecto.nombre}
            </h4>
          </div>
          <p className="text-xs text-[#E9D5FF]/70 line-clamp-1">
            {prospecto.actividad}
          </p>
          {prospecto.enfoque_vehiculo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/90 text-[#C084FC] border border-purple-800/60">
              <span>🚗</span>
              <span>{prospecto.enfoque_vehiculo}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300">
            a {prospecto.distancia_km} km
          </span>
          <a
            href={gpsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded bg-[#9333EA] hover:bg-[#A855F7] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow transition-all"
            title="Navegar con Google Maps desde tu ubicación actual"
          >
            <span>🧭</span>
            <span>Ir</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#E9D5FF]/80">
        <div className="flex items-start gap-1.5 line-clamp-2">
          <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
          <span>{prospecto.direccion}</span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{prospecto.telefono}</span>
          </div>
          <button
            onClick={() => onCopyPhone(prospecto.telefono, id)}
            className="p-1 rounded hover:bg-purple-900/40 text-purple-300 transition"
            title="Copiar teléfono"
          >
            {copiedPhone === id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between">
        {prospecto.web ? (
          <a
            href={prospecto.web}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 transition"
          >
            <Globe className="w-3 h-3" />
            <span className="truncate max-w-xs">{prospecto.web}</span>
          </a>
        ) : (
          <span className="text-[10px] text-[#E9D5FF]/50">Registro Oficial DENUE</span>
        )}
        <div className="flex items-center gap-2">
          <a
            href={gpsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-0.5 rounded bg-[#9333EA] hover:bg-[#A855F7] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow transition-all sm:hidden"
          >
            <span>🧭</span>
            <span>Ir</span>
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prospecto.nombre + ' ' + prospecto.direccion)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition"
          >
            <span>Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

const SaveIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
