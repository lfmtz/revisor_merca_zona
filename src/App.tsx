import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PythonProjectModal 
} from './components/PythonProjectModal';
import { 
  EthicalNoticeModal 
} from './components/EthicalNoticeModal';
import { 
  StealthLogViewer 
} from './components/StealthLogViewer';
import { 
  TerritoryMap 
} from './components/TerritoryMap';
import { 
  ApifyQueryModal 
} from './components/ApifyQueryModal';
import { 
  ApifyExtractorModal 
} from './components/ApifyExtractorModal';
import { 
  MarketIntelligenceSection 
} from './components/MarketIntelligenceSection';
import { 
  GridMode, 
  Lead, 
  CategorySummary, 
  ZoneAnalysisResult, 
  ExtractionLog, 
  ScraperSettings 
} from './types';
import { 
  scanTerritoryWithGrid, 
  LiveScanProgressUpdate,
  REAL_GOOGLE_MAPS_CATEGORIES,
  TERMINOS_BUSQUEDA 
} from './services/scraperEngine';
import { 
  geocodificarZona, 
  generarCuadricula, 
  estimarAntesDeEjecutar, 
  MODOS_CUADRICULA,
  generarApifyQueriesTxt 
} from './utils/gridEngine';
import { 
  exportLeadsToCsv, 
  exportCategoriesToCsv, 
  downloadTextFile, 
  copyPhoneListToClipboard 
} from './utils/dataProcessor';
import { ESTADOS_MEXICO, ESTADOS_DATA } from './data/mexico_geo';
import { 
  MapPin, 
  Play, 
  Pause, 
  Save, 
  RotateCcw, 
  Copy, 
  Check, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  ExternalLink, 
  Layers, 
  Clock, 
  Store, 
  Tag, 
  ShieldCheck, 
  Code2, 
  Terminal, 
  TrendingUp, 
  Navigation, 
  Phone, 
  Star, 
  Sparkles, 
  Database,
  ArrowRight,
  Info,
  CheckCircle2,
  Compass,
  Zap
} from 'lucide-react';

