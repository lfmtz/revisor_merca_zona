import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Copy, 
  MapPin, 
  Navigation, 
  ExternalLink, 
  Star, 
  Search, 
  Phone, 
  Calendar, 
  Check, 
  AlertTriangle, 
  ChevronUp, 
  ChevronDown, 
  Layers, 
  Map as MapIcon, 
  List, 
  Clock, 
  Zap,
  Globe
} from 'lucide-react';
import { Lead } from '../types';
import { exportToCSV, exportToExcel, extractCleanPhoneList, generateExportFilename } from '../utils/dataProcessor';
import { TerritoryMap } from './TerritoryMap';
import { ESTADOS_DATA } from '../data/mexico_geo';

interface Module3LeadExtractionProps {
  businessType: string;
  estado: string;
  municipio: string;
  coverage: string;
  leads: Lead[];
  totalEstimated: number;
  discardedOutOfMx: number;
  isExtracting: boolean;
  progressText: string;
  progressPercent: number;
  baseLocation?: { lat: number; lng: number; nombre: string; radioKm: number };
  onLoadMore: () => void;
  onExtractAll: () => void;
  onRunExtraction: () => void;
}

type SortField = 'calificacion' | 'num_resenas' | 'nombre_negocio' | 'municipio_detectado' | 'telefono';

