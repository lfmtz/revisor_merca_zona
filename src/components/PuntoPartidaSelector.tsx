import React, { useState } from 'react';
import { Loader2, LocateFixed, Search, Briefcase, Building2, MapPin } from 'lucide-react';
import { llamarApi } from '../services/apiCliente';
import { BASE_TRABAJO, PuntoPartida } from '../services/apifyService';

export type ModoUbicacion = 'trabajo' | 'gps' | 'direccion' | 'municipio';

interface Props {
  modo: ModoUbicacion;
  punto: PuntoPartida | null;
  radioKm: number;
  onCambio: (modo: ModoUbicacion, punto: PuntoPartida | null) => void;
}

const STORAGE = 'leadscrapper_ultimo_punto';

export function puntoGuardado(): { modo: ModoUbicacion; punto: PuntoPartida } | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE) || 'null');
    if (v && v.punto && Number.isFinite(v.punto.lat) && Number.isFinite(v.punto.lon)) return v;
  } catch { /* */ }
  return null;
}

function guardar(modo: ModoUbicacion, punto: PuntoPartida) {
  try { localStorage.setItem(STORAGE, JSON.stringify({ modo, punto })); } catch { /* */ }
}

/** Acepta "19.40, -99.06" o enlaces de Google Maps (…/@19.40,-99.06,… o ?q=19.40,-99.06). */
export function coordenadasDeTexto(t: string): { lat: number; lon: number } | null {
  const pats = [
    /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /[?&](?:q|query|destination|ll)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/,
  ];
  for (const p of pats) {
    const m = t.match(p);
    if (m) {
      const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
      if (lat > 14 && lat < 33 && lon > -119 && lon < -86) return { lat, lon };
    }
  }
  return null;
}

