import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Lead } from '../types';
import { ResultadoNse, ColoniaNse } from '../services/denueScan';
import { BASE_TRABAJO, rutaDesdeTrabajo } from '../services/apifyService';

// Mapa de la zona con 3 vistas claras:
//  1) Colonias por nivel socioeconómico (círculo por colonia: color = nivel, tamaño = negocios)
//  2) Mapa de calor real (cuadritos de ~275 m coloreados por concentración de negocios)
//  3) Negocios agrupados (burbujas con número que se separan al hacer zoom)

type Vista = 'colonias' | 'calor' | 'negocios';
type CapaCalor = 'total' | 'alto' | 'bajo';

const NIVELES = [
  { nivel: 'A/B', color: '#16A34A', texto: 'Alto' },
  { nivel: 'C+', color: '#65A30D', texto: 'Medio alto' },
  { nivel: 'C', color: '#CA8A04', texto: 'Medio' },
  { nivel: 'C-', color: '#EA580C', texto: 'Medio bajo' },
  { nivel: 'D+', color: '#DC2626', texto: 'Bajo' },
  { nivel: 'D/E', color: '#991B1B', texto: 'Muy bajo' },
] as const;
const COLOR_NIVEL: Record<string, string> = Object.fromEntries(NIVELES.map(n => [n.nivel, n.color]));
const SIN_DATOS = '#9CA3AF';

// Escala de calor (de poca a mucha concentración)
const ESCALA_CALOR = ['#FDE68A', '#FDBA74', '#F97316', '#DC2626', '#7F1D1D'];