export const Module3LeadExtraction: React.FC<Module3LeadExtractionProps> = ({
  businessType,
  estado,
  municipio,
  coverage,
  leads,
  totalEstimated,
  discardedOutOfMx,
  isExtracting,
  progressText,
  progressPercent,
  baseLocation,
  onLoadMore,
  onExtractAll,
  onRunExtraction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('calificacion');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [copiedPhones, setCopiedPhones] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showExtractAllConfirm, setShowExtractAllConfirm] = useState(false);

  const stateData = ESTADOS_DATA[estado] || ESTADOS_DATA["Ciudad de México"];
  const centerLat = stateData?.lat || 19.4326;
  const centerLng = stateData?.lng || -99.1332;

  // Real-time filtering within extracted results
  const filteredLeads = useMemo(() => {
    let list = [...leads];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(l =>
        l.nombre_negocio.toLowerCase().includes(q) ||
        l.direccion_completa.toLowerCase().includes(q) ||
        l.municipio_detectado.toLowerCase().includes(q) ||
        l.categoria.toLowerCase().includes(q) ||
        l.telefono.includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [leads, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDownloadCSV = () => {
    const filename = generateExportFilename(businessType, estado, municipio, 'csv');
    exportToCSV(leads, filename);
  };

  const handleDownloadExcel = () => {
    const filename = generateExportFilename(businessType, estado, municipio, 'xlsx');
    exportToExcel(leads, filename);
  };

  const handleCopyPhones = () => {
    const phoneList = extractCleanPhoneList(leads);
    navigator.clipboard.writeText(phoneList);
    setCopiedPhones(true);
    setTimeout(() => setCopiedPhones(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#2D2540] border border-[#6B21A8]/60 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#9333EA]/30 text-[#C084FC] border border-[#9333EA]/60">
                MÓDULO 3
              </span>
              <span className="text-xs text-[#E9D5FF]/70">Extracción y Plan de Rutas de Venta</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Listado de Prospectos Comerciales para Visitas de Campo
            </h2>
            <p className="text-xs md:text-sm text-[#E9D5FF]/80 mt-1 max-w-2xl">
              Datos verificados con teléfono directo, dirección física, horarios y botón directo de navegación GPS en Google Maps para tu equipo comercial.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {leads.length > 0 && (
              <>
                <button
                  onClick={handleDownloadCSV}
                  className="px-3 py-2 bg-[#1E1B2E] hover:bg-[#6B21A8]/30 border border-[#6B21A8] text-xs font-bold text-[#E9D5FF] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-[#C084FC]" />
                  <span>Descargar CSV</span>
                </button>

                <button
                  onClick={handleDownloadExcel}
                  className="px-3.5 py-2 bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#C084FC] text-xs font-bold text-white rounded-lg transition-all flex items-center gap-1.5 shadow-md border border-[#C084FC]/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Excel</span>
                </button>

                <button
                  onClick={handleCopyPhones}
                  className="px-3 py-2 bg-[#22C55E]/20 hover:bg-[#22C55E]/30 border border-[#22C55E]/50 text-xs font-bold text-[#22C55E] rounded-lg transition-colors flex items-center gap-1.5"
                  title="Copia todos los números a 10 dígitos en saltos de línea para WhatsApp"
                >
                  {copiedPhones ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPhones ? '¡Teléfonos Copiados!' : 'Copiar Teléfonos (WhatsApp)'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar during extraction */}
      {isExtracting && (
        <div className="bg-[#2D2540] border border-[#C084FC]/50 rounded-xl p-4 shadow-xl space-y-2 animate-pulse">
          <div className="flex items-center justify-between text-xs font-bold text-[#C084FC]">
            <span>{progressText}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-[#1E1B2E] rounded-full h-2.5 overflow-hidden border border-[#6B21A8]/50">
            <div
              className="bg-gradient-to-r from-[#6B21A8] via-[#9333EA] to-[#C084FC] h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(8, progressPercent)}%` }}
            />
          </div>
          <div className="text-[11px] text-[#E9D5FF]/70 text-right">
            Aplicando delays anti-detección y validación territorial de México...
          </div>
        </div>
      )}

      {/* Coverage Badge & Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#2D2540]/60 p-3.5 rounded-lg border border-[#6B21A8]/40">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="geo-badge !border-[#C084FC] !text-[#C084FC] font-bold">
              🎯 Resultados: {businessType || "Negocios"} en {coverage}
            </div>
          </div>
          <div className="text-xs text-[#E9D5FF]/80 font-medium">
            <b>{leads.length}</b> negocios encontrados | <span className="text-[#F59E0B]">{discardedOutOfMx} descartados fuera de MX</span>
          </div>
        </div>

        {/* View mode toggle (Table vs Map) */}
        {leads.length > 0 && (
          <div className="flex items-center gap-1 bg-[#1E1B2E] p-1 rounded-lg border border-[#6B21A8]/50 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-[#9333EA] text-white' : 'text-[#E9D5FF]/70 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabla de Leads</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${
                viewMode === 'map' ? 'bg-[#9333EA] text-white' : 'text-[#E9D5FF]/70 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Rutas en Mapa</span>
            </button>
          </div>
        )}
      </div>

      {/* If No Leads Extracted Yet */}
      {leads.length === 0 && !isExtracting ? (
        <div className="bg-[#2D2540] border border-[#6B21A8]/40 rounded-xl p-8 text-center space-y-4 shadow-lg">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#9333EA]/20 flex items-center justify-center text-[#C084FC]">
            <MapPin className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">Listo para extraer prospectos</h3>
            <p className="text-xs text-[#E9D5FF]/70 mt-1">
              Ingresa el tipo de negocio y la zona en la barra lateral y presiona <b>🚀 EJECUTAR BÚSQUEDA</b>.
            </p>
          </div>
          <button
            onClick={onRunExtraction}
            disabled={!estado || !businessType.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#C084FC] text-xs font-bold text-white rounded-lg shadow-lg border border-[#C084FC]/30 transition-all inline-flex items-center gap-2 disabled:opacity-50"
          >
            <span>🚀 Iniciar Extracción Ahora</span>
          </button>
        </div>
      ) : (
        <>
          {/* MAP VIEW */}
          {viewMode === 'map' && (
            <div className="bg-[#2D2540] border border-[#6B21A8]/50 rounded-xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#C084FC]" />
                  <span>Mapa de Visitas y Rutas Comerciales ({leads.length} puntos)</span>
                </h3>
                <span className="text-xs text-[#E9D5FF]/70">Haz clic en un marcador para ver datos y ruta GPS</span>
              </div>
              <div className="h-[460px] w-full rounded-lg overflow-hidden">
                <TerritoryMap
                  centerLat={centerLat}
                  centerLng={centerLng}
                  zoom={municipio.trim() ? 13 : 10}
                  leads={leads}
                  baseLocation={baseLocation}
                  selectedLeadId={selectedLead?.id}
                  onSelectLead={(l) => setSelectedLead(l)}
                />
              </div>
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-[#2D2540] border border-[#6B21A8]/50 rounded-xl overflow-hidden shadow-xl">
              {/* Search filter within results */}
              <div className="p-4 border-b border-[#6B21A8]/40 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1E1B2E]/40">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-[#C084FC] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="🔍 Filtrar dentro de los resultados..."
                    className="w-full bg-[#1E1B2E] text-white placeholder:text-[#E9D5FF]/40 text-xs rounded-lg border border-[#6B21A8] pl-9 pr-3 py-2 focus:outline-none focus:border-[#C084FC] transition-colors"
                  />
                </div>

                <div className="text-xs text-[#E9D5FF]/80">
                  Mostrando <b>{filteredLeads.length}</b> de {leads.length} resultados (Total estimado en Maps: <b>~{totalEstimated}</b>)
                </div>
              </div>

              {/* Interactive Leads Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#1E1B2E] text-[#C084FC] border-b border-[#6B21A8]/50 uppercase tracking-wider font-semibold select-none">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th 
                        className="py-3 px-3 cursor-pointer hover:text-white"
                        onClick={() => handleSort('nombre_negocio')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Nombre del Negocio</span>
                          {sortField === 'nombre_negocio' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="py-3 px-3">Categoría</th>
                      <th 
                        className="py-3 px-3 cursor-pointer hover:text-white"
                        onClick={() => handleSort('municipio_detectado')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Municipio / Alcaldía</span>
                          {sortField === 'municipio_detectado' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="py-3 px-3">Estado</th>
                      <th className="py-3 px-3">Teléfono</th>
                      <th 
                        className="py-3 px-3 text-center cursor-pointer hover:text-white"
                        onClick={() => handleSort('calificacion')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Calificación</span>
                          {sortField === 'calificacion' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th 
                        className="py-3 px-3 text-center cursor-pointer hover:text-white"
                        onClick={() => handleSort('num_resenas')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Reseñas</span>
                          {sortField === 'num_resenas' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="py-3 px-3">Horario</th>
                      <th className="py-3 px-2 text-center">Google Maps</th>
                      <th className="py-3 px-2 text-center">Ruta GPS</th>
                      <th className="py-3 px-2 text-center">Sitio Web</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#6B21A8]/30">
                    {filteredLeads.map((lead, idx) => (
                      <tr 
                        key={lead.id} 
                        className="hover:bg-[#6B21A8]/20 transition-colors group"
                      >
                        <td className="py-3 px-3 text-center font-bold text-[#E9D5FF]/60">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white group-hover:text-[#C084FC] transition-colors max-w-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold">{lead.nombre_negocio}</span>
                            {lead.tipo_entidad === 'empresa' ? (
                              <span className="empresa-badge !text-[10px] !py-0 !px-1.5">🏢 Empresa</span>
                            ) : (
                              <span className="negocio-badge !text-[10px] !py-0 !px-1.5">🏪 Negocio</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#E9D5FF]/60 line-clamp-1 mt-0.5">{lead.direccion_completa}</div>
                        </td>
                        <td className="py-3 px-3 text-[#E9D5FF]">
                          <span className="px-2 py-0.5 rounded bg-[#1E1B2E] border border-[#6B21A8]/40 text-[11px]">
                            {lead.categoria}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-[#E9D5FF]">
                          {lead.municipio_detectado}
                        </td>
                        <td className="py-3 px-3 font-medium text-[#E9D5FF]">
                          {lead.estado_detectado}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-white">
                          {lead.telefono !== 'N/A' ? (
                            <a
                              href={`tel:${lead.telefono.replace(/\s+/g, '')}`}
                              className="text-[#22C55E] hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{lead.telefono}</span>
                            </a>
                          ) : (
                            <span className="text-[#E9D5FF]/40">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1 font-bold text-[#F59E0B] bg-[#1E1B2E] px-2 py-0.5 rounded border border-[#6B21A8]/40">
                            <Star className="w-3 h-3 fill-[#F59E0B]" />
                            <span>{lead.calificacion.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-[#E9D5FF]">
                          ({lead.num_resenas})
                        </td>
                        <td className="py-3 px-3 text-[11px] text-[#E9D5FF]/80">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                            <span>{lead.horario}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <a
                            href={lead.url_google_maps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded bg-[#1E1B2E] hover:bg-[#6B21A8]/40 text-[#C084FC] border border-[#6B21A8]/50 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <span>📍</span>
                            <span>Ver</span>
                          </a>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <a
                            href={lead.link_navegacion}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded bg-[#9333EA] hover:bg-[#C084FC] text-white text-[11px] font-bold inline-flex items-center gap-1 shadow transition-all"
                          >
                            <span>🧭</span>
                            <span>Ir</span>
                          </a>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {lead.sitio_web && lead.sitio_web !== 'N/A' ? (
                            <a
                              href={lead.sitio_web}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#C084FC] hover:text-white underline text-[11px] inline-flex items-center gap-1"
                            >
                              <Globe className="w-3 h-3" />
                              <span>Web</span>
                            </a>
                          ) : (
                            <span className="text-[#E9D5FF]/30 text-[11px]">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAGINACIÓN DE 50 EN 50 Y EXTRACT ALL */}
          <div className="bg-[#2D2540] border border-[#6B21A8]/50 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#E9D5FF] font-medium">
              📊 <b>Mostrando {leads.length}</b> de ~{totalEstimated} resultados estimados en la zona
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onLoadMore}
                disabled={isExtracting}
                className="px-4 py-2 bg-[#1E1B2E] hover:bg-[#6B21A8]/30 border border-[#C084FC]/50 text-xs font-bold text-[#C084FC] rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>📥</span>
                <span>Cargar 50 más</span>
              </button>

              <button
                onClick={() => setShowExtractAllConfirm(true)}
                disabled={isExtracting}
                className="px-4 py-2 bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#C084FC] text-xs font-bold text-white rounded-lg shadow-lg border border-[#C084FC]/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ Extraer todo</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* CONFIRMATION MODAL FOR EXTRACT ALL (>200 LEADS ANTI-BOT WARNING) */}
      {showExtractAllConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#2D2540] border border-[#F59E0B] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-[#F59E0B]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Advertencia de Límite de Sesión</h3>
            </div>
            <p className="text-xs text-[#E9D5FF] leading-relaxed">
              ⚠️ Extraer más de 200 resultados de forma continua aumenta el riesgo de captcha o bloqueo temporal por parte de Google Maps.
            </p>
            <p className="text-xs text-[#E9D5FF]/80">
              LeadScrapper MX aplicará delays inteligentes y modo stealth para proteger tu IP. ¿Deseas proceder con la extracción masiva?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowExtractAllConfirm(false)}
                className="px-4 py-2 bg-[#1E1B2E] text-xs font-bold text-[#E9D5FF] rounded-lg border border-[#6B21A8] hover:bg-[#6B21A8]/30 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowExtractAllConfirm(false);
                  onExtractAll();
                }}
                className="px-4 py-2 bg-[#F59E0B] hover:bg-[#F59E0B]/80 text-xs font-bold text-black rounded-lg transition-colors"
              >
                Sí, continuar con extracción
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