async function direccionDe(lat: number, lon: number): Promise<string> {
  try {
    const d = await llamarApi(`/api/geo?lat=${lat}&lon=${lon}`);
    return d.direccion || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

export const PuntoPartidaSelector: React.FC<Props> = ({ modo, punto, radioKm, onCambio }) => {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [candidatos, setCandidatos] = useState<{ direccion: string; lat: number; lon: number }[]>([]);

  const elegir = (m: ModoUbicacion, p: PuntoPartida | null) => {
    setError(null);
    if (p && (m === 'gps' || m === 'direccion')) guardar(m, p);
    onCambio(m, p);
  };

  const cambiarModo = (m: ModoUbicacion) => {
    setCandidatos([]); setError(null); setAviso(null);
    if (m === 'trabajo') return elegir('trabajo', { ...BASE_TRABAJO });
    if (m === 'municipio') return elegir('municipio', null);
    const previo = puntoGuardado();
    elegir(m, previo && previo.modo === m ? previo.punto : null);
  };

  const usarGps = () => {
    if (!('geolocation' in navigator)) { setError('Tu navegador no permite obtener la ubicación.'); return; }
    setCargando(true); setError(null); setAviso(null);
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lon, accuracy } = pos.coords;
      const direccion = await direccionDe(lat, lon);
      elegir('gps', { nombre: 'Mi ubicación', direccion, lat, lon });
      if (accuracy > 300) {
        setAviso(`Precisión aproximada: ±${Math.round(accuracy)} m (las laptops ubican por Wi-Fi). ` +
          'Revisa que la dirección sea correcta; si no, usa "Otra dirección".');
      } else {
        setAviso(`Precisión: ±${Math.round(accuracy)} m.`);
      }
      setCargando(false);
    }, e => {
      setCargando(false);
      setError(e.code === 1
        ? 'No diste permiso de ubicación. Actívalo en el candado de la barra de direcciones, o usa "Otra dirección".'
        : 'No se pudo obtener tu ubicación. Intenta de nuevo o usa "Otra dirección".');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  };

  const buscarDireccion = async () => {
    const t = texto.trim();
    if (!t) return;
    setError(null); setCandidatos([]);
    const c = coordenadasDeTexto(t);
    if (c) {
      setCargando(true);
      const direccion = await direccionDe(c.lat, c.lon);
      setCargando(false);
      return elegir('direccion', { nombre: 'Punto elegido', direccion, ...c });
    }
    setCargando(true);
    try {
      const d = await llamarApi(`/api/geo?q=${encodeURIComponent(t)}`);
      const r = d.resultados || [];
      if (!r.length) setError('No encontré esa dirección. Agrega colonia, alcaldía o municipio, o pega un enlace de Google Maps.');
      else if (r.length === 1) elegir('direccion', { nombre: 'Punto elegido', ...r[0] });
      else setCandidatos(r);
    } catch (e: any) {
      setError(e?.message || 'No se pudo buscar la dirección.');
    } finally {
      setCargando(false);
    }
  };

  const opcion = (m: ModoUbicacion, icono: React.ReactNode, titulo: string, sub: string) => (
    <button
      type="button"
      id={`btn-ubicacion-${m}`}
      onClick={() => cambiarModo(m)}
      className={`text-left rounded-xl border p-3 transition ${modo === m
        ? 'border-[#C084FC] bg-purple-900/40' : 'border-[#3B1F6E]/60 bg-[#0A0713] hover:border-[#6B21A8]'}`}
    >
      <span className="flex items-center gap-2 text-sm font-bold text-white">{icono}{titulo}</span>
      <span className="block text-[11px] text-[#E9D5FF]/60 mt-0.5">{sub}</span>
    </button>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-[#C084FC]">¿Desde dónde buscar?</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {opcion('trabajo', <Briefcase className="w-4 h-4 text-[#C084FC]" />, 'Mi trabajo', 'Calz. Ignacio Zaragoza 957-A')}
        {opcion('gps', <LocateFixed className="w-4 h-4 text-emerald-400" />, 'Mi ubicación', 'Donde estoy ahora')}
        {opcion('direccion', <MapPin className="w-4 h-4 text-amber-400" />, 'Otra dirección', 'Escribir o pegar de Maps')}
        {opcion('municipio', <Building2 className="w-4 h-4 text-sky-400" />, 'Un municipio', 'Todo el municipio')}
      </div>

      {modo === 'gps' && (
        <button
          type="button"
          id="btn-usar-gps"
          onClick={usarGps}
          disabled={cargando}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
          {punto ? 'Volver a obtener mi ubicación' : 'Obtener mi ubicación'}
        </button>
      )}

      {modo === 'direccion' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              id="input-direccion-partida"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarDireccion(); } }}
              placeholder="Ej: Av. Chimalhuacán 123, Nezahualcóyotl  ·  o pega un enlace de Google Maps"
              className="flex-1 bg-[#0A0713] border border-[#6B21A8]/60 focus:border-[#C084FC] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none"
            />
            <button
              type="button"
              id="btn-buscar-direccion"
              onClick={buscarDireccion}
              disabled={cargando || !texto.trim()}
              className="px-4 rounded-xl bg-[#9333EA] hover:bg-[#A855F7] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
            >
              {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Buscar
            </button>
          </div>
          {candidatos.length > 0 && (
            <div className="bg-[#0A0713] border border-[#6B21A8]/50 rounded-xl divide-y divide-purple-900/40">
              <p className="px-3 py-2 text-[11px] text-[#C084FC] font-bold">Encontré varias, elige la correcta:</p>
              {candidatos.map((c, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => { setCandidatos([]); elegir('direccion', { nombre: 'Punto elegido', ...c }); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-white/5"
                >
                  📍 {c.direccion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-300">{error}</p>}

      {modo !== 'municipio' && punto && (
        <div id="punto-elegido" className="bg-[#0A0713] border border-emerald-800/60 rounded-xl p-3 text-xs space-y-1">
          <p className="text-emerald-400 font-bold">✅ Se buscará {radioKm} km a la redonda de: {punto.nombre}</p>
          <p className="text-gray-200">{punto.direccion}</p>
          <p className="text-gray-500 font-mono">{punto.lat.toFixed(5)}, {punto.lon.toFixed(5)} ·{' '}
            <a href={`https://www.google.com/maps/search/?api=1&query=${punto.lat},${punto.lon}`} target="_blank"
               rel="noopener noreferrer" className="text-[#C084FC] underline">Verificar en Google Maps</a>
          </p>
          {aviso && <p className="text-amber-300">{aviso}</p>}
          <p className="text-gray-500">Distancias, rutas 🧭 y búsquedas de Apify saldrán desde este punto.</p>
        </div>
      )}
      {modo !== 'municipio' && !punto && !cargando && (
        <p className="text-xs text-amber-300">
          {modo === 'gps' ? 'Da clic en "Obtener mi ubicación" (el navegador te pedirá permiso).' : 'Escribe la dirección y da "Buscar".'}
        </p>
      )}
    </div>
  );
};
