import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Lead } from '../types';

export function getCategoryPinConfig(categoria: string = '', nombre: string = ''): {
  color: string;
  borderColor: string;
  iconText: string;
  categoryLabel: string;
  tagBg: string;
  tagColor: string;
  badgeClass: string;
} {
  const text = `${categoria} ${nombre}`.toLowerCase();

  // 1. Hospitales / clínicas: rojo 🔴 (#EF4444)
  if (
    text.includes('hospital') ||
    text.includes('clínic') ||
    text.includes('clinic') ||
    text.includes('médic') ||
    text.includes('medic') ||
    text.includes('salud') ||
    text.includes('sanatorio') ||
    text.includes('doctor') ||
    text.includes('farmacia') ||
    text.includes('laboratorio') ||
    text.includes('dental') ||
    text.includes('odontolog') ||
    text.includes('consultorio') ||
    text.includes('urgencias')
  ) {
    return {
      color: '#EF4444',
      borderColor: '#FFFFFF',
      iconText: '🔴',
      categoryLabel: 'Hospitales / Clínicas',
      tagBg: '#450A0A',
      tagColor: '#FCA5A5',
      badgeClass: 'text-red-400 bg-red-950/70 border-red-800'
    };
  }

  // 2. Reparto / logística: azul 🔵 (#3B82F6)
  if (
    text.includes('reparto') ||
    text.includes('logístic') ||
    text.includes('logistic') ||
    text.includes('paqueter') ||
    text.includes('mensajer') ||
    text.includes('transporte') ||
    text.includes('flete') ||
    text.includes('mudanza') ||
    text.includes('envío') ||
    text.includes('envio') ||
    text.includes('delivery') ||
    text.includes('autotransporte') ||
    text.includes('carga')
  ) {
    return {
      color: '#3B82F6',
      borderColor: '#FFFFFF',
      iconText: '🔵',
      categoryLabel: 'Reparto / Logística',
      tagBg: '#172554',
      tagColor: '#93C5FD',
      badgeClass: 'text-blue-400 bg-blue-950/70 border-blue-800'
    };
  }

  // 3. Industria / flotillas: amarillo 🟡 (#EAB308)
  if (
    text.includes('industr') ||
    text.includes('flotilla') ||
    text.includes('fábrica') ||
    text.includes('fabrica') ||
    text.includes('manufact') ||
    text.includes('bodega') ||
    text.includes('almacén') ||
    text.includes('almacen') ||
    text.includes('construct') ||
    text.includes('materiales para constr') ||
    text.includes('acero') ||
    text.includes('perfil') ||
    text.includes('maquinaria') ||
    text.includes('distribuidora') ||
    text.includes('planta') ||
    text.includes('concreto') ||
    text.includes('ferreter') ||
    text.includes('tlapaler')
  ) {
    return {
      color: '#EAB308',
      borderColor: '#FFFFFF',
      iconText: '🟡',
      categoryLabel: 'Industria / Flotillas',
      tagBg: '#422006',
      tagColor: '#FDE047',
      badgeClass: 'text-yellow-400 bg-yellow-950/70 border-yellow-800'
    };
  }

  // 4. Competencia automotriz: naranja 🟠 (#F97316)
  if (
    text.includes('automot') ||
    text.includes('mecánic') ||
    text.includes('mecanic') ||
    text.includes('taller') ||
    text.includes('refacc') ||
    text.includes('llant') ||
    text.includes('agencia') ||
    text.includes('auto') ||
    text.includes('freno') ||
    text.includes('hojalat') ||
    text.includes('suspensi') ||
    text.includes('parabrisa') ||
    text.includes('vidrier') ||
    text.includes('vulcaniz') ||
    text.includes('moto') ||
    text.includes('carrocer')
  ) {
    return {
      color: '#F97316',
      borderColor: '#FFFFFF',
      iconText: '🟠',
      categoryLabel: 'Competencia Automotriz',
      tagBg: '#431407',
      tagColor: '#FDBA74',
      badgeClass: 'text-orange-400 bg-orange-950/70 border-orange-800'
    };
  }

  // Default / otros giros comerciales
  return {
    color: '#8B5CF6',
    borderColor: '#FFFFFF',
    iconText: '🟣',
    categoryLabel: categoria || 'Comercio / Servicios',
    tagBg: '#2E1065',
    tagColor: '#DDD6FE',
    badgeClass: 'text-purple-400 bg-purple-950/70 border-purple-800'
  };
}