function esc(t: string): string {
  return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

interface Props {
  nse: ResultadoNse;
  leads: Lead[];
  centroLat: number;
  centroLon: number;
}

export const MapaZona: React.FC<Props> = ({ nse, leads, centroLat, centroLon }) => {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capaDatos = useRef<L.LayerGroup | null>(null);
  const capaBase = useRef<L.LayerGroup | null>(null);
  const [vista, setVista] = useState<Vista>('colonias');
  const [nivelesActivos, setNivelesActivos] = useState<Set<string>>(new Set(NIVELES.map(n => n.nivel)));
  const [capaCalor, setCapaCalor] = useState<CapaCalor>('total');
  const [filtroGiro, setFiltroGiro] = useState('');
  const [mostrarAnillos, setMostrarAnillos] = useState(true);
  const [zoom, setZoom] = useState(13);

  const nivelPorColonia = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of nse.colonias) if (c.indice !== null) m.set(c.colonia.toLowerCase(), c.nivel.nivel);
    return m;
  }, [nse]);

  // ── Crear el mapa una sola vez ───────────────────────────
  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const m = L.map(contenedor.current, { zoomControl: true, preferCanvas: true })
      .setView([centroLat, centroLon], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO · Datos: DENUE INEGI',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(m);
    capaBase.current = L.layerGroup().addTo(m);
    capaDatos.current = L.layerGroup().addTo(m);
    m.on('zoomend', () => setZoom(m.getZoom()));
    mapa.current = m;

    // Encuadrar la zona escaneada
    const pts = nse.colonias.filter(c => c.indice !== null).map(c => L.latLng(c.lat, c.lon));
    if (pts.length > 1) m.fitBounds(L.latLngBounds(pts).pad(0.08));
    setZoom(m.getZoom());
    setTimeout(() => m.invalidateSize(), 150);

    return () => { m.remove(); mapa.current = null; };
  }, []);

  // ── Tu trabajo + anillos de distancia ────────────────────
  useEffect(() => {
    const g = capaBase.current;
    if (!g) return;
    g.clearLayers();
    const base = L.latLng(BASE_TRABAJO.lat, BASE_TRABAJO.lon);
    if (mostrarAnillos) {
      for (const km of [2, 5, 10]) {
        L.circle(base, {
          radius: km * 1000, color: '#7C3AED', weight: 1.5, dashArray: '6 6', fill: false, interactive: false,
        }).addTo(g);
        const etiqueta = L.latLng(BASE_TRABAJO.lat + km / 111, BASE_TRABAJO.lon);
        L.marker(etiqueta, {
          interactive: false,
          icon: L.divIcon({
            className: '',
            html: `<span style="background:#7C3AED;color:#fff;font:700 10px Poppins,sans-serif;padding:1px 6px;border-radius:8px;white-space:nowrap">${km} km</span>`,
            iconSize: [36, 14], iconAnchor: [18, 7],
          }),
        }).addTo(g);
      }
    }
    L.marker(base, {
      zIndexOffset: 2000,
      icon: L.divIcon({
        className: '',
        html: `<div style="width:30px;height:30px;border-radius:50%;background:#7C3AED;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:15px">⭐</div>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
      }),
    }).bindPopup(`<b>Mi trabajo</b><br>${esc(BASE_TRABAJO.direccion)}`).addTo(g);
  }, [mostrarAnillos]);

  // ── Capa de datos según la vista ─────────────────────────
  useEffect(() => {
    const m = mapa.current, g = capaDatos.current;
    if (!m || !g) return;
    g.clearLayers();

    if (vista === 'colonias') {
      const visibles = nse.colonias.filter(c => c.indice !== null && nivelesActivos.has(c.nivel.nivel));
      const max = Math.max(1, ...visibles.map(c => c.total));
      // Grandes primero para que las chicas queden encima
      [...visibles].sort((a, b) => b.total - a.total).forEach((c: ColoniaNse) => {
        const radio = 7 + 15 * Math.sqrt(c.total / max);
        const color = COLOR_NIVEL[c.nivel.nivel] || SIN_DATOS;
        const mk = L.circleMarker([c.lat, c.lon], {
          radius: radio, color: '#FFFFFF', weight: 2, fillColor: color, fillOpacity: 0.85,
        });
        mk.bindTooltip(`<b>${esc(c.colonia)}</b> · ${c.nivel.nivel}`, {
          direction: 'top', offset: [0, -radio], permanent: zoom >= 15, className: 'tooltip-colonia',
        });
        mk.bindPopup(`
          <div style="font-family:Poppins,sans-serif;min-width:220px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="background:${color};color:#fff;font-weight:800;padding:3px 8px;border-radius:6px">${c.nivel.nivel}</span>
              <b style="font-size:13px">${esc(c.colonia)}</b>
            </div>
            <div style="font-size:12px;color:#334155;line-height:1.5">
              C.P. ${esc(c.cp)} · ${c.total.toLocaleString('es-MX')} negocios<br>
              Índice ${c.indice}/100 · ${c.distancia_km} km de tu trabajo<br>
              <span style="color:#6B21A8">🚗 ${esc(c.nivel.perfilVenta)}</span>
            </div>
            <a href="${rutaDesdeTrabajo(c.lat, c.lon)}" target="_blank" rel="noopener"
               style="display:block;margin-top:8px;text-align:center;background:#16A34A;color:#fff;font-weight:700;padding:6px;border-radius:8px;text-decoration:none">🧭 Cómo llegar</a>
          </div>`);
        mk.addTo(g);
      });
    }

    if (vista === 'calor') {
      // Suavizado 3×3 (centro 4, lados 2, esquinas 1) para ver corredores y no "ruido"
      const paso = nse.densidad[0]?.paso || 0.0025;
      const base = new Map<string, number>();
      for (const d of nse.densidad) {
        if (d[capaCalor] > 0) base.set(`${Math.round(d.lat / paso)},${Math.round(d.lon / paso)}`, d[capaCalor]);
      }
      const suav = new Map<string, number>();
      base.forEach((_, k) => {
        const [i, j] = k.split(',').map(Number);
        for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
          const kk = `${i + di},${j + dj}`;
          if (suav.has(kk)) continue;
          let sum = 0, peso = 0;
          for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
            const w = (a === 0 ? 2 : 1) * (b === 0 ? 2 : 1);
            sum += (base.get(`${i + di + a},${j + dj + b}`) || 0) * w;
            peso += w;
          }
          if (sum > 0) suav.set(kk, sum / peso);
        }
      });
      const valores = [...suav.values()].sort((x, y) => x - y);
      const n = ESCALA_CALOR.length;
      const cortes = ESCALA_CALOR.map((_, i) => valores[Math.floor((i / n) * (valores.length - 1))] ?? 0);
      const colorDe = (v: number) => {
        let idx = 0;
        for (let i = 0; i < cortes.length; i++) if (v >= cortes[i]) idx = i;
        return idx;
      };
      const etiqueta = capaCalor === 'total' ? 'negocios' : capaCalor === 'alto' ? 'giros de zona alta' : 'giros populares';
      suav.forEach((v, k) => {
        const [i, j] = k.split(',').map(Number);
        const idx = colorDe(v);
        const r = L.rectangle([[i * paso, j * paso], [(i + 1) * paso, (j + 1) * paso]], {
          stroke: false, fillColor: ESCALA_CALOR[idx], fillOpacity: 0.35 + idx * 0.1,
        });
        const real = base.get(k) || 0;
        r.bindTooltip(`${real.toLocaleString('es-MX')} ${etiqueta} en este cuadro (~275 m)`, { sticky: true });
        r.addTo(g);
      });
    }

    if (vista === 'negocios') {
      const q = filtroGiro.trim().toLowerCase();
      const visibles = leads.filter(l => {
        if (!l.lat || !l.lng) return false;
        if (q && !(`${l.categoria} ${l.nombre_negocio}`.toLowerCase().includes(q))) return false;
        const nivel = nivelPorColonia.get((l.colonia || '').toLowerCase());
        return !nivel || nivelesActivos.has(nivel);
      });
      // Agrupar: cuadrícula de 64 px y luego unir grupos cuyos centros queden a < 52 px
      const TAM = 64, MIN_SEP = 52;
      const celdasPx = new Map<string, Lead[]>();
      for (const l of visibles) {
        const p = m.project([l.lat!, l.lng!], zoom);
        const k = `${Math.floor(p.x / TAM)},${Math.floor(p.y / TAM)}`;
        (celdasPx.get(k) || celdasPx.set(k, []).get(k)!).push(l);
      }
      const centroPx = (gr: Lead[]) => {
        const xs = gr.map(l => m.project([l.lat!, l.lng!], zoom));
        return L.point(xs.reduce((a, p) => a + p.x, 0) / xs.length, xs.reduce((a, p) => a + p.y, 0) / xs.length);
      };
      const grupos: Lead[][] = [];
      [...celdasPx.values()].sort((a, b) => b.length - a.length).forEach(gr => {
        const c = centroPx(gr);
        const cerca = grupos.find(o => centroPx(o).distanceTo(c) < MIN_SEP);
        if (cerca) cerca.push(...gr); else grupos.push([...gr]);
      });
      grupos.forEach(grupo => {
        if (grupo.length === 1 || zoom >= 18) {
          for (const l of grupo) {
            const nivel = nivelPorColonia.get((l.colonia || '').toLowerCase());
            const color = (nivel && COLOR_NIVEL[nivel]) || '#7C3AED';
            const tel = l.telefono && l.telefono !== 'N/A' ? l.telefono : '';
            L.circleMarker([l.lat!, l.lng!], {
              radius: 6, color: '#FFFFFF', weight: 2, fillColor: color, fillOpacity: 0.95,
            }).bindPopup(`
              <div style="font-family:Poppins,sans-serif;min-width:220px;max-width:260px">
                <div style="font-size:10px;font-weight:700;color:#6B21A8;margin-bottom:3px">${esc(l.categoria)}</div>
                <b style="font-size:13px">${esc(l.nombre_negocio || 'Sin nombre')}</b>
                <div style="font-size:11px;color:#475569;margin:4px 0">${esc(l.direccion_completa)}</div>
                ${tel ? `<div style="font-size:12px">📞 <a href="tel:${esc(tel)}">${esc(tel)}</a></div>` : ''}
                ${nivel ? `<div style="font-size:11px;margin-top:2px">Colonia nivel <b>${nivel}</b></div>` : ''}
                <a href="${esc(l.link_navegacion)}" target="_blank" rel="noopener"
                   style="display:block;margin-top:8px;text-align:center;background:#16A34A;color:#fff;font-weight:700;padding:6px;border-radius:8px;text-decoration:none">🧭 Cómo llegar</a>
              </div>`).addTo(g);
          }
          return;
        }
        const lat = grupo.reduce((s, l) => s + l.lat!, 0) / grupo.length;
        const lon = grupo.reduce((s, l) => s + l.lng!, 0) / grupo.length;
        const n = grupo.length;
        const tam = n < 10 ? 30 : n < 50 ? 38 : 46;
        L.marker([lat, lon], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:${tam}px;height:${tam}px;border-radius:50%;background:rgba(124,58,237,.92);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);color:#fff;font:800 12px Poppins,sans-serif;display:flex;align-items:center;justify-content:center">${n}</div>`,
            iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2],
          }),
        }).on('click', () => {
          m.fitBounds(L.latLngBounds(grupo.map(l => L.latLng(l.lat!, l.lng!))).pad(0.3), { maxZoom: 18 });
        }).bindTooltip(`${n} negocios · clic para acercar`, { direction: 'top' }).addTo(g);
      });
    }
  }, [vista, nivelesActivos, capaCalor, filtroGiro, zoom, nse, leads, nivelPorColonia]);

  const alternarNivel = (n: string) => {
    setNivelesActivos(prev => {
      const s = new Set(prev);
      if (s.has(n)) s.delete(n); else s.add(n);
      return s.size ? s : new Set(NIVELES.map(x => x.nivel));
    });
  };

  const conteoNivel = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of nse.colonias) if (x.indice !== null) c[x.nivel.nivel] = (c[x.nivel.nivel] || 0) + 1;
    return c;
  }, [nse]);

  const boton = (v: Vista, txt: string) => (
    <button
      id={`btn-vista-${v}`}
      onClick={() => setVista(v)}
      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${vista === v
        ? 'bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white shadow-lg'
        : 'bg-[#1C1433] text-[#E9D5FF] hover:bg-[#2A1D4A]'}`}
    >
      {txt}
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Controles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {boton('colonias', '🎯 Colonias por nivel')}
          {boton('calor', '🔥 Mapa de calor')}
          {boton('negocios', '📍 Negocios')}
        </div>
        <label className="flex items-center gap-2 text-xs text-[#E9D5FF] cursor-pointer">
          <input type="checkbox" checked={mostrarAnillos} onChange={e => setMostrarAnillos(e.target.checked)} className="accent-purple-500" />
          Anillos de 2, 5 y 10 km desde mi trabajo
        </label>
      </div>

      {/* Filtros según vista */}
      {(vista === 'colonias' || vista === 'negocios') && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-gray-400 mr-1">Nivel:</span>
          {NIVELES.map(n => (
            <button
              key={n.nivel}
              onClick={() => alternarNivel(n.nivel)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${nivelesActivos.has(n.nivel) ? 'text-white border-white/30' : 'text-gray-500 border-transparent opacity-40'}`}
              style={{ backgroundColor: nivelesActivos.has(n.nivel) ? `${n.color}CC` : '#1C1433' }}
              title={n.texto}
            >
              {n.nivel} <span className="font-normal opacity-80">({conteoNivel[n.nivel] || 0})</span>
            </button>
          ))}
          {vista === 'negocios' && (
            <input
              value={filtroGiro}
              onChange={e => setFiltroGiro(e.target.value)}
              placeholder="Filtrar giro (ej: consultorio, taller, restaurante)"
              className="ml-auto bg-[#0A0713] border border-[#6B21A8]/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none w-full sm:w-72"
            />
          )}
        </div>
      )}
      {vista === 'calor' && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-gray-400 mr-1">Mostrar concentración de:</span>
          {([['total', 'Todos los negocios'], ['alto', 'Giros de zona alta'], ['bajo', 'Giros populares']] as const).map(([k, t]) => (
            <button
              key={k}
              onClick={() => setCapaCalor(k)}
              className={`px-2.5 py-1 rounded-lg font-bold ${capaCalor === k ? 'bg-[#9333EA] text-white' : 'bg-[#1C1433] text-[#E9D5FF]'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Mapa */}
      <div className="relative rounded-2xl overflow-hidden border border-purple-900/50">
        <div id="mapa-zona" ref={contenedor} style={{ height: 560 }} />

        {/* Leyenda */}
        <div className="absolute bottom-3 left-3 z-[500] bg-white/95 text-slate-800 rounded-xl shadow-lg px-3 py-2 text-[11px] max-w-[260px]">
          {vista === 'colonias' && (
            <>
              <p className="font-bold mb-1">Nivel socioeconómico estimado</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {NIVELES.map(n => (
                  <span key={n.nivel} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: n.color }} />
                    <b>{n.nivel}</b> {n.texto}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-slate-500">Tamaño del círculo = número de negocios</p>
            </>
          )}
          {vista === 'calor' && (
            <>
              <p className="font-bold mb-1">Negocios por cuadro de ~275 m</p>
              <div className="flex h-2.5 rounded overflow-hidden">
                {ESCALA_CALOR.map(c => <span key={c} className="flex-1" style={{ backgroundColor: c }} />)}
              </div>
              <div className="flex justify-between text-slate-500 mt-0.5"><span>Pocos</span><span>Muchos</span></div>
            </>
          )}
          {vista === 'negocios' && (
            <>
              <p className="font-bold mb-1">Negocios destacados</p>
              <p className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-[#7C3AED] text-white text-[9px] font-bold flex items-center justify-center">12</span> Grupo: clic para acercar</p>
              <p className="flex items-center gap-1.5 mt-0.5"><span className="w-3 h-3 rounded-full bg-[#16A34A] inline-block" /> Negocio (color = nivel de su colonia)</p>
            </>
          )}
          <p className="flex items-center gap-1.5 mt-1 border-t border-slate-200 pt-1">⭐ Mi trabajo</p>
        </div>
      </div>
    </div>
  );
};