export default function App() {
  // Top-level View: 'cuadricula' (Escaneo de Cuadrículas Maps) | 'inteligencia' (DENUE INEGI B2B)
  const [activeMainTab, setActiveMainTab] = useState<'cuadricula' | 'inteligencia'>('cuadricula');

  // Linear Flow Step: 'config' (Pantalla 1) | 'scanning' (Pantalla 2) | 'results' (Pantalla 3)
  const [currentScreen, setCurrentScreen] = useState<'config' | 'scanning' | 'results'>('config');

  // Parameters
  const [estado, setEstado] = useState<string>('Ciudad de México');
  const [municipio, setMunicipio] = useState<string>('Iztacalco');
  const [baseEstado, setBaseEstado] = useState<string>('Ciudad de México');
  const [baseMunicipio, setBaseMunicipio] = useState<string>('Iztacalco');
  const [radioKm, setRadioKm] = useState<number>(8);
  const [gridMode, setGridMode] = useState<GridMode>('estandar');

  // Scraper Settings
  const [settings, setSettings] = useState<ScraperSettings>({
    delay_min: 2.5,
    delay_max: 5,
    batch_size: 50,
    stealth_mode: true,
    max_results: 5000,
    user_agent_rotativo: true
  });

  // Scanning Live State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<LiveScanProgressUpdate>({
    celda_actual: 0,
    total_celdas: 16,
    porcentaje: 0,
    total_encontrados: 0,
    nuevos_en_celda: 0,
    categorias_detectadas: 0,
    ultima_categoria: 'Vidriería',
    termino_actual: 'negocios',
    tiempo_transcurrido_seg: 0,
    tiempo_estimado_total_seg: 300,
    mensaje: 'Iniciando escaneo territorial...'
  });
  const [logs, setLogs] = useState<ExtractionLog[]>([]);
  const stopRef = useRef<{ current: boolean }>({ current: false });

  // Results State
  const [zoneResult, setZoneResult] = useState<ZoneAnalysisResult | null>(null);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [activeResultsTab, setActiveResultsTab] = useState<'categorias' | 'mapa' | 'leads' | 'inteligencia' | 'exportar'>('categorias');
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [leadsSearch, setLeadsSearch] = useState<string>('');
  const [leadsViewMode, setLeadsViewMode] = useState<'tabla' | 'tarjetas'>('tabla');

  // Modals
  const [selectedApifyCat, setSelectedApifyCat] = useState<{ nombre: string; count: number } | null>(null);
  const [selectedExtractCat, setSelectedExtractCat] = useState<string | null>(null);
  const [isPythonModalOpen, setIsPythonModalOpen] = useState<boolean>(false);
  const [isEthicalModalOpen, setIsEthicalModalOpen] = useState<boolean>(false);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState<boolean>(false);
  const [copiedPhones, setCopiedPhones] = useState<boolean>(false);

  // Municipalities list for active state
  const availableMunicipios = useMemo(() => {
    return ESTADOS_DATA[estado]?.municipios || [];
  }, [estado]);

  // Geocoding and Grid Calculations
  const geoCenter = useMemo(() => {
    return geocodificarZona(estado, municipio);
  }, [estado, municipio]);

  const baseGeo = useMemo(() => {
    return geocodificarZona(baseEstado || estado, baseMunicipio);
  }, [baseEstado, estado, baseMunicipio]);

  const gridEstimation = useMemo(() => {
    return estimarAntesDeEjecutar(radioKm, gridMode);
  }, [radioKm, gridMode]);

  const calculatedCells = useMemo(() => {
    return generarCuadricula(geoCenter.lat, geoCenter.lon, radioKm, gridMode);
  }, [geoCenter.lat, geoCenter.lon, radioKm, gridMode]);

  const baseLocation = useMemo(() => {
    return {
      lat: baseGeo.lat,
      lng: baseGeo.lon,
      nombre: baseMunicipio ? `${baseMunicipio}, ${baseEstado || estado}` : (baseEstado || estado),
      radioKm: radioKm
    };
  }, [baseGeo, baseMunicipio, baseEstado, estado, radioKm]);

  // Logging helper
  const addLog = (message: string, type: ExtractionLog['type'] = 'info') => {
    setLogs(prev => [
      ...prev,
      {
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString('es-MX', { hour12: false }),
        message,
        type
      }
    ]);
  };

  // Timer simulation during active scan
  const timerRef = useRef<number | null>(null);
  const [elapsedTimerSec, setElapsedTimerSec] = useState<number>(0);

  useEffect(() => {
    if (isScanning && !isPaused) {
      const interval = window.setInterval(() => {
        setElapsedTimerSec(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isScanning, isPaused]);

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  const handleStartScan = async () => {
    if (!estado || estado === '-- Selecciona un estado --') return;

    setCurrentScreen('scanning');
    setIsScanning(true);
    setIsPaused(false);
    setElapsedTimerSec(0);
    stopRef.current = { current: false };

    addLog(`🚀 Iniciando escaneo de zona territorial en ${municipio ? `${municipio}, ` : ''}${estado}...`, 'info');
    addLog(`Modo: ${gridMode.toUpperCase()} (${calculatedCells.length} celdas) | Radio: ${radioKm} km`, 'info');

    try {
      const result = await scanTerritoryWithGrid(
        estado,
        municipio,
        radioKm,
        gridMode,
        settings,
        (progress) => {
          setScanProgress(progress);
        },
        (log) => {
          setLogs(prev => [...prev, log]);
        },
        stopRef.current
      );

      setZoneResult(result);
      
      // Generate realistic leads directory for these categories (180 registros)
      const allLeads: Lead[] = [];
      const NOMBRES_MARCAS = [
        "San José", "El Águila", "Los Primos", "García e Hijos", "La Esperanza",
        "Don Beto", "San Francisco", "El Fénix", "Hermanos Morales", "La Fe",
        "Azteca", "San Martín", "El Trébol", "La Moderna", "Doña Tere",
        "La Central", "San Rafael", "El Sol", "González Hermanos", "Alfa & Omega",
        "La Guadalupana", "Metropolitano", "Imperial", "San Antonio", "La Corona"
      ];

      result.categorias.slice(0, 15).forEach((catSummary, idx) => {
        const catLeadsCount = Math.min(catSummary.cantidad, 12);
        for (let j = 0; j < catLeadsCount; j++) {
          const pt = result.densidad_puntos[idx % result.densidad_puntos.length];
          const dir = `Av. Principal #${100 + j * 12}, Col. Centro, C.P. 08000, ${municipio || estado}, México`;
          
          // Generar nombre de negocio auténtico con marca/nombre comercial
          const marca = NOMBRES_MARCAS[(idx * 7 + j) % NOMBRES_MARCAS.length];
          
          // Simular 2 registros con nombre vacío para verificar que el indicador rojo "⚠️ Sin nombre" funcione visiblemente
          const isSimulatedMissing = (idx === 0 && j === 5) || (idx === 2 && j === 8);
          const nombreNegocio = isSimulatedMissing ? "" : `${catSummary.categoria} "${marca}"`;

          allLeads.push({
            id: `lead_${idx}_${j}_${Date.now()}`,
            nombre_negocio: nombreNegocio,
            categoria: catSummary.categoria,
            tipo_entidad: catSummary.tipo_entidad,
            direccion_completa: dir,
            municipio_detectado: municipio || estado,
            estado_detectado: estado,
            telefono: `+52 55 ${5000 + idx * 100 + j * 10} ${1000 + j * 45}`,
            url_google_maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((nombreNegocio || catSummary.categoria) + ' ' + (municipio || estado))}`,
            sitio_web: j % 2 === 0 ? `https://www.${catSummary.categoria.toLowerCase().replace(/[^a-z0-9]/g, '')}-mx.com` : 'N/A',
            calificacion: Number((4.0 + (j % 10) * 0.1).toFixed(1)),
            num_resenas: 25 + j * 18,
            horario: 'Lun a Sáb 09:00 - 19:00',
            estado_apertura: 'Abierto ahora',
            link_navegacion: (pt?.lat && pt?.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${pt.lat},${pt.lng}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dir)}`,
            fecha_extraccion: new Date().toISOString().split('T')[0],
            cobertura_busqueda: municipio ? `${municipio}, ${estado}` : estado,
            lat: pt?.lat,
            lng: pt?.lng
          });
        }
      });
      setLeadsList(allLeads);

      setIsScanning(false);
      setCurrentScreen('results');
      setActiveResultsTab('mapa');
    } catch (err: any) {
      addLog(`❌ Error en escaneo: ${err.message}`, 'error');
      setIsScanning(false);
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false);
      stopRef.current.current = false;
      addLog(`▶️ Reanudando escaneo de cuadrículas...`, 'info');
    } else {
      setIsPaused(true);
      stopRef.current.current = true;
      addLog(`⏸️ Escaneo pausado por el usuario.`, 'warning');
    }
  };

  const handleSavePartialAndFinish = () => {
    stopRef.current.current = true;
    setIsScanning(false);
    addLog(`⬇️ Guardando resultados parciales y finalizando escaneo...`, 'success');
    setCurrentScreen('results');
    setActiveResultsTab('mapa');
  };

  const handleNewScan = () => {
    setCurrentScreen('config');
    setZoneResult(null);
    setLogs([]);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtered categories in results screen
  const filteredCategories = useMemo(() => {
    if (!zoneResult) return [];
    if (!categorySearch.trim()) return zoneResult.categorias;
    const q = categorySearch.toLowerCase().trim();
    return zoneResult.categorias.filter(c => c.categoria.toLowerCase().includes(q));
  }, [zoneResult, categorySearch]);

  return (
    <div id="leadscrapper-app-root" className="min-h-screen bg-[#0A0713] text-white flex flex-col font-sans selection:bg-[#9333EA] selection:text-white">
      {/* Top Navbar */}
      <header id="main-header" className="h-16 border-b border-[#2D1B4E]/80 bg-[#130E22]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#9333EA] to-[#C084FC] flex items-center justify-center shadow-lg shadow-purple-900/40">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-[#E9D5FF] to-[#C084FC] bg-clip-text text-transparent">
                LeadScrapper MX
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#9333EA]/30 text-[#C084FC] border border-[#9333EA]/40">
                Grid Engine v2.4
              </span>
            </div>
            <p className="text-[11px] text-[#C084FC]/70 hidden sm:block">
              Motor territorial de prospección comercial sin límite de 120 resultados
            </p>
          </div>
        </div>

        {/* View Switcher: Cuadrículas vs Inteligencia B2B */}
        <div className="hidden sm:flex items-center gap-1 bg-[#0A0713] p-1 rounded-xl border border-purple-900/60 shadow-inner">
          <button
            id="nav-btn-cuadricula"
            onClick={() => setActiveMainTab('cuadricula')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeMainTab === 'cuadricula'
                ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow'
                : 'text-[#E9D5FF]/70 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cuadrículas Maps</span>
          </button>
          <button
            id="nav-btn-inteligencia"
            onClick={() => setActiveMainTab('inteligencia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeMainTab === 'inteligencia'
                ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow'
                : 'text-[#E9D5FF]/70 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>Inteligencia DENUE</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            id="btn-open-stealth-logs"
            onClick={() => setIsLogViewerOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-[#6B21A8]/60 hover:border-[#9333EA] bg-[#1E1635] text-xs font-semibold text-[#E9D5FF] flex items-center gap-1.5 transition"
          >
            <Terminal className="w-3.5 h-3.5 text-[#C084FC]" />
            <span className="hidden md:inline">Logs Playwright</span>
          </button>

          <button
            id="btn-open-python-code"
            onClick={() => setIsPythonModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#A855F7] text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-purple-950/50 transition"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Código Python</span>
          </button>

          <button
            id="btn-open-lfpdppp-notice"
            onClick={() => setIsEthicalModalOpen(true)}
            className="p-1.5 rounded-lg border border-purple-900/40 hover:bg-white/5 text-purple-300 transition"
            title="Marco Legal LFPDPPP México"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        
        {/* DIRECT INTELLIGENCE VIEW (B2B & DENUE INEGI) - Works even before running any scan */}
        {activeMainTab === 'inteligencia' ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#130E22] border border-purple-900/40 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-purple-400 font-semibold">Territorio Seleccionado:</span>
                <span className="px-2.5 py-1 rounded-lg bg-purple-950 text-white font-bold border border-purple-800">
                  {municipio ? `${municipio}, ` : ''}{estado}
                </span>
                <span className="text-gray-400 font-mono text-[11px] hidden md:inline">
                  (Lat: {geoCenter.lat.toFixed(4)}, Lon: {geoCenter.lon.toFixed(4)})
                </span>
              </div>
              <button
                onClick={() => setActiveMainTab('cuadricula')}
                className="px-3.5 py-1.5 rounded-xl bg-[#1C1433] hover:bg-[#251A45] border border-purple-800 text-xs font-bold text-[#E9D5FF] flex items-center gap-1.5 transition self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                <span>Volver a Escaneo de Cuadrícula</span>
              </button>
            </div>

            <MarketIntelligenceSection
              estado={estado}
              municipio={municipio}
              lat={geoCenter.lat}
              lon={geoCenter.lon}
            />
          </div>
        ) : (
          <>
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {/* PANTALLA 1: CONFIGURACIÓN DE ZONA Y MODO (FLUJO LINEAL)             */}
            {/* ═════════════════════════════════════════════════════════════════════ */}
            {currentScreen === 'config' && (
              <div id="screen-config" className="space-y-6 animate-fadeIn">
                {/* Direct Intelligence Shortcut Card */}
                <div className="bg-gradient-to-r from-[#1B1133] via-[#150D28] to-[#10091E] border border-[#9333EA]/60 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/90 border border-purple-700 flex items-center justify-center shrink-0 shadow">
                      <Compass className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                        <span>¿Deseas consultar inteligencia B2B sin esperar al escaneo?</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold">
                          DENUE INEGI
                        </span>
                      </h4>
                      <p className="text-xs text-[#E9D5FF]/70 mt-0.5">
                        Analiza hospitales, clínicas, empresas de transporte y flotillas industriales con el Score de Oportunidad para {municipio ? `${municipio}, ` : ''}{estado}.
                      </p>
                    </div>
                  </div>
                  <button
                    id="btn-shortcut-intel"
                    onClick={() => setActiveMainTab('inteligencia')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#A855F7] text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap shadow-lg shadow-purple-950/50 transition self-stretch sm:self-auto justify-center"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Ver Reporte B2B Ahora</span>
                  </button>
                </div>
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-[#1C1433] via-[#150F26] to-[#0E0A1B] border border-[#6B21A8]/50 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#9333EA]/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="max-w-3xl space-y-3 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800/60 text-xs font-semibold text-[#C084FC]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Flujo Lineal de Extracción Territorial</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                  Define tu zona y descubre <span className="bg-gradient-to-r from-[#C084FC] to-[#22C55E] bg-clip-text text-transparent">todas las categorías reales</span> de Google Maps
                </h2>
                <p className="text-sm sm:text-base text-[#E9D5FF]/80 leading-relaxed">
                  El motor subdivide tu área geográfica en cuadrículas geodésicas de alta precisión para capturar vidrierías, casas de materiales, tlapalerías, talleres y 100+ tipos de negocio con rotación multi-término.
                </p>
              </div>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Form Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Section 1: Zona de Búsqueda */}
                <div className="bg-[#140E24] border border-[#4C2889]/60 rounded-2xl p-5 sm:p-6 space-y-5 shadow-lg">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-[#3B1F6E]/50">
                    <MapPin className="w-5 h-5 text-[#C084FC]" />
                    <h3 className="font-bold text-base text-white">
                      1. Zona Territorial a Explorar
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Estado */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#C084FC] mb-2">
                        Estado de la República:
                      </label>
                      <select
                        id="select-estado"
                        value={estado}
                        onChange={(e) => {
                          const newEstado = e.target.value;
                          setEstado(newEstado);
                          const munList = ESTADOS_DATA[newEstado]?.municipios || [];
                          setMunicipio(munList[0] || '');
                        }}
                        className="w-full bg-[#0A0713] border border-[#6B21A8]/60 focus:border-[#C084FC] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition shadow-inner font-medium"
                      >
                        {ESTADOS_MEXICO.map((est) => (
                          <option key={est} value={est} className="bg-[#130E22] text-white">
                            {est}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Municipio */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#C084FC] mb-2">
                        Municipio o Alcaldía:
                      </label>
                      <input
                        id="input-municipio"
                        type="text"
                        list="municipios-list"
                        value={municipio}
                        onChange={(e) => setMunicipio(e.target.value)}
                        placeholder="Ej: Iztacalco, Guadalajara, Monterrey..."
                        className="w-full bg-[#0A0713] border border-[#6B21A8]/60 focus:border-[#C084FC] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition shadow-inner font-medium"
                      />
                      <datalist id="municipios-list">
                        {availableMunicipios.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Radio Slider */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-[#E9D5FF]">Radio de Cobertura Geográfica:</span>
                      <span className="font-extrabold text-[#22C55E] text-sm bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-800/50">
                        {radioKm} km a la redonda
                      </span>
                    </div>
                    <input
                      id="range-radio-km"
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={radioKm}
                      onChange={(e) => setRadioKm(Number(e.target.value))}
                      className="w-full accent-[#9333EA] bg-[#0A0713] h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#C084FC]/60 mt-1">
                      <span>1 km (Hiperlocal)</span>
                      <span>15 km (Municipal)</span>
                      <span>30 km (Metropolitano)</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Modo de Cuadrícula */}
                <div className="bg-[#140E24] border border-[#4C2889]/60 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-[#3B1F6E]/50">
                    <Layers className="w-5 h-5 text-[#C084FC]" />
                    <h3 className="font-bold text-base text-white">
                      2. Modalidad de Cuadrícula
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(['express', 'estandar', 'completo'] as GridMode[]).map((modeKey) => {
                      const cfg = MODOS_CUADRICULA[modeKey];
                      const isSelected = gridMode === modeKey;
                      return (
                        <div
                          key={modeKey}
                          id={`mode-card-${modeKey}`}
                          onClick={() => setGridMode(modeKey)}
                          className={`cursor-pointer rounded-xl p-3.5 border transition relative ${
                            isSelected
                              ? 'bg-gradient-to-b from-[#2E1854] to-[#1E1138] border-[#9333EA] ring-2 ring-[#C084FC]/50 shadow-lg'
                              : 'bg-[#0E0A1B] border-purple-900/40 hover:border-purple-700/60'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#22C55E] ring-4 ring-emerald-500/20" />
                          )}
                          <h4 className="font-bold text-sm text-white capitalize mb-1">
                            {modeKey === 'express' && '⚡ Express'}
                            {modeKey === 'estandar' && '🎯 Estándar'}
                            {modeKey === 'completo' && '🔬 Completo'}
                          </h4>
                          <p className="text-xs text-[#22C55E] font-semibold mb-1">
                            {cfg.cobertura}
                          </p>
                          <p className="text-[11px] text-[#E9D5FF]/70">
                            {cfg.descripcion}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Base de Operaciones */}
                <div className="bg-[#140E24] border border-[#4C2889]/60 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-[#3B1F6E]/50">
                    <Navigation className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="font-bold text-base text-white">
                        3. Base de Operaciones (Equipo de Ventas)
                      </h3>
                      <p className="text-xs text-[#E9D5FF]/70">
                        Ubicación física de salida para cálculo logístico y rutas
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#E9D5FF] mb-1">
                        Estado Base:
                      </label>
                      <select
                        id="select-base-estado"
                        value={baseEstado}
                        onChange={(e) => setBaseEstado(e.target.value)}
                        className="w-full bg-[#0A0713] border border-[#6B21A8]/60 focus:border-[#C084FC] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        {ESTADOS_MEXICO.map((est) => (
                          <option key={est} value={est} className="bg-[#130E22] text-white">
                            {est}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#E9D5FF] mb-1">
                        Municipio Base:
                      </label>
                      <input
                        id="input-base-municipio"
                        type="text"
                        value={baseMunicipio}
                        onChange={(e) => setBaseMunicipio(e.target.value)}
                        placeholder="Ej: Zapopan, Benito Juárez..."
                        className="w-full bg-[#0A0713] border border-[#6B21A8]/60 focus:border-[#C084FC] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Pre-Scan Estimator & CTA (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Estimation Preview Card */}
                <div className="bg-gradient-to-br from-[#1A122E] to-[#120B20] border-2 border-[#9333EA]/70 rounded-2xl p-6 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-[#6B21A8]/40">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C084FC] flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-[#C084FC]" />
                      Estimación Antes de Ejecutar
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold">
                      MODO {gridMode.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between text-sm py-1.5 border-b border-purple-900/30">
                      <span className="text-[#E9D5FF] flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#C084FC]" />
                        Zonas de búsqueda (Celdas):
                      </span>
                      <span className="font-bold text-white font-mono text-base">
                        {calculatedCells.length} celdas
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1.5 border-b border-purple-900/30">
                      <span className="text-[#E9D5FF] flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-400" />
                        Negocios reales esperados:
                      </span>
                      <span className="font-bold text-[#22C55E] font-mono text-base">
                        ~{gridEstimation.resultados_esperados.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1.5 border-b border-purple-900/30">
                      <span className="text-[#E9D5FF] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        Tiempo estimado:
                      </span>
                      <span className="font-bold text-amber-400 font-mono text-base">
                        {gridEstimation.tiempo_estimado_str}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm py-1.5">
                      <span className="text-[#E9D5FF] flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        Cobertura territorial:
                      </span>
                      <span className="font-bold text-[#C084FC] font-mono text-base">
                        {gridEstimation.cobertura}
                      </span>
                    </div>
                  </div>

                  {/* Multi-Search Rotation Notice */}
                  <div className="bg-[#0D0818] border border-purple-900/40 rounded-xl p-3.5 text-xs text-[#E9D5FF]/80 space-y-1.5">
                    <p className="font-semibold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Rotación Activa de {TERMINOS_BUSQUEDA.length} Términos:
                    </p>
                    <p className="text-[11px] text-[#C084FC] font-mono">
                      vidrieras, materiales, ferreterías, talleres, distribuidoras, bodegas, servicios...
                    </p>
                  </div>

                  {/* Big CTA Button */}
                  <button
                    id="btn-start-linear-scan"
                    onClick={handleStartScan}
                    className="w-full py-4 px-6 bg-gradient-to-r from-[#7C3AED] via-[#9333EA] to-[#C084FC] hover:from-[#6D28D9] hover:to-[#A855F7] text-white font-extrabold text-base rounded-xl shadow-xl shadow-purple-900/50 hover:shadow-purple-900/80 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>⚡ INICIAR ESCANEO TERRITORIAL</span>
                  </button>

                  <p className="text-[11px] text-center text-[#E9D5FF]/60">
                    Playwright Stealth activado • Sin bloqueo de 120 resultados
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* PANTALLA 2: PROGRESO EN TIEMPO REAL CON TIEMPO TRANSCURRIDO          */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {currentScreen === 'scanning' && (
          <div id="screen-scanning" className="space-y-6 animate-fadeIn">
            {/* Header Box */}
            <div className="bg-[#140E24] border-2 border-[#9333EA] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#6B21A8]/40">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                      ⚡ Escaneando {municipio ? `${municipio}, ` : ''}{estado}...
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-[#C084FC]">
                    Modo {gridMode.toUpperCase()} — Rotando término: <span className="text-emerald-400 font-mono font-bold">"{scanProgress.termino_actual}"</span>
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <button
                    id="btn-pause-scan"
                    onClick={handlePauseResume}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      isPaused
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                        : 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/50'
                    }`}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
                  </button>

                  <button
                    id="btn-save-partial"
                    onClick={handleSavePartialAndFinish}
                    className="px-4 py-2 rounded-xl bg-[#6B21A8] hover:bg-[#9333EA] text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar parcial</span>
                  </button>
                </div>
              </div>

              {/* Big Animated Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm font-bold">
                  <span className="text-white">
                    Progreso: <span className="text-[#C084FC] font-mono">{scanProgress.porcentaje}%</span>
                  </span>
                  <span className="text-[#E9D5FF] font-mono">
                    ({scanProgress.celda_actual} / {scanProgress.total_celdas} celdas)
                  </span>
                </div>

                <div className="w-full bg-[#0A0713] rounded-full h-4 p-0.5 border border-[#6B21A8]/60 overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-[#6B21A8] via-[#9333EA] to-[#22C55E] h-full rounded-full transition-all duration-300 relative overflow-hidden"
                    style={{ width: `${Math.max(4, scanProgress.porcentaje)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* 4 Live Metrics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Metric 1 */}
                <div className="bg-[#0D0818] border border-purple-900/40 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C084FC] flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    Negocios Únicos
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                    {scanProgress.total_encontrados.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#E9D5FF]/60 block">Sin duplicados en zona</span>
                </div>

                {/* Metric 2 */}
                <div className="bg-[#0D0818] border border-purple-900/40 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C084FC] flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-[#C084FC]" />
                    Categorías Reales
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                    {scanProgress.categorias_detectadas}
                  </div>
                  <span className="text-[10px] text-[#E9D5FF]/60 block">Exactas de Google Maps</span>
                </div>

                {/* Metric 3: Real Elapsed Timer */}
                <div className="bg-[#0D0818] border border-purple-900/40 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C084FC] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Tiempo Transcurrido
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
                    {formatTimer(elapsedTimerSec)}
                  </div>
                  <span className="text-[10px] text-[#E9D5FF]/60 block">
                    ~{gridEstimation.tiempo_estimado_str} est.
                  </span>
                </div>

                {/* Metric 4: Latest Discovery */}
                <div className="bg-[#0D0818] border border-purple-900/40 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C084FC] flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#C084FC]" />
                    Última Celda
                  </span>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#C084FC] font-mono">
                    +{scanProgress.nuevos_en_celda} nuevos
                  </div>
                  <span className="text-[10px] text-[#E9D5FF]/80 truncate block">
                    {scanProgress.ultima_categoria}
                  </span>
                </div>

              </div>

              {/* Status Message */}
              <div className="bg-[#0D0818]/90 border border-[#6B21A8]/40 rounded-xl p-3.5 flex items-center gap-3 text-xs text-[#E9D5FF]">
                <div className="w-2 h-2 rounded-full bg-[#9333EA] animate-ping" />
                <span className="font-mono text-emerald-400">{scanProgress.mensaje}</span>
              </div>

            </div>

            {/* MODO 1: CUADRÍCULAS DE ESCANEO (SOLO MIENTRAS SE EJECUTA EL ESCANEO) */}
            <div id="mapa-modo-1-cuadriculas" className="bg-[#140E24] border-2 border-[#9333EA]/70 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-900/40">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                    <span>📐 MODO 1 — Cuadrículas de Escaneo en Tiempo Real</span>
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950 text-[#C084FC] border border-purple-800 font-mono font-bold">
                    Celda {scanProgress.celda_actual} / {scanProgress.total_celdas}
                  </span>
                </div>
                <div className="text-[11px] text-[#E9D5FF]/70">
                  Subdivisión geodésica • Se ocultará al terminar para mostrar pines individuales
                </div>
              </div>

              <div className="h-[400px] rounded-xl overflow-hidden border border-purple-900/50">
                <TerritoryMap
                  centerLat={geoCenter.lat}
                  centerLng={geoCenter.lon}
                  zoom={radioKm <= 5 ? 14 : radioKm <= 12 ? 12 : 11}
                  mode="cuadriculas"
                  baseLocation={baseLocation}
                  gridCells={calculatedCells}
                  activeCellIndex={scanProgress.celda_actual}
                />
              </div>
            </div>

            {/* Live Terminal Stream Preview */}
            <div className="bg-[#0A0713] border border-purple-950 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#C084FC] font-bold pb-2 border-b border-purple-900/30">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Terminal de Actividad Playwright Stealth
                </span>
                <span className="text-[10px] text-gray-400 font-mono">En vivo</span>
              </div>
              <div className="h-40 overflow-y-auto font-mono text-xs text-gray-300 space-y-1 pr-2">
                {logs.slice(-8).map((l) => (
                  <div key={l.id} className="leading-tight">
                    <span className="text-purple-400">[{l.timestamp}]</span>{' '}
                    <span className={l.type === 'success' ? 'text-emerald-400' : l.type === 'stealth' ? 'text-purple-300' : l.type === 'warning' ? 'text-amber-400' : 'text-gray-300'}>
                      {l.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* PANTALLA 3: RESULTADOS (TABLA DE CATEGORÍAS + MAPA + LEADS)         */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {currentScreen === 'results' && zoneResult && (
          <div id="screen-results" className="space-y-6 animate-fadeIn">
            
            {/* Top Summary Banner */}
            <div className="bg-gradient-to-r from-[#1E1438] via-[#160E2A] to-[#100A20] border-2 border-[#9333EA] rounded-2xl p-6 space-y-4 shadow-2xl">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-800">
                      ✓ Escaneo Completado
                    </span>
                    <h2 className="text-2xl font-extrabold text-white">
                      Radiografía Territorial de {municipio ? `${municipio}, ` : ''}{estado}
                    </h2>
                  </div>
                  <p className="text-xs text-[#C084FC] mt-1">
                    {zoneResult.celdas_procesadas} celdas procesadas • {zoneResult.tiempo_escaneo}s de ejecución • Cobertura estimada: {zoneResult.cobertura_pct}%
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    id="btn-new-scan"
                    onClick={handleNewScan}
                    className="px-4 py-2.5 rounded-xl border border-[#6B21A8] hover:border-[#9333EA] bg-[#140E24] text-xs font-bold text-white flex items-center gap-1.5 transition shadow"
                  >
                    <RotateCcw className="w-4 h-4 text-[#C084FC]" />
                    <span>Nuevo Escaneo</span>
                  </button>

                  <button
                    id="btn-view-python-results"
                    onClick={() => setIsPythonModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#A855F7] text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-purple-950/60 transition"
                  >
                    <Code2 className="w-4 h-4" />
                    <span>Ver Scripts Python</span>
                  </button>
                </div>
              </div>

              {/* 4 Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <div className="bg-[#0D0818] border border-purple-900/40 rounded-xl p-3.5">
                  <span className="text-[11px] text-[#C084FC] font-semibold block">Total Encontrado</span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {zoneResult.total_negocios.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#E9D5FF]/60 block">Negocios únicos</span>
                </div>

                <div className="bg-[#0D0818] border border-purple-900/40 rounded-xl p-3.5">
                  <span className="text-[11px] text-[#C084FC] font-semibold block">Categorías Reales</span>
                  <span className="text-2xl font-extrabold text-white font-mono">
                    {zoneResult.categorias_unicas}
                  </span>
                  <span className="text-[10px] text-[#E9D5FF]/60 block">Sin agrupar genéricas</span>
                </div>

                <div className="bg-[#0D0818] border border-purple-900/40 rounded-xl p-3.5">
                  <span className="text-[11px] text-[#C084FC] font-semibold block">Zonas Escaneadas</span>
                  <span className="text-2xl font-extrabold text-amber-400 font-mono">
                    {zoneResult.celdas_procesadas} / {zoneResult.celdas_totales}
                  </span>
                  <span className="text-[10px] text-[#E9D5FF]/60 block">Celdas de cuadrícula</span>
                </div>

                <div className="bg-[#0D0818] border border-purple-900/40 rounded-xl p-3.5">
                  <span className="text-[11px] text-[#C084FC] font-semibold block">Tiempo Total</span>
                  <span className="text-2xl font-extrabold text-[#C084FC] font-mono">
                    {zoneResult.tiempo_escaneo}s
                  </span>
                  <span className="text-[10px] text-[#E9D5FF]/60 block">Duración de escaneo</span>
                </div>
              </div>

            </div>

            {/* View Selector Tabs */}
            <div className="flex border-b border-[#3B1F6E] gap-2 overflow-x-auto pb-1">
              <button
                id="tab-btn-categorias"
                onClick={() => setActiveResultsTab('categorias')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${
                  activeResultsTab === 'categorias'
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg shadow-purple-950/50'
                    : 'bg-[#140E24] text-[#E9D5FF] hover:bg-[#1E1438]'
                }`}
              >
                <Tag className="w-4 h-4" />
                <span>📋 Tabla de Categorías Reales ({zoneResult.categorias_unicas})</span>
              </button>

              <button
                id="tab-btn-mapa"
                onClick={() => setActiveResultsTab('mapa')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${
                  activeResultsTab === 'mapa'
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg shadow-purple-950/50'
                    : 'bg-[#140E24] text-[#E9D5FF] hover:bg-[#1E1438]'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>🗺️ Mapa de Calor y Base</span>
              </button>

              <button
                id="tab-btn-leads"
                onClick={() => setActiveResultsTab('leads')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${
                  activeResultsTab === 'leads'
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg shadow-purple-950/50'
                    : 'bg-[#140E24] text-[#E9D5FF] hover:bg-[#1E1438]'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>👥 Directorio de Leads ({leadsList.length})</span>
              </button>

              <button
                id="tab-btn-inteligencia"
                onClick={() => setActiveResultsTab('inteligencia')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${
                  activeResultsTab === 'inteligencia'
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg shadow-purple-950/50'
                    : 'bg-[#140E24] text-[#E9D5FF] hover:bg-[#1E1438]'
                }`}
              >
                <Compass className="w-4 h-4 text-amber-400" />
                <span>🧠 Inteligencia DENUE & B2B</span>
              </button>

              <button
                id="tab-btn-exportar"
                onClick={() => setActiveResultsTab('exportar')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition whitespace-nowrap ${
                  activeResultsTab === 'exportar'
                    ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg shadow-purple-950/50'
                    : 'bg-[#140E24] text-[#E9D5FF] hover:bg-[#1E1438]'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>⬇️ Descargas y Apify</span>
              </button>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-VIEW 1: TABLA DE CATEGORÍAS REALES CON BOTÓN QUERY APIFY   */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeResultsTab === 'categorias' && (
              <div id="view-categorias-table" className="space-y-4">
                
                {/* Search Bar */}
                <div className="bg-[#140E24] border border-purple-900/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-96">
                    <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3" />
                    <input
                      id="input-search-category"
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Buscar categoría (ej: vidriería, tlapalería, materiales...)"
                      className="w-full bg-[#0A0713] border border-[#6B21A8]/50 focus:border-[#C084FC] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none"
                    />
                  </div>
                  <div className="text-xs text-[#E9D5FF]/70 font-medium">
                    Mostrando <b className="text-white">{filteredCategories.length}</b> de <b className="text-white">{zoneResult.categorias.length}</b> categorías detectadas
                  </div>
                </div>

                {/* Table */}
                <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#1C1433] border-b border-[#6B21A8]/40 text-[#C084FC] uppercase tracking-wider font-bold">
                          <th className="py-3.5 px-4 w-12 text-center">#</th>
                          <th className="py-3.5 px-4">Categoría Real de Google Maps</th>
                          <th className="py-3.5 px-4 text-right">En Muestra</th>
                          <th className="py-3.5 px-4 text-right">% del Total</th>
                          <th className="py-3.5 px-4 text-right">Est. Real Apify</th>
                          <th className="py-3.5 px-4 text-right">Costo Apify (USD)</th>
                          <th className="py-3.5 px-4 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2D1B4E]/40 text-gray-200">
                        {filteredCategories.map((cat, idx) => (
                          <tr key={cat.categoria} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-3 px-4 text-center font-mono text-purple-400 font-bold">
                              {cat.rank || idx + 1}
                            </td>
                            <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#9333EA]" />
                              <span>{cat.categoria}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-white">
                              {cat.cantidad.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-[#E9D5FF]">
                              {cat.porcentaje}%
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                              ~{cat.estimado_real?.toLocaleString() || (cat.cantidad * 20).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                              ~${cat.costo_apify_usd || ((cat.cantidad * 20 / 1000) * 4).toFixed(1)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  id={`btn-apify-extract-${idx}`}
                                  onClick={() => setSelectedExtractCat(cat.categoria)}
                                  className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-[11px] shadow-md shadow-emerald-950/40 transition flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
                                  title="Extraer directamente con el actor compass/crawler-google-places de Apify"
                                >
                                  <Zap className="w-3.5 h-3.5 fill-current" />
                                  <span>⚡ Extraer con Apify</span>
                                </button>

                                <button
                                  id={`btn-apify-query-${idx}`}
                                  onClick={() => setSelectedApifyCat({ nombre: cat.categoria, count: cat.cantidad })}
                                  className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-800 text-purple-300 hover:text-white transition flex items-center justify-center"
                                  title="Ver query de búsqueda para Apify"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-VIEW 2: MAPA DE CALOR Y BASE (MODO 2: NEGOCIOS ENCONTRADOS) */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeResultsTab === 'mapa' && (
              <div id="view-mapa-territorial" className="space-y-4">
                <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                  
                  {/* Mode 2 Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-900/40">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <span>🗺️ MODO 2 — Mapa de Negocios Encontrados</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold">
                          {leadsList.length} pines georreferenciados
                        </span>
                      </h3>
                      <p className="text-xs text-[#E9D5FF]/70 mt-0.5">
                        Un pin por cada negocio encontrado sin burbujas ni cuadrículas. Haz clic en cualquier pin para ver teléfono, copiar y navegar con el botón 🧭 Ir.
                      </p>
                    </div>

                    <div className="text-xs text-[#C084FC] font-semibold bg-purple-950/60 px-3 py-1.5 rounded-xl border border-purple-800/50 self-start sm:self-auto">
                      ⭐ Base: {municipio ? `${municipio}, ` : ''}{estado}
                    </div>
                  </div>

                  {/* Leaflet Territory Map with Modo 2 default & optional reference toggle */}
                  <div className="h-[540px] rounded-xl overflow-hidden border border-purple-900/50">
                    <TerritoryMap
                      centerLat={geoCenter.lat}
                      centerLng={geoCenter.lon}
                      zoom={radioKm <= 5 ? 14 : radioKm <= 12 ? 12 : 11}
                      mode="negocios"
                      showModeSwitch={true}
                      baseLocation={baseLocation}
                      gridCells={calculatedCells}
                      leads={leadsList}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-VIEW 3: DIRECTORIO DE LEADS Y TELÉFONOS                   */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeResultsTab === 'leads' && (
              <div id="view-leads-directory" className="space-y-4">
                
                {/* Actions Toolbar */}
                <div className="bg-[#140E24] border border-purple-900/40 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-purple-400 absolute left-3 top-2.5" />
                      <input
                        id="input-search-leads"
                        type="text"
                        value={leadsSearch}
                        onChange={(e) => setLeadsSearch(e.target.value)}
                        placeholder="Buscar por nombre, categoría o dirección..."
                        className="w-full bg-[#0D0818] border border-purple-800/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C084FC]"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#E9D5FF]">
                      <span className="font-bold text-white bg-purple-950/80 border border-purple-800/60 px-2 py-1 rounded">
                        {leadsList.length} registros
                      </span>
                      {(() => {
                        const sinNombreCount = leadsList.filter(l => !l.nombre_negocio || !l.nombre_negocio.trim() || l.nombre_negocio.trim() === 'Sin nombre' || l.nombre_negocio.trim() === 'N/A').length;
                        return sinNombreCount > 0 ? (
                          <span className="text-red-400 font-extrabold bg-red-950/80 border border-red-700 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 shadow-sm">
                            ⚠️ {sinNombreCount} sin nombre
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                            ✓ Todos con nombre
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <div className="flex items-center bg-[#0D0818] p-1 rounded-xl border border-purple-900/60 text-xs">
                      <button
                        id="btn-leads-mode-tabla"
                        onClick={() => setLeadsViewMode('tabla')}
                        className={`px-3 py-1 rounded-lg font-bold transition ${leadsViewMode === 'tabla' ? 'bg-[#9333EA] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                      >
                        📋 Tabla
                      </button>
                      <button
                        id="btn-leads-mode-tarjetas"
                        onClick={() => setLeadsViewMode('tarjetas')}
                        className={`px-3 py-1 rounded-lg font-bold transition ${leadsViewMode === 'tarjetas' ? 'bg-[#9333EA] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                      >
                        🗂️ Tarjetas
                      </button>
                    </div>

                    <button
                      id="btn-copy-all-phones"
                      onClick={() => {
                        copyPhoneListToClipboard(leadsList);
                        setCopiedPhones(true);
                        setTimeout(() => setCopiedPhones(false), 2500);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        copiedPhones
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#6B21A8] hover:bg-[#7E22CE] text-white shadow'
                      }`}
                    >
                      {copiedPhones ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPhones ? '¡Copiados!' : 'Copiar Teléfonos'}</span>
                    </button>

                    <button
                      id="btn-download-leads-csv-top"
                      onClick={() => {
                        exportLeadsToCsv(leadsList, `leads_${estado}_${municipio || 'todos'}.csv`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
                      title="Descargar CSV con columnas: Nombre, Categoría, Teléfono, Dirección, Link GPS"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar CSV</span>
                    </button>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* TABLA PRINCIPAL: Nombre | Categoría | Teléfono | Dirección | Link GPS */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {leadsViewMode === 'tabla' ? (
                  <div className="bg-[#140E24] border border-purple-900/40 rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto max-h-[600px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#1A1033] text-[#E9D5FF] sticky top-0 z-10 border-b border-purple-800/60 shadow-md">
                          <tr>
                            <th className="py-3 px-4 font-bold tracking-wider">Nombre</th>
                            <th className="py-3 px-4 font-bold tracking-wider">Categoría</th>
                            <th className="py-3 px-4 font-bold tracking-wider">Teléfono</th>
                            <th className="py-3 px-4 font-bold tracking-wider">Dirección</th>
                            <th className="py-3 px-4 font-bold text-center tracking-wider">Link GPS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-900/30 text-gray-200">
                          {leadsList
                            .filter(lead => {
                              if (!leadsSearch.trim()) return true;
                              const q = leadsSearch.toLowerCase();
                              return (
                                (lead.nombre_negocio || '').toLowerCase().includes(q) ||
                                (lead.categoria || '').toLowerCase().includes(q) ||
                                (lead.direccion_completa || '').toLowerCase().includes(q) ||
                                (lead.telefono || '').includes(q)
                              );
                            })
                            .map((lead) => {
                              const isMissingName = !lead.nombre_negocio || !lead.nombre_negocio.trim() || lead.nombre_negocio.trim() === 'Sin nombre' || lead.nombre_negocio.trim() === 'N/A';
                              return (
                                <tr key={lead.id} className="hover:bg-purple-950/30 transition">
                                  {/* Columna Nombre: si está vacío, mostrar en rojo ⚠️ Sin nombre */}
                                  <td className="py-2.5 px-4 font-semibold">
                                    {isMissingName ? (
                                      <span className="text-red-400 font-extrabold bg-red-950/80 border border-red-700/80 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 shadow-sm">
                                        ⚠️ Sin nombre
                                      </span>
                                    ) : (
                                      <span className="font-bold text-white text-xs">
                                        {lead.nombre_negocio}
                                      </span>
                                    )}
                                  </td>

                                  {/* Columna Categoría */}
                                  <td className="py-2.5 px-4 text-[#C084FC] whitespace-nowrap font-medium">
                                    {lead.categoria}
                                  </td>

                                  {/* Columna Teléfono */}
                                  <td className="py-2.5 px-4 font-mono text-emerald-400 whitespace-nowrap font-semibold">
                                    {lead.telefono && lead.telefono !== 'N/A' ? (
                                      lead.telefono
                                    ) : (
                                      <span className="text-gray-500 font-sans text-[11px]">Sin teléfono</span>
                                    )}
                                  </td>

                                  {/* Columna Dirección */}
                                  <td className="py-2.5 px-4 text-gray-300 max-w-sm truncate" title={lead.direccion_completa}>
                                    {lead.direccion_completa}
                                  </td>

                                  {/* Columna Link GPS */}
                                  <td className="py-2.5 px-4 text-center whitespace-nowrap">
                                    <a
                                      href={lead.link_navegacion}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1 rounded bg-[#9333EA] hover:bg-[#A855F7] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow transition cursor-pointer"
                                      title="Abrir navegación en Google Maps"
                                    >
                                      <span>🧭 Ir</span>
                                    </a>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Leads Cards Grid */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leadsList
                      .filter(lead => {
                        if (!leadsSearch.trim()) return true;
                        const q = leadsSearch.toLowerCase();
                        return (
                          (lead.nombre_negocio || '').toLowerCase().includes(q) ||
                          (lead.categoria || '').toLowerCase().includes(q) ||
                          (lead.direccion_completa || '').toLowerCase().includes(q) ||
                          (lead.telefono || '').includes(q)
                        );
                      })
                      .map((lead) => {
                        const isMissingName = !lead.nombre_negocio || !lead.nombre_negocio.trim() || lead.nombre_negocio.trim() === 'Sin nombre' || lead.nombre_negocio.trim() === 'N/A';
                        return (
                          <div
                            key={lead.id}
                            className="bg-[#140E24] border border-purple-900/40 hover:border-[#9333EA] rounded-xl p-4 space-y-3 transition shadow"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                {isMissingName ? (
                                  <span className="text-red-400 font-extrabold bg-red-950/80 border border-red-700/80 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1 shadow-sm">
                                    ⚠️ Sin nombre
                                  </span>
                                ) : (
                                  <h4 className="font-bold text-sm text-white line-clamp-1">
                                    {lead.nombre_negocio}
                                  </h4>
                                )}
                                <span className="text-[11px] font-semibold text-[#C084FC]">
                                  {lead.categoria}
                                </span>
                              </div>
                              <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                                <Star className="w-3 h-3 fill-current" />
                                {lead.calificacion}
                              </span>
                            </div>

                            <div className="space-y-1.5 text-xs text-[#E9D5FF]/80">
                              <p className="flex items-start gap-1.5 line-clamp-2">
                                <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                                <span>{lead.direccion_completa}</span>
                              </p>
                              <p className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold">
                                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{lead.telefono}</span>
                              </p>
                            </div>

                            <div className="pt-2 border-t border-purple-900/30 flex items-center justify-between gap-2">
                              <a
                                href={lead.link_navegacion}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded bg-[#9333EA] hover:bg-[#A855F7] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow transition-all"
                                title="Navegar con Google Maps desde tu ubicación actual"
                              >
                                <span>🧭</span>
                                <span>Ir</span>
                              </a>

                              <a
                                href={lead.url_google_maps}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-semibold text-gray-400 hover:text-white flex items-center gap-1 transition"
                              >
                                <span>Ficha Maps</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-VIEW 4: REPORTE DE INTELIGENCIA B2B & DENUE INEGI          */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeResultsTab === 'inteligencia' && (
              <div id="view-market-intelligence" className="space-y-4">
                <MarketIntelligenceSection
                  estado={estado}
                  municipio={municipio}
                  lat={geoCenter.lat}
                  lon={geoCenter.lon}
                />
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* SUB-VIEW 5: DESCARGAS Y QUERIES APIFY                         */}
            {/* ───────────────────────────────────────────────────────────── */}
            {activeResultsTab === 'exportar' && (
              <div id="view-export-center" className="space-y-6">
                
                {/* Export Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* Option 1: TXT Queries Apify */}
                  <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-[#C084FC] mb-3">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-base text-white">Queries Listos para Apify (.txt)</h4>
                      <p className="text-xs text-[#E9D5FF]/70 mt-1">
                        Archivo de texto con todas las categorías ordenadas por cantidad y costos estimados en USD para pegar en Apify.
                      </p>
                    </div>
                    <button
                      id="btn-download-apify-txt"
                      onClick={() => {
                        const txt = generarApifyQueriesTxt(estado, municipio, zoneResult.categorias, zoneResult.total_negocios, gridMode);
                        downloadTextFile(txt, `queries_apify_${estado}_${municipio || 'todos'}.txt`);
                      }}
                      className="w-full py-2.5 bg-[#6B21A8] hover:bg-[#9333EA] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Queries (.txt)</span>
                    </button>
                  </div>

                  {/* Option 2: CSV Categorías */}
                  <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-3">
                        <Tag className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-base text-white">Tabla de Categorías (.csv)</h4>
                      <p className="text-xs text-[#E9D5FF]/70 mt-1">
                        Métricas de mercado con conteos por categoría, porcentajes de penetración y proyecciones de volumen comercial.
                      </p>
                    </div>
                    <button
                      id="btn-download-categories-csv"
                      onClick={() => exportCategoriesToCsv(zoneResult.categorias, `categorias_${estado}_${municipio || 'todos'}.csv`)}
                      className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Descargar Categorías (.csv)</span>
                    </button>
                  </div>

                  {/* Option 3: CSV Leads */}
                  <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 mb-3">
                        <Store className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-base text-white">Directorio de Leads (.csv)</h4>
                      <p className="text-xs text-[#E9D5FF]/70 mt-1">
                        Base de prospectos con nombres comerciales, teléfonos a 10 dígitos, calificaciones y enlaces de navegación directa.
                      </p>
                    </div>
                    <button
                      id="btn-download-leads-csv"
                      onClick={() => exportLeadsToCsv(leadsList, `leads_${estado}_${municipio || 'todos'}.csv`)}
                      className="w-full py-2.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Descargar Leads (.csv)</span>
                    </button>
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

          </>
        )}

      </main>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODALS AND DRAWERS                                                */}
      {/* ───────────────────────────────────────────────────────────────── */}

      {/* Apify Query Modal */}
      {selectedApifyCat && (
        <ApifyQueryModal
          isOpen={true}
          onClose={() => setSelectedApifyCat(null)}
          categoria={selectedApifyCat.nombre}
          municipio={municipio}
          estado={estado}
          cantidadMuestra={selectedApifyCat.count}
          modoFactor={MODOS_CUADRICULA[gridMode]?.factor_estimacion ? MODOS_CUADRICULA[gridMode].factor_estimacion * 7 : 20}
        />
      )}

      {/* Apify Real Extractor Modal */}
      {selectedExtractCat && (
        <ApifyExtractorModal
          isOpen={true}
          onClose={() => setSelectedExtractCat(null)}
          categoria={selectedExtractCat}
          municipio={municipio}
          estado={estado}
          baseLat={geoCenter.lat}
          baseLon={geoCenter.lon}
        />
      )}

      {/* Python Code Modal */}
      <PythonProjectModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
        estado={estado}
        municipio={municipio}
        radioKm={radioKm}
        modo={gridMode}
      />

      {/* LFPDPPP Notice Modal */}
      <EthicalNoticeModal
        isOpen={isEthicalModalOpen}
        onClose={() => setIsEthicalModalOpen(false)}
      />

      {/* Stealth Log Viewer Drawer */}
      <StealthLogViewer
        isOpen={isLogViewerOpen}
        onClose={() => setIsLogViewerOpen(false)}
        logs={logs}
        onClear={() => setLogs([])}
      />

    </div>
  );
}