export interface TerritoryMapProps {
  centerLat: number;
  centerLng: number;
  zoom?: number;
  mode?: 'cuadriculas' | 'negocios';
  leads?: Lead[];
  densityPoints?: { lat: number; lng: number; nombre: string; categoria: string; calificacion: number }[];
  baseLocation?: { lat: number; lng: number; nombre: string; radioKm: number };
  gridCells?: { lat: number; lon: number; radio_celda_km: number }[];
  selectedLeadId?: string | null;
  onSelectLead?: (lead: Lead) => void;
  showModeSwitch?: boolean;
  onModeChange?: (mode: 'cuadriculas' | 'negocios') => void;
  activeCellIndex?: number;
}

export const TerritoryMap: React.FC<TerritoryMapProps> = ({
  centerLat,
  centerLng,
  zoom = 11,
  mode = 'negocios',
  leads = [],
  densityPoints = [],
  baseLocation,
  gridCells = [],
  selectedLeadId,
  onSelectLead,
  showModeSwitch = false,
  onModeChange,
  activeCellIndex
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [internalMode, setInternalMode] = useState<'cuadriculas' | 'negocios'>(mode);

  // Sync mode if changed from outside
  useEffect(() => {
    setInternalMode(mode);
  }, [mode]);

  const handleToggleMode = (newMode: 'cuadriculas' | 'negocios') => {
    setInternalMode(newMode);
    if (onModeChange) onModeChange(newMode);
  };

  const [tileProvider, setTileProvider] = useState<'cartodb' | 'osm'>('osm');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Map if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: zoom,
        zoomControl: true,
        attributionControl: false
      });

      // CartoDB Positron: Altamente confiable, rápido, sin restricciones de iframe/referrer y alto contraste
      const tileUrl = tileProvider === 'cartodb'
        ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 20,
        subdomains: tileProvider === 'cartodb' ? 'abcd' : 'abc',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Invalidate size to guarantee tiles load immediately without gray/black areas
      [100, 300, 600, 1000, 1500, 2500].forEach(ms => {
        setTimeout(() => {
          try { map.invalidateSize({ animate: false }); } catch {}
        }, ms);
      });

      // ResizeObserver to keep tiles rendered on container resize
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
          try { map.invalidateSize(); } catch {}
        });
        ro.observe(mapContainerRef.current);
      }
    } else {
      mapInstanceRef.current.setView([centerLat, centerLng], zoom);
      setTimeout(() => {
        try { mapInstanceRef.current?.invalidateSize(); } catch {}
      }, 100);
    }

    return () => {
      // Keep map alive during state updates
    };
  }, []);

  // Switch tile layer if changed
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const tileUrl = tileProvider === 'cartodb'
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newLayer = L.tileLayer(tileUrl, {
      maxZoom: 20,
      subdomains: tileProvider === 'cartodb' ? 'abcd' : 'abc',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [tileProvider]);

  // Update view when center changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([centerLat, centerLng], zoom);
    }
  }, [centerLat, centerLng, zoom]);

  // Update layers based on current mode
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    const bounds = L.latLngBounds([]);

    // ─────────────────────────────────────────────────────────────
    // BASE DE OPERACIONES (⭐ Estrella dorada) - Present in both modes
    // ─────────────────────────────────────────────────────────────
    if (baseLocation && baseLocation.lat && baseLocation.lng) {
      const baseLatLng = L.latLng(baseLocation.lat, baseLocation.lng);
      bounds.extend(baseLatLng);

      // Estrella dorada ⭐
      const baseIcon = L.divIcon({
        className: 'custom-base-pin',
        html: `
          <div style="
            background: linear-gradient(135deg, #F59E0B, #D97706);
            color: #FFFFFF;
            font-size: 16px;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2.5px solid #FEF08A;
            box-shadow: 0 0 16px rgba(245, 158, 11, 0.85);
            cursor: pointer;
            text-shadow: 0 1px 2px rgba(0,0,0,0.4);
          ">
            ⭐
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const baseMarker = L.marker(baseLatLng, { icon: baseIcon, zIndexOffset: 1000 });
      baseMarker.bindPopup(`
        <div style="font-family: 'Poppins', sans-serif; color: #1E1B2E; padding: 4px; min-width: 190px;">
          <div style="display: flex; align-items: center; gap: 4px; font-weight: 800; font-size: 13px; color: #D97706;">
            <span>⭐</span>
            <span>Tu Base de Operaciones</span>
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #1F2937; margin-top: 3px;">
            ${baseLocation.nombre}
          </div>
          <div style="font-size: 11px; color: #7C3AED; font-weight: 700; margin-top: 3px;">
            Radio de cobertura: ${baseLocation.radioKm} km
          </div>
        </div>
      `);
      baseMarker.addTo(markersLayerRef.current);

      // In Modo 1 (Cuadrículas), also show the coverage circle
      if (internalMode === 'cuadriculas') {
        const opCircle = L.circle(baseLatLng, {
          radius: baseLocation.radioKm * 1000,
          color: '#9333EA',
          weight: 2,
          fillColor: '#9333EA',
          fillOpacity: 0.10,
          dashArray: '6, 6'
        });
        opCircle.bindPopup(`
          <div style="font-family: 'Poppins', sans-serif; color: #1E1B2E; padding: 4px;">
            <div style="font-weight: 700; color: #6B21A8;">🎯 Cobertura Total</div>
            <div style="font-size: 11px;">Radio: <b>${baseLocation.radioKm} km</b> a la redonda</div>
          </div>
        `);
        opCircle.addTo(markersLayerRef.current);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // MODO 1: CUADRÍCULAS DE ESCANEO
    // Mostrar solo celdas y cuadrículas (sin pines de negocios ni clusters)
    // ─────────────────────────────────────────────────────────────
    if (internalMode === 'cuadriculas') {
      if (gridCells && gridCells.length > 0) {
        gridCells.forEach((cell, idx) => {
          const isActive = activeCellIndex !== undefined && idx + 1 === activeCellIndex;
          const isDone = activeCellIndex !== undefined && idx + 1 < activeCellIndex;

          const cellCircle = L.circle([cell.lat, cell.lon], {
            radius: cell.radio_celda_km * 1000,
            color: isActive ? '#22C55E' : isDone ? '#9333EA' : '#6B21A8',
            weight: isActive ? 2.5 : 1.5,
            fillColor: isActive ? '#4ADE80' : isDone ? '#C084FC' : '#6B21A8',
            fillOpacity: isActive ? 0.28 : isDone ? 0.12 : 0.05
          });

          cellCircle.bindPopup(`
            <div style="font-family: 'Poppins', sans-serif; color: #1E1B2E; padding: 3px;">
              <div style="font-weight: 800; font-size: 12px; color: ${isActive ? '#16A34A' : '#6B21A8'};">
                📐 Celda #${idx + 1} ${isActive ? '⚡ (Escaneando ahora)' : isDone ? '✓ (Procesada)' : ''}
              </div>
              <div style="font-size: 11px; margin-top: 2px;">Radio celda: <b>${cell.radio_celda_km} km</b></div>
              <div style="font-size: 10px; color: #64748B; font-family: monospace;">Lat: ${cell.lat.toFixed(4)}, Lon: ${cell.lon.toFixed(4)}</div>
            </div>
          `);
          cellCircle.addTo(markersLayerRef.current!);
          bounds.extend([cell.lat, cell.lon]);
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // MODO 2: MAPA DE NEGOCIOS ENCONTRADOS
    // Un pin por cada negocio encontrado. Sin burbujas ni cuadrículas.
    // Colores por categoría:
    // - Hospitales/clínicas: rojo 🔴
    // - Reparto/logística: azul 🔵
    // - Industria/flotillas: amarillo 🟡
    // - Competencia automotriz: naranja 🟠
    // - Tu base de operaciones: estrella dorada ⭐
    // ─────────────────────────────────────────────────────────────
    if (internalMode === 'negocios') {
      if (leads && leads.length > 0) {
        leads.forEach((lead) => {
          if (lead.lat && lead.lng) {
            const latLng = L.latLng(lead.lat, lead.lng);
            bounds.extend(latLng);

            const isSelected = selectedLeadId === lead.id;
            const catConf = getCategoryPinConfig(lead.categoria, lead.nombre_negocio);

            // Google Maps GPS URL
            const gpsUrl = (lead.lat && lead.lng)
              ? `https://www.google.com/maps/dir/?api=1&destination=${lead.lat},${lead.lng}`
              : (lead.link_navegacion || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lead.direccion_completa || lead.nombre_negocio)}`);

            const cleanPhone = (lead.telefono || '').replace(/'/g, "\\'");

            // Marcador limpio por categoría (sin cuadrículas ni burbujas)
            const pinIcon = L.divIcon({
              className: 'custom-business-pin',
              html: `
                <div style="
                  background: ${catConf.color};
                  color: white;
                  width: ${isSelected ? '32px' : '26px'};
                  height: ${isSelected ? '32px' : '26px'};
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 2px solid ${isSelected ? '#FEF08A' : '#FFFFFF'};
                  box-shadow: 0 3px 10px rgba(0,0,0,0.5);
                  cursor: pointer;
                  font-size: ${isSelected ? '14px' : '11px'};
                  transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
                  transition: transform 0.15s ease;
                ">
                  ${catConf.iconText}
                </div>
              `,
              iconSize: [isSelected ? 32 : 26, isSelected ? 32 : 26],
              iconAnchor: [isSelected ? 16 : 13, isSelected ? 16 : 13]
            });

            const marker = L.marker(latLng, { icon: pinIcon });

            // Popup con: Nombre, Teléfono con botón copiar, Categoría y Botón 🧭 Ir
            marker.bindPopup(`
              <div style="font-family: 'Poppins', sans-serif; color: #0F172A; min-width: 220px; max-width: 260px; padding: 4px;">
                <!-- Categoría con badge -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <span style="
                    background: ${catConf.tagBg};
                    color: ${catConf.tagColor};
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 7px;
                    border-radius: 6px;
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                  ">
                    ${catConf.iconText} ${lead.categoria}
                  </span>
                  ${lead.calificacion ? `<span style="font-size: 11px; font-weight: 700; color: #D97706;">★ ${lead.calificacion}</span>` : ''}
                </div>

                <!-- Nombre del negocio -->
                <div style="font-weight: 800; font-size: 13px; color: #0F172A; line-height: 1.3; margin-bottom: 3px;">
                  ${lead.nombre_negocio}
                </div>

                <!-- Dirección -->
                <div style="font-size: 11px; color: #64748B; margin-bottom: 8px; line-height: 1.25;">
                  📍 ${lead.direccion_completa}
                </div>

                <!-- Teléfono con botón copiar -->
                <div style="
                  background: #F8FAFC;
                  border: 1px solid #E2E8F0;
                  border-radius: 8px;
                  padding: 6px 8px;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  margin-bottom: 8px;
                ">
                  <div style="font-size: 12px; font-weight: 700; font-family: monospace; color: #0F172A;">
                    📞 ${lead.telefono || 'Sin teléfono'}
                  </div>
                  ${lead.telefono && lead.telefono !== 'Sin teléfono' ? `
                    <button
                      onclick="navigator.clipboard.writeText('${cleanPhone}'); this.innerText='✓ Copiado'; setTimeout(() => this.innerText='📋 Copiar', 2000);"
                      style="
                        background: #475569;
                        color: white;
                        border: none;
                        font-size: 10px;
                        font-weight: 700;
                        padding: 3px 8px;
                        border-radius: 5px;
                        cursor: pointer;
                      "
                      title="Copiar número"
                    >
                      📋 Copiar
                    </button>
                  ` : ''}
                </div>

                <!-- Botón 🧭 Ir que abre Google Maps con navegación desde ubicación actual -->
                <a
                  href="${gpsUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="
                    background: #10B981;
                    color: white;
                    font-size: 12px;
                    font-weight: 800;
                    padding: 7px 12px;
                    border-radius: 8px;
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
                    cursor: pointer;
                  "
                >
                  <span>🧭</span>
                  <span>Ir</span>
                </a>
              </div>
            `);

            marker.on('click', () => {
              if (onSelectLead) onSelectLead(lead);
            });

            marker.addTo(markersLayerRef.current!);
          }
        });
      }
    }

    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [internalMode, leads, baseLocation, gridCells, activeCellIndex, selectedLeadId, onSelectLead]);

  return (
    <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-[#6B21A8]/50 shadow-inner relative z-0 bg-[#0A0713]">
      {/* Top Map Controls / Mode Switcher */}
      <div className="bg-[#140E24] px-4 py-2.5 border-b border-purple-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white flex items-center gap-1.5">
            {internalMode === 'negocios' ? '📍 Modo 2: Negocios Encontrados' : '📐 Modo 1: Cuadrículas de Escaneo'}
          </span>
          <span className="text-[11px] text-[#C084FC] font-mono">
            {internalMode === 'negocios' ? `(${leads.length} negocios)` : `(${gridCells.length} celdas)`}
          </span>
        </div>

        {showModeSwitch && (
          <div className="flex items-center gap-1.5 bg-[#0D0818] p-1 rounded-lg border border-purple-900/40">
            <button
              onClick={() => handleToggleMode('negocios')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                internalMode === 'negocios'
                  ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow'
                  : 'text-[#E9D5FF]/70 hover:text-white'
              }`}
            >
              <span>📍 Negocios</span>
            </button>
            <button
              onClick={() => handleToggleMode('cuadriculas')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                internalMode === 'cuadriculas'
                  ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow'
                  : 'text-[#E9D5FF]/70 hover:text-white'
              }`}
            >
              <span>📐 Cuadrículas (Referencia)</span>
            </button>
          </div>
        )}
      </div>

      {/* Leaflet Map Div */}
      <div className="flex-1 w-full relative" style={{ minHeight: '380px' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '380px', position: 'absolute', top: 0, left: 0 }} />
      </div>

      {/* Footer Legend Bar */}
      <div className="bg-[#140E24] px-4 py-2 border-t border-purple-900/40 flex flex-wrap items-center justify-between gap-3 text-xs text-[#E9D5FF]/90">
        {internalMode === 'negocios' ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-[#C084FC]">Categorías:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300 font-semibold text-[11px]">
              🔴 Hospitales/clínicas
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-300 font-semibold text-[11px]">
              🔵 Reparto/logística
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-950/80 border border-yellow-800 text-yellow-300 font-semibold text-[11px]">
              🟡 Industria/flotillas
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-950/80 border border-orange-800 text-orange-300 font-semibold text-[11px]">
              🟠 Competencia automotriz
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-semibold text-[11px]">
              ⭐ Base de operaciones
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-[#C084FC]">Cuadrículas:</span>
            <span className="inline-flex items-center gap-1 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Celda en escaneo
            </span>
            <span className="inline-flex items-center gap-1 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9333EA] inline-block" /> Celdas procesadas
            </span>
            <span className="inline-flex items-center gap-1 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> ⭐ Base de operaciones
            </span>
          </div>
        )}

        <div className="text-[11px] text-[#C084FC]/70 font-mono">
          Tiles: OpenStreetMap (Gratuito)
        </div>
      </div>
    </div>
  );
};
