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
  verificarApifyConfigurado,
  obtenerSaldoApify,
  avisarSaldoCambiado,
  SaldoApify,
  PUNTO_PARTIDA
} from '../services/apifyService';
import { TerritoryMap } from './TerritoryMap';
import {
  obtenerDenueDelGiro, cruzar, aplicarHistorial, descargarConsolidado, ResultadoCruce,
  claveBusqueda, busquedaPrevia, guardarBusqueda, totalEnHistorial, borrarHistorial,
} from '../services/cruce';
import { geocodificarZona } from '../utils/gridEngine';

interface ApifyExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoria: string;
  municipio: string;
  estado: string;
  baseLat?: number;
  baseLon?: number;
  /** Si viene, se busca en este círculo (alrededor de mi trabajo) y no por municipio */
  circulo?: { lat: number; lon: number; radioKm: number };
}


export const ApifyExtractorModal: React.FC<ApifyExtractorModalProps> = ({
  isOpen,
  onClose,
  categoria,
  municipio,
  estado,
  baseLat = PUNTO_PARTIDA.lat,
  baseLon = PUNTO_PARTIDA.lon,
  circulo
}) => {
  // MEJORA 1: 2 Categorías simultáneas
  const [cat1, setCat1] = useState<string>(categoria || '');
  const [cat2, setCat2] = useState<string>('');
  const [maxResultados, setMaxResultados] = useState<number>(100);
  
  const [activeTab, setActiveTab] = useState<'email' | 'visita' | 'consolidada'>('visita');
  const [cruce, setCruce] = useState<ResultadoCruce | null>(null);
  const [cruceEstado, setCruceEstado] = useState<string>('');
  const [historialPorId, setHistorialPorId] = useState<Record<string, string>>({});
  const [soloNuevos, setSoloNuevos] = useState<boolean>(false);
  const [filtroFuente, setFiltroFuente] = useState<string>('todas');
  const [loading, setLoading] = useState<boolean>(false);
  const [resultado, setResultado] = useState<ApifyExtractionResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<string>('');
  const [buscarCorreos, setBuscarCorreos] = useState<boolean>(true);
  const [soloMunicipio, setSoloMunicipio] = useState<boolean>(true);
  const [tokenConfigurado, setTokenConfigurado] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) verificarApifyConfigurado().then(setTokenConfigurado);
  }, [isOpen]);

  // Saldo REAL del mes en Apify
  const [saldo, setSaldo] = useState<SaldoApify | null>(null);
  const refrescarSaldo = () => obtenerSaldoApify().then(setSaldo).catch(() => setSaldo(null));
  useEffect(() => {
    if (isOpen) refrescarSaldo();
  }, [isOpen]);
  const costoMaximo = Number((maxResultados * (cat2.trim() ? 2 : 1) * (buscarCorreos ? 0.006 : 0.004)).toFixed(2));
  const saldoInsuficiente = !!saldo && costoMaximo > saldo.disponibleUsd;

  const ubicacion = circulo
    ? `${circulo.radioKm} km alrededor de mi trabajo`
    : (municipio ? `${municipio}, ${estado}` : estado);

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
    const centroBusq = circulo ? { lat: circulo.lat, lon: circulo.lon } : geocodificarZona(estado, municipio);
    const radioBusq = circulo ? circulo.radioKm : geocodificarZona(estado, municipio).radio_km;
    const claveB = claveBusqueda([c1, c2], centroBusq.lat, centroBusq.lon, radioBusq);
    const previa = busquedaPrevia(claveB);
    if (previa && !window.confirm(
      `Ya hiciste esta misma búsqueda (${[c1, c2].filter(Boolean).join(' + ')}) en esta zona el ${previa}.\n` +
      `Google Maps cambia poco de un día a otro: probablemente te traerá casi los mismos negocios y se volverá a cobrar.\n\n¿Quieres repetirla?`
    )) return;
    if (saldoInsuficiente && !window.confirm(
      `Esta extracción puede costar hasta USD ${costoMaximo.toFixed(2)} y te quedan USD ${saldo!.disponibleUsd.toFixed(2)} este mes.\n` +
      `Apify se detendrá al llegar al límite y podrías recibir menos resultados. ¿Continuar?`
    )) return;

    setLoading(true);
    setErrorMsg(null);
    setProgreso('Iniciando extracción en Apify...');
    try {
      const res = await extraerConApify(c1, c2, municipio, estado, baseLat, baseLon, maxResultados, {
        correos: buscarCorreos,
        soloMunicipio,
        circulo,
        onProgreso: (st, seg) => setProgreso(
          st === 'SUCCEEDED' ? 'Descargando resultados...' : `Apify trabajando (${st}) · ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')} min`
        ),
      });
      setResultado(res);
      guardarBusqueda(claveB);

      // Cruce con INEGI (gratis) + historial de descargas
      setCruce(null);
      setCruceEstado('Cruzando con INEGI (DENUE)...');
      let denue: Awaited<ReturnType<typeof obtenerDenueDelGiro>> = [];
      try {
        denue = await obtenerDenueDelGiro([c1, c2], centroBusq, radioBusq, circulo ? '' : municipio);
        setCruceEstado('');
      } catch (e: any) {
        setCruceEstado(`No se pudo consultar INEGI para el cruce: ${e?.message || e}. La base consolidada solo trae los datos de Google.`);
      }
      const cr = cruzar([...res.conEmail, ...res.sinEmail], denue, [c1, c2]);
      aplicarHistorial(cr.registros);
      const mapa: Record<string, string> = {};
      cr.registros.forEach(r => { mapa[r.clave] = r.historial; });
      setHistorialPorId(mapa);
      setCruce(cr);

      // Actualizar saldo real (aquí y en el indicador de la barra superior)
      refrescarSaldo();
      avisarSaldoCambiado();

      // Si no hay con email, mostrar visitas
      setActiveTab('visita');
    } catch (err: any) {
      console.error("Error al extraer con Apify:", err);
      setErrorMsg(err?.message || 'Error desconocido al extraer con Apify.');
    } finally {
      setLoading(false);
      setProgreso('');
    }
  };

  // Ya NO se ejecuta automáticamente al abrir: cada extracción cuesta saldo de Apify.

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

  const cleanZone = (municipio || estado).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cleanCat = (cat1 + (cat2 ? `_${cat2}` : '')).toLowerCase().replace(/[^a-z0-9]/g, '_');

  const esNuevo = (id: string) => (historialPorId[`google:${id}`] || '').startsWith('🆕');
  const todosPorDistancia = resultado
    ? [...resultado.conEmail, ...resultado.sinEmail].sort((a, b) => (a.distancia_km ?? 1e9) - (b.distancia_km ?? 1e9))
    : [];
  const listaVisita = soloNuevos ? todosPorDistancia.filter(i => esNuevo(i.id)) : todosPorDistancia;
  const listaEmail = resultado ? (soloNuevos ? resultado.conEmail.filter(i => esNuevo(i.id)) : resultado.conEmail) : [];
  const listaTabla = activeTab === 'email' ? listaEmail : listaVisita;
  const registrosConsolidados = (cruce?.registros || []).filter(r =>
    (!soloNuevos || r.historial.startsWith('🆕')) && (filtroFuente === 'todas' || r.fuente === filtroFuente));

  // Convertir items a Lead format para el mapa interactivo
  const mapLeads = listaTabla.map((it, idx) => ({
    id: it.id || `lead_apify_${idx}`,
    nombre: it.nombre,
    categoria: it.categoria,
    telefono: it.telefono,
    direccion: it.direccion,
    municipio_detectado: municipio || '',
    estado_detectado: estado || '',
    calificacion: it.calificacion || 0,
    num_resenas: 0,
    horario: "Abierto",
    sitio_web: it.web,
    lat: it.lat as number,
    lon: it.lon as number,
    link_gps: it.link_gps,
    url_maps: it.url_maps,
    place_id: it.id,
    fuente_extraccion: 'apify'
  })).filter(l => typeof l.lat === 'number' && typeof l.lon === 'number');

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
                {tokenConfigurado === null ? (
                  <span className="text-gray-400">Verificando conexión con Apify...</span>
                ) : tokenConfigurado ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle className="w-3.5 h-3.5" /> Apify conectado (datos reales)
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1" title="Agrega APIFY_TOKEN en Vercel → Settings → Environments → Environment Variables">
                    <AlertCircle className="w-3.5 h-3.5" /> Falta APIFY_TOKEN en Vercel
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
              <label className="flex items-center gap-2 text-xs text-[#E9D5FF] pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={buscarCorreos}
                  onChange={(e) => setBuscarCorreos(e.target.checked)}
                  className="accent-purple-500"
                />
                Buscar correos en los sitios web (más lento, ~USD 6 en vez de ~USD 4 por cada 1,000)
              </label>
              {municipio && !circulo && (
                <label className="flex items-center gap-2 text-xs text-[#E9D5FF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soloMunicipio}
                    onChange={(e) => setSoloMunicipio(e.target.checked)}
                    className="accent-purple-500"
                  />
                  Solo negocios dentro de {municipio} (quitar los de municipios vecinos)
                </label>
              )}
              <p className="text-[11px] text-amber-300">
                💰 Costo máximo aprox.: USD {costoMaximo.toFixed(2)}
                {saldo && <> · Saldo disponible: <b>USD {saldo.disponibleUsd.toFixed(2)}</b></>}
                {' · '}📌 Distancias y rutas desde: {PUNTO_PARTIDA.direccion}
              </p>
              {saldoInsuficiente && (
                <p className="text-[11px] text-red-300 font-bold">
                  ⚠️ No te alcanza el saldo para esta extracción completa. Baja el número de negocios
                  o desactiva la búsqueda de correos.
                </p>
              )}
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
                {progreso && <p className="text-xs text-[#C084FC] font-mono pt-1">{progreso}</p>}
                <p className="text-[10px] text-gray-500">Suele tardar de 1 a 5 minutos. No cierres esta ventana.</p>
              </div>
            </div>
          )}

          {/* AVISO DE FILTRO POR MUNICIPIO */}
          {!loading && resultado && resultado.descartadosOtroMunicipio > 0 && (
            <div className="text-xs text-[#E9D5FF] bg-[#181030] border border-purple-800/60 rounded-xl px-4 py-2.5">
              📍 Se quitaron <b>{resultado.descartadosOtroMunicipio}</b> negocios que Google Maps devolvió de municipios vecinos
              (fuera de {municipio}). Desmarca "Solo negocios dentro de {municipio}" si también los quieres.
            </div>
          )}

          {/* ERROR */}
          {!loading && errorMsg && (
            <div className="flex items-start gap-3 bg-red-950/40 border border-red-700/60 rounded-2xl p-4 text-sm text-red-200">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-300">No se pudo completar la extracción</p>
                <p className="text-xs mt-1">{errorMsg}</p>
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
                    Costo real reportado por Apify
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
                    {saldo ? (
                      <>
                        <span>
                          Usado este mes: <b className="text-white font-mono">${saldo.usadoUsd.toFixed(2)} USD</b>
                        </span>
                        <span>•</span>
                        <span>
                          Disponible: <b className="text-emerald-400 font-mono">${saldo.disponibleUsd.toFixed(2)} USD</b>
                          <span className="text-gray-400 text-[11px]"> (de ${saldo.limiteUsd.toFixed(2)} USD del mes · saldo real de Apify)</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-400">Consultando saldo en Apify...</span>
                    )}
                  </div>

                  {saldo && saldo.disponibleUsd < 1.00 && (
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
                  <div className="flex flex-wrap items-center gap-2">
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
                      <span>🚶 Visitar en persona ({totalRegistros})</span>
                    </button>
                    <button
                      id="tab-btn-apify-consolidada"
                      onClick={() => setActiveTab('consolidada')}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
                        activeTab === 'consolidada'
                          ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg shadow-purple-950/60'
                          : 'bg-[#0D0818] text-gray-300 hover:text-white'
                      }`}
                    >
                      <span>🧩 Base consolidada INEGI + Google ({cruce ? cruce.registros.length : '…'})</span>
                    </button>
                  </div>

                  {/* ACTION BUTTONS POR TAB */}
                  <div className="flex flex-wrap items-center gap-2">
                    {activeTab === 'email' ? (
                      <>
                        <button
                          id="btn-download-csv-email-campana"
                          onClick={() => descargarCsvCampanaEmail(listaEmail, `apify_${cleanCat}_${cleanZone}_campana_email`)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                          title="Descargar CSV con columnas completas para cold email"
                        >
                          <Download className="w-4 h-4" />
                          <span>📥 CSV para campaña de email</span>
                        </button>

                        <button
                          id="btn-download-csv-senderplus"
                          onClick={() => descargarCsvSenderPlus(listaEmail, `apify_${cleanCat}_${cleanZone}`)}
                          className="px-3.5 py-2 rounded-xl bg-[#9333EA] hover:bg-[#A855F7] text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                          title="CSV exclusivo con solo Nombre y Teléfono para SenderPlus"
                        >
                          <Send className="w-4 h-4" />
                          <span>📱 CSV para SenderPlus</span>
                        </button>
                      </>
                    ) : activeTab === 'consolidada' ? (
                      <button
                        id="btn-download-consolidado"
                        disabled={!cruce}
                        onClick={() => cruce && descargarConsolidado(registrosConsolidados, `base_consolidada_${cleanCat}_${cleanZone}`)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>📥 Excel consolidado ({registrosConsolidados.length})</span>
                      </button>
                    ) : (
                      <>
                        <button
                          id="btn-download-csv-ruta-visitas"
                          onClick={() => descargarCsvRutaVisitas(listaVisita, `apify_${cleanCat}_${cleanZone}`)}
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
                {showMapModal && activeTab !== 'consolidada' && (
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

                {/* CONTROLES DE HISTORIAL */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <label className="flex items-center gap-2 text-[#E9D5FF] cursor-pointer">
                    <input type="checkbox" checked={soloNuevos} onChange={e => setSoloNuevos(e.target.checked)} className="accent-purple-500" />
                    Mostrar y descargar solo los 🆕 nuevos (que no habías bajado antes)
                  </label>
                  <span className="text-gray-500">
                    Historial en este navegador: {totalEnHistorial().toLocaleString('es-MX')} negocios ·{' '}
                    <button className="underline hover:text-gray-300" onClick={() => {
                      if (window.confirm('¿Borrar el historial de negocios descargados en este navegador?')) { borrarHistorial(); setHistorialPorId({}); }
                    }}>borrar</button>
                  </span>
                </div>

                {/* BASE CONSOLIDADA INEGI + GOOGLE */}
                {activeTab === 'consolidada' && (
                  <div className="space-y-3">
                    {cruceEstado && <p className="text-xs text-amber-300">{cruceEstado}</p>}
                    {cruce && (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          {[
                            ['todas', `Todas (${cruce.registros.length})`, 'bg-[#1C1433]'],
                            ['Ambos', `✅ En ambos (${cruce.ambos})`, 'bg-emerald-900/50'],
                            ['Solo Google', `🆕 Solo Google (${cruce.soloGoogle})`, 'bg-sky-900/40'],
                            ['Solo INEGI', `🔎 Solo INEGI (${cruce.soloInegi})`, 'bg-amber-900/40'],
                          ].map(([k, t, bg]) => (
                            <button key={k} onClick={() => setFiltroFuente(k)}
                              className={`${bg} rounded-xl px-3 py-2 font-bold text-left border ${filtroFuente === k ? 'border-[#C084FC] text-white' : 'border-transparent text-gray-300'}`}>
                              {t}
                            </button>
                          ))}
                        </div>
                        {cruce.posibles > 0 && (
                          <p className="text-xs text-amber-300">
                            ⚠️ {cruce.posibles} negocios de Google tienen a menos de 40 m un negocio de INEGI con otro nombre:
                            pueden ser el mismo. Se listan los dos para que lo confirmes en calle o por teléfono.
                          </p>
                        )}
                        <div className="bg-[#140E24] border border-purple-900/40 rounded-xl overflow-x-auto max-h-[480px]">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#1A1033] text-[#E9D5FF] sticky top-0">
                              <tr>
                                <th className="py-2.5 px-3">Fuente</th>
                                <th className="py-2.5 px-3">Nombre</th>
                                <th className="py-2.5 px-3">Teléfono</th>
                                <th className="py-2.5 px-3">Dirección</th>
                                <th className="py-2.5 px-3">Empleados</th>
                                <th className="py-2.5 px-3">Nota</th>
                                <th className="py-2.5 px-3 text-amber-400">Dist.</th>
                                <th className="py-2.5 px-3 text-center">Ruta</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-purple-900/30 text-gray-200">
                              {registrosConsolidados.map(r => (
                                <tr key={r.clave} className="hover:bg-white/[0.02]">
                                  <td className="py-2 px-3 whitespace-nowrap font-bold">
                                    {r.fuente === 'Ambos' ? <span className="text-emerald-400">✅ Ambos{r.confianza ? ` · ${r.confianza}` : ''}</span>
                                      : r.fuente === 'Solo Google' ? <span className="text-sky-300">🆕 Google</span>
                                      : <span className="text-amber-300">🔎 INEGI</span>}
                                    <span className={`block text-[10px] font-normal ${r.historial.startsWith('🆕') ? 'text-emerald-400' : 'text-gray-500'}`}>{r.historial}</span>
                                  </td>
                                  <td className="py-2 px-3 max-w-[220px]">
                                    <span className="font-bold text-white block truncate" title={r.nombre}>{r.nombre}</span>
                                    {r.nombre_inegi && r.fuente === 'Ambos' && <span className="text-[10px] text-gray-400 block truncate" title={r.nombre_inegi}>INEGI: {r.nombre_inegi}</span>}
                                    <span className="text-[10px] text-[#C084FC] block truncate">{r.giro_google || r.actividad_inegi}</span>
                                  </td>
                                  <td className="py-2 px-3 font-mono whitespace-nowrap">
                                    {r.telefono || r.telefono_inegi || <span className="text-gray-600">—</span>}
                                  </td>
                                  <td className="py-2 px-3 min-w-[220px] text-gray-300">{r.direccion}</td>
                                  <td className="py-2 px-3 text-gray-300 whitespace-nowrap">{r.empleados || '—'}</td>
                                  <td className="py-2 px-3 text-[11px] text-gray-400 min-w-[200px]">{r.nota}</td>
                                  <td className="py-2 px-3 font-mono text-amber-400 whitespace-nowrap">{r.distancia_km} km</td>
                                  <td className="py-2 px-3 text-center">
                                    <a href={r.ruta} target="_blank" rel="noopener noreferrer"
                                       className="px-2.5 py-1 rounded bg-[#9333EA] hover:bg-[#A855F7] text-white text-[11px] font-bold">🧭 Ir</a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {registrosConsolidados.length === 0 && <p className="text-center py-8 text-gray-400 text-xs">Sin registros para este filtro.</p>}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TABLA DE RESULTADOS CON TODAS LAS COLUMNAS REQUERIDAS */}
                {activeTab !== 'consolidada' && (
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
                            <th className="py-2.5 px-3 font-bold">Dirección</th>
                            <th className="py-2.5 px-3 font-bold">Web</th>
                            <th className="py-2.5 px-3 font-bold">Correo</th>
                            <th className="py-2.5 px-3 font-bold text-amber-400">Distancia</th>
                            <th className="py-2.5 px-3 font-bold text-center">Link GPS</th>
                            <th className="py-2.5 px-3 font-bold text-purple-300">Origen</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-purple-900/30 text-gray-200">
                        {listaTabla.map((item, idx) => (
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
                                <td className="py-2.5 px-3 font-bold text-white max-w-[220px]" title={item.nombre}>
                                  <span className="block truncate">{item.nombre}</span>
                                  {historialPorId[`google:${item.id}`] && (
                                    <span className={`text-[10px] font-semibold ${esNuevo(item.id) ? 'text-emerald-400' : 'text-gray-500'}`}>
                                      {historialPorId[`google:${item.id}`]}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-[#C084FC]">
                                  {item.categoria}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-purple-200 whitespace-nowrap">
                                  {item.telefono}
                                </td>
                                <td className="py-2.5 px-3 text-gray-300 min-w-[240px]">
                                  {item.direccion}
                                </td>
                                <td className="py-2.5 px-3">
                                  {item.web ? (
                                    <a href={item.web} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline" title={item.web}>
                                      {item.web.replace(/^https?:\/\/(www\.)?/, '').slice(0, 22)}
                                    </a>
                                  ) : <span className="text-gray-600">—</span>}
                                </td>
                                <td className="py-2.5 px-3">
                                  {item.email ? <span className="text-emerald-300">{item.email}</span> : <span className="text-gray-600">—</span>}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                                  {item.distancia_km ?? "—"} km
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

                  {listaTabla.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-xs">
                      No se encontraron registros en esta categoría para este criterio.
                    </div>
                  )}
                </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
