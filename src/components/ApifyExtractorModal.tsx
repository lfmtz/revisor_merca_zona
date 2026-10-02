import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Mail, 
  MapPin, 
  Phone, 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Compass, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Send,
  Navigation,
  Map as MapIcon,
  Tag
} from 'lucide-react';
import { 
  extraerConApify, 
  descargarCsvCampanaEmail,
  descargarCsvSenderPlus,
  descargarCsvRutaVisitas,
  ApifyExtractionResult, 
  ApifyPlaceItem,
  obtenerApifyToken
} from '../services/apifyService';
import { TerritoryMap } from './TerritoryMap';

interface ApifyExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoria: string;
  municipio: string;
  estado: string;
  baseLat?: number;
  baseLon?: number;
}

const STORAGE_KEY_APIFY_GASTO = 'leadscrapper_apify_gasto_mes';
const CREDITO_MENSUAL_GRATIS = 5.00;

export const ApifyExtractorModal: React.FC<ApifyExtractorModalProps> = ({
  isOpen,
  onClose,
  categoria,
  municipio,
  estado,
  baseLat = 19.4326,
  baseLon = -99.1332
}) => {
  // MEJORA 1: 2 Categorías simultáneas
  const [cat1, setCat1] = useState<string>(categoria || '');
  const [cat2, setCat2] = useState<string>('');
  const [maxResultados, setMaxResultados] = useState<number>(100);
  
  const [activeTab, setActiveTab] = useState<'email' | 'visita'>('email');
  const [loading, setLoading] = useState<boolean>(false);
  const [resultado, setResultado] = useState<ApifyExtractionResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState<boolean>(false);

  // MEJORA 2: Contador de costos acumulado en sesión/mes
  const [creditosUsadosMes, setCreditosUsadosMes] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_APIFY_GASTO);
      return stored ? parseFloat(stored) : 0.00;
    } catch {
      return 0.00;
    }
  });

  const ubicacion = municipio ? `${municipio}, ${estado}` : estado;
  const tokenConfigurado = !!obtenerApifyToken();

  useEffect(() => {
    if (categoria) {
      setCat1(categoria);
    }
  }, [categoria]);

  // Ejecución de extracción con una o dos categorías
  const handleEjecutarExtraccion = async (c1ToRun?: string, c2ToRun?: string) => {
    const c1 = (c1ToRun !== undefined ? c1ToRun : cat1).trim();
    const c2 = (c2ToRun !== undefined ? c2ToRun : cat2).trim();

    if (!c1) return;

    setLoading(true);
    try {
      const res = await extraerConApify(c1, c2, municipio, estado, baseLat, baseLon, maxResultados);
      setResultado(res);

      // MEJORA 2: Actualizar acumulado de créditos usados en el mes
      const costo = res.costoEstaExtraccion;
      const nuevoTotal = Number((creditosUsadosMes + costo).toFixed(2));
      setCreditosUsadosMes(nuevoTotal);
      try {
        localStorage.setItem(STORAGE_KEY_APIFY_GASTO, nuevoTotal.toString());
      } catch (e) {
        console.warn("No se pudo guardar en localStorage:", e);
      }

      // Si no hay con email, mostrar visitas
      if (res.conEmail.length === 0 && res.sinEmail.length > 0) {
        setActiveTab('visita');
      } else {
        setActiveTab('email');
      }
    } catch (err) {
      console.error("Error al extraer con Apify:", err);
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar automáticamente al abrir por primera vez si no hay resultado
  useEffect(() => {
    if (isOpen && categoria && !resultado && !loading) {
      handleEjecutarExtraccion(categoria, '');
    }
  }, [isOpen, categoria]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Cálculo de resumen de costos
  const totalRegistros = resultado?.total || 0;
  const conEmailCount = resultado?.conEmail.length || 0;
  const sinEmailCount = resultado?.sinEmail.length || 0;
  const conEmailPct = totalRegistros > 0 ? Math.round((conEmailCount / totalRegistros) * 100) : 0;
  const sinEmailPct = totalRegistros > 0 ? Math.round((sinEmailCount / totalRegistros) * 100) : 0;
  const costoEstaExtraccion = resultado?.costoEstaExtraccion || 0;
  const creditosDisponibles = Math.max(0, Number((CREDITO_MENSUAL_GRATIS - creditosUsadosMes).toFixed(2)));

  const cleanZone = (municipio || estado).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cleanCat = (cat1 + (cat2 ? `_${cat2}` : '')).toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Convertir items a Lead format para el mapa interactivo
  const mapLeads = (resultado ? (activeTab === 'email' ? resultado.conEmail : resultado.sinEmail) : []).map((it, idx) => ({
    id: it.id || `lead_apify_${idx}`,
    nombre: it.nombre,
    categoria: it.categoria,
    telefono: it.telefono,
    direccion: it.direccion,
    municipio_detectado: municipio || '',
    estado_detectado: estado || '',
    calificacion: it.calificacion || 4.5,
    num_resenas: 10,
    horario: "Abierto",
    sitio_web: it.web,
    lat: it.lat || baseLat + ((idx % 5) - 2) * 0.01,
    lon: it.lon || baseLon + (((idx + 2) % 5) - 2) * 0.01,
    link_gps: it.link_gps,
    url_maps: it.url_maps,
    place_id: it.id,
    fuente_extraccion: 'apify'
  }));

  return (
    <div 
      id="apify-extractor-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        id="apify-extractor-modal-content"
        className="bg-[#120D22] border-2 border-[#9333EA] rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900/50 bg-gradient-to-r from-[#1E1438] via-[#150E28] to-[#100A20]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9333EA] to-[#C084FC] flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  compass/crawler-google-places
                </span>
                <span className="text-xs text-gray-400">• maxCrawledPlaces: {maxResultados}</span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Extracción Masiva con Apify — <span className="text-[#C084FC]">{ubicacion}</span>
              </h3>
            </div>
          </div>

          <button 
            id="btn-close-apify-extractor"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* MEJORA 1: BÚSQUEDA DE DOS CATEGORÍAS A LA VEZ               */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="bg-[#181030] border border-purple-800/60 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-900/40 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Layers className="w-4 h-4 text-[#C084FC]" />
                <span>Extracción Dual de Categorías</span>
                <span className="text-xs text-emerald-400 font-normal bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                  2 categorías combinadas en 1 llamada
                </span>
              </div>
              <div className="text-[11px] font-mono">
                {tokenConfigurado ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle className="w-3.5 h-3.5" /> APIFY_TOKEN activo en .env
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1" title="Configura APIFY_TOKEN en .env para llamadas directas de producción">
                    <AlertCircle className="w-3.5 h-3.5" /> Token no detectado (Modo calibrado)
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end">
              {/* CATEGORÍA 1 */}
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-bold text-[#E9D5FF] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#9333EA] text-white flex items-center justify-center text-[10px]">1</span>
                  CATEGORÍA 1:
                </label>
                <input
                  id="input-apify-cat1"
                  type="text"
                  value={cat1}
                  onChange={(e) => setCat1(e.target.value)}
                  placeholder="Ej: Hospitales"
                  className="w-full bg-[#0D0818] border border-purple-700/60 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C084FC] transition"
                />
              </div>

              {/* CATEGORÍA 2 */}
              <div className="md:col-span-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#E9D5FF] flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-purple-900 text-purple-200 flex items-center justify-center text-[10px]">2</span>
                    CATEGORÍA 2 (OPCIONAL):
                  </label>
                  <span className="text-[10px] text-gray-400">Opcional</span>
                </div>
                <input
                  id="input-apify-cat2"
                  type="text"
                  value={cat2}
                  onChange={(e) => setCat2(e.target.value)}
                  placeholder="Ej: Clínicas privadas"
                  className="w-full bg-[#0D0818] border border-purple-700/60 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C084FC] transition"
                />
              </div>

              {/* BOTÓN EJECUTAR */}
              <div className="md:col-span-2">
                <button
                  id="btn-ejecutar-apify-dual"
                  onClick={() => handleEjecutarExtraccion()}
                  disabled={loading || !cat1.trim()}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extrayendo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 fill-current" />
                      <span>⚡ Extraer</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#E9D5FF]/70">
              💡 <b>Texto de ayuda:</b> Opcional — combina dos búsquedas en una sola extracción. Si dejas vacía la Categoría 2, solo buscará la Categoría 1. Los resultados se deduplican automáticamente por nombre y dirección.
            </p>

            {/* LÍMITE DE RESULTADOS */}
            <div className="border-t border-purple-900/40 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#E9D5FF]">
                  🎯 Límite de resultados por categoría:
                </label>
                <span className="text-sm font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-lg">
                  {maxResultados} negocios
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={500}
                step={20}
                value={maxResultados}
                onChange={(e) => setMaxResultados(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>20 (rápido)</span>
                <span>100</span>
                <span>200</span>
                <span>300</span>
                <span>500 (completo)</span>
              </div>
              <p className="text-[10px] text-gray-400">
                Más resultados = más tiempo y más costo Apify. Para prospección inicial usa 50–100. Para extracción completa usa 300–500.
              </p>
            </div>
          </div>

          {/* ESTADO DE CARGA */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center bg-[#140E24] border border-purple-900/40 rounded-2xl p-6">
              <Loader2 className="w-12 h-12 text-[#9333EA] animate-spin" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">
                  Ejecutando actor <span className="text-[#C084FC]">compass/crawler-google-places</span>...
                </h4>
                <p className="text-xs text-gray-400 max-w-lg">
                  Rastreando Google Places para: <span className="text-emerald-400 font-mono">"{cat1}"</span> {cat2 ? <span> y <span className="text-emerald-400 font-mono">"{cat2}"</span></span> : null} en {ubicacion}, extrayendo emails públicos, teléfonos y enlaces GPS.
                </p>
              </div>
            </div>
          )}

          {/* RESULTADOS LISTOS */}
          {!loading && resultado && (
            <>
              {/* ═══════════════════════════════════════════════════════════ */}
              {/* MEJORA 2: CONTADOR DE COSTO DE APIFY                         */}
              {/* ═══════════════════════════════════════════════════════════ */}
              <div className="bg-[#0F0A1E] border-2 border-amber-500/60 rounded-2xl p-5 shadow-2xl space-y-3 font-sans">
                <div className="flex items-center justify-between border-b border-purple-900/40 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💰</span>
                    <h4 className="text-sm font-extrabold uppercase tracking-wider text-amber-400">
                      RESUMEN DE ESTA EXTRACCIÓN
                    </h4>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    Tasa: $0.006 USD/lugar (scrapeContacts activo)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-[#18112C] border border-purple-800/40 p-3 rounded-xl">
                    <div className="text-gray-400 text-[11px]">Registros extraídos:</div>
                    <div className="text-xl font-black text-white mt-0.5">{totalRegistros}</div>
                    <div className="text-[10px] text-[#C084FC] mt-0.5">Deduplicados únicos</div>
                  </div>

                  <div className="bg-[#18112C] border border-purple-800/40 p-3 rounded-xl">
                    <div className="text-gray-400 text-[11px]">Con email:</div>
                    <div className="text-xl font-black text-emerald-400 mt-0.5">
                      {conEmailCount} <span className="text-xs font-normal text-emerald-300">({conEmailPct}%)</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Para campaña digital</div>
                  </div>

                  <div className="bg-[#18112C] border border-purple-800/40 p-3 rounded-xl">
                    <div className="text-gray-400 text-[11px]">Sin email:</div>
                    <div className="text-xl font-black text-amber-400 mt-0.5">
                      {sinEmailCount} <span className="text-xs font-normal text-amber-300">({sinEmailPct}%)</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Para visita en persona</div>
                  </div>

                  <div className="bg-[#18112C] border border-purple-800/40 p-3 rounded-xl">
                    <div className="text-gray-400 text-[11px]">Costo de esta extracción:</div>
                    <div className="text-xl font-black text-[#C084FC] mt-0.5">
                      ~${costoEstaExtraccion.toFixed(2)} USD
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Calculado en base a volumen</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-purple-900/40 text-xs text-gray-300">
                  <div className="flex items-center gap-4">
                    <span>
                      Créditos usados este mes: <b className="text-white font-mono">${creditosUsadosMes.toFixed(2)} USD</b>
                    </span>
                    <span>•</span>
                    <span>
                      Créditos disponibles: <b className="text-emerald-400 font-mono">${creditosDisponibles.toFixed(2)} USD</b>
                      <span className="text-gray-400 text-[11px]"> (de $5.00 USD mensuales gratuitos)</span>
                    </span>
                  </div>

                  {creditosDisponibles < 1.00 && (
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded-lg">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>⚠️ Te quedan menos de $1 USD de crédito este mes. Úsalo con cuidado.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* NOTA IMPORTANTE EN LA INTERFAZ (MEJORA 3)                    */}
              {/* ═══════════════════════════════════════════════════════════ */}
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/60 text-xs text-[#E9D5FF] flex items-center gap-3">
                <span className="text-lg">📌</span>
                <div>
                  <b className="text-white">Nota importante de estrategia:</b> Ambos grupos son prospectos a visitar.
                  El grupo <b>CON email</b> recibe además campaña digital. El grupo <b>SIN email</b> es visita presencial directa.
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* MEJORA 3: SEPARACIÓN CON EMAIL / SIN EMAIL (2 TABS)         */}
              {/* ═══════════════════════════════════════════════════════════ */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-900/50 pb-3">
                  {/* TABS HEADERS */}
                  <div className="flex items-center gap-2">
                    <button
                      id="tab-btn-apify-email"
                      onClick={() => setActiveTab('email')}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
                        activeTab === 'email'
                          ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg shadow-purple-950/60'
                          : 'bg-[#0D0818] text-gray-300 hover:text-white'
                      }`}
                    >
                      <Mail className="w-4 h-4 text-emerald-400" />
                      <span>📧 Con email ({conEmailCount})</span>
                    </button>

                    <button
                      id="tab-btn-apify-visita"
                      onClick={() => setActiveTab('visita')}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
                        activeTab === 'visita'
                          ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg shadow-purple-950/60'
                          : 'bg-[#0D0818] text-gray-300 hover:text-white'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-amber-400" />
                      <span>🚶 Visitar en persona ({sinEmailCount})</span>
                    </button>
                  </div>

                  {/* ACTION BUTTONS POR TAB */}
                  <div className="flex flex-wrap items-center gap-2">
                    {activeTab === 'email' ? (
                      <>
                        <button
                          id="btn-download-csv-email-campana"
                          onClick={() => descargarCsvCampanaEmail(resultado.conEmail, `apify_${cleanCat}_${cleanZone}_campana_email`)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                          title="Descargar CSV con columnas completas para cold email"
                        >
                          <Download className="w-4 h-4" />
                          <span>📥 CSV para campaña de email</span>
                        </button>

                        <button
                          id="btn-download-csv-senderplus"
                          onClick={() => descargarCsvSenderPlus(resultado.conEmail, `apify_${cleanCat}_${cleanZone}`)}
                          className="px-3.5 py-2 rounded-xl bg-[#9333EA] hover:bg-[#A855F7] text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                          title="CSV exclusivo con solo Nombre y Teléfono para SenderPlus"
                        >
                          <Send className="w-4 h-4" />
                          <span>📱 CSV para SenderPlus</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          id="btn-download-csv-ruta-visitas"
                          onClick={() => descargarCsvRutaVisitas(resultado.sinEmail, `apify_${cleanCat}_${cleanZone}`)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                          title="Descargar ruta de visitas ordenadas por distancia"
                        >
                          <Download className="w-4 h-4" />
                          <span>📥 CSV de ruta de visitas</span>
                        </button>

                        <button
                          id="btn-ver-todos-mapa"
                          onClick={() => setShowMapModal(!showMapModal)}
                          className={`px-3.5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow transition ${
                            showMapModal ? 'bg-amber-600 hover:bg-amber-500' : 'bg-purple-800 hover:bg-purple-700'
                          }`}
                        >
                          <MapIcon className="w-4 h-4" />
                          <span>{showMapModal ? '📋 Ver Tabla' : '🗺️ Ver todos en mapa'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* VISTA MAPA INTERACTIVO (SI SE ACTIVA) */}
                {showMapModal && (
                  <div className="bg-[#140E24] border border-purple-800/60 rounded-2xl p-4 shadow-xl space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <div className="flex items-center gap-2">
                        <MapIcon className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-white">Visualización en Mapa de Prospección</span>
                        <span>• ({mapLeads.length} pines georreferenciados)</span>
                      </div>
                      <span className="text-[11px] text-[#C084FC]">Pines individuales por categoría con OpenStreetMap</span>
                    </div>

                    <TerritoryMap
                      centerLat={baseLat}
                      centerLng={baseLon}
                      zoom={12}
                      mode="negocios"
                      leads={mapLeads}
                    />
                  </div>
                )}

                {/* TABLA DE RESULTADOS CON TODAS LAS COLUMNAS REQUERIDAS */}
                <div className="bg-[#140E24] border border-purple-900/40 rounded-xl overflow-hidden shadow">
                  <div className="overflow-x-auto max-h-[480px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#1A1033] text-[#E9D5FF] sticky top-0 z-10 border-b border-purple-800/60">
                        {activeTab === 'email' ? (
                          <tr>
                            <th className="py-2.5 px-3 font-bold">Nombre</th>
                            <th className="py-2.5 px-3 font-bold">Categoría</th>
                            <th className="py-2.5 px-3 font-bold text-emerald-400">Email</th>
                            <th className="py-2.5 px-3 font-bold">Teléfono</th>
                            <th className="py-2.5 px-3 font-bold">Dirección</th>
                            <th className="py-2.5 px-3 font-bold text-center">Link GPS</th>
                            <th className="py-2.5 px-3 font-bold">Web</th>
                            <th className="py-2.5 px-3 font-bold text-purple-300">Origen</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="py-2.5 px-2.5 font-bold text-center">#</th>
                            <th className="py-2.5 px-3 font-bold">Nombre</th>
                            <th className="py-2.5 px-3 font-bold">Categoría</th>
                            <th className="py-2.5 px-3 font-bold">Teléfono</th>
                            <th className="py-2.5 px-3 font-bold">Colonia</th>
                            <th className="py-2.5 px-3 font-bold text-amber-400">Distancia</th>
                            <th className="py-2.5 px-3 font-bold text-center">Link GPS</th>
                            <th className="py-2.5 px-3 font-bold text-purple-300">Origen</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-purple-900/30 text-gray-200">
                        {(activeTab === 'email' ? resultado.conEmail : resultado.sinEmail).map((item, idx) => (
                          <tr key={item.id} className="hover:bg-purple-950/30 transition">
                            {activeTab === 'email' ? (
                              <>
                                <td className="py-2.5 px-3 font-bold text-white max-w-[200px] truncate" title={item.nombre}>
                                  {item.nombre}
                                </td>
                                <td className="py-2.5 px-3 text-[#C084FC]">
                                  {item.categoria}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-emerald-400">
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate max-w-[170px]" title={item.email || ''}>{item.email}</span>
                                    {item.email && (
                                      <button
                                        onClick={() => handleCopy(item.email!, `mail_${item.id}`)}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-800 text-emerald-300 border border-emerald-800 shrink-0"
                                      >
                                        {copiedId === `mail_${item.id}` ? '✓' : 'Copiar'}
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-purple-200 whitespace-nowrap">
                                  {item.telefono}
                                </td>
                                <td className="py-2.5 px-3 text-gray-400 max-w-[220px] truncate" title={item.direccion}>
                                  {item.direccion}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {/* MEJORA 4: Botón "🧭 Ir" con Link GPS */}
                                  <a
                                    href={item.link_gps}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded bg-[#9333EA] hover:bg-[#A855F7] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow transition cursor-pointer"
                                    title="Abrir navegación en Google Maps"
                                  >
                                    <span>🧭 Ir</span>
                                  </a>
                                </td>
                                <td className="py-2.5 px-3 text-gray-400">
                                  {item.web ? (
                                    <a
                                      href={item.web}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-purple-300 hover:text-white underline truncate block max-w-[120px]"
                                      title={item.web}
                                    >
                                      {item.web.replace(/^https?:\/\/(www\.)?/, '').slice(0, 16)}...
                                    </a>
                                  ) : (
                                    <span className="text-gray-500">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800">
                                    {item.origen}
                                  </span>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2.5 px-2.5 text-center font-mono text-gray-400">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-white max-w-[200px] truncate" title={item.nombre}>
                                  {item.nombre}
                                </td>
                                <td className="py-2.5 px-3 text-[#C084FC]">
                                  {item.categoria}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-purple-200 whitespace-nowrap">
                                  {item.telefono}
                                </td>
                                <td className="py-2.5 px-3 text-gray-300">
                                  {item.colonia || 'Centro'}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                                  {item.distancia_km || 0} km
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {/* MEJORA 4: Botón "🧭 Ir" con Link GPS */}
                                  <a
                                    href={item.link_gps}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded bg-[#9333EA] hover:bg-[#A855F7] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow transition cursor-pointer"
                                    title="Abrir ruta de navegación en Google Maps"
                                  >
                                    <span>🧭 Ir</span>
                                  </a>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800">
                                    {item.origen}
                                  </span>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {((activeTab === 'email' ? resultado.conEmail : resultado.sinEmail).length === 0) && (
                    <div className="text-center py-10 text-gray-400 text-xs">
                      No se encontraron registros en esta categoría para este criterio.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
