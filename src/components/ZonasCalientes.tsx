import React, { useEffect, useMemo, useState } from 'react';
import { ResultadoNse } from '../services/denueScan';
import { PUNTO_PARTIDA, rutaDesdeTrabajo } from '../services/apifyService';
import { cargarAgebs, perfilZona, Ageb } from '../services/censo';
import { llamarApi } from '../services/apiCliente';
import { zonasPorCp } from '../utils/planMeta';
import { segmentoDeClase } from '../utils/segmentos';
import { NOMBRE_SEGMENTO, BUSQUEDAS_SEGMENTO } from '../utils/modelos';
import {
  obtenerGA, RespuestaGA, resumirModelos, ResumenModelo, mejoresFranjas, nombreDia,
  zonasDelModelo, evaluarPublicacion, Publicacion, Evaluacion, desfaseHoras,
} from '../utils/zonasCalientes';

interface Props {
  zona: string;
  radioKm: number;
  nse: ResultadoNse;
  municipio?: string;
}

const hoy = () => new Date().toISOString().slice(0, 10);
const haceDias = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const norm = (t: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CANAL: Record<string, string> = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Correo', directo: 'Directo', otros: 'Otros (TikTok, tarjeta, calle…)' };
const FRANJAS = ['todo el día', ...Array.from({ length: 12 }, (_, i) => `${String(i * 2).padStart(2, '0')}:00–${String((i * 2 + 2) % 24).padStart(2, '0')}:00`)];
const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

interface NegocioVisita {
  id: string; nombre: string; actividad: string; estrato: string; telefono: string;
  direccion: string; cp: string; lat: number; lon: number; segmento: string; distancia: number;
}

function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export const ZonasCalientes: React.FC<Props> = ({ zona, radioKm, nse, municipio = '' }) => {
  const [desde, setDesde] = useState(haceDias(90));
  const [hasta, setHasta] = useState(hoy());
  const [ga, setGa] = useState<RespuestaGA | null>(null);
  const [cargandoGa, setCargandoGa] = useState(false);
  const [errorGa, setErrorGa] = useState<string | null>(null);
  const [agebs, setAgebs] = useState<Ageb[] | null>(null);
  const [sel, setSel] = useState<string>('');
  const [negocios, setNegocios] = useState<NegocioVisita[] | null>(null);
  const [cargandoNeg, setCargandoNeg] = useState(false);
  const [soloCalientes, setSoloCalientes] = useState(true);
  const [copiado, setCopiado] = useState<string | null>(null);

  const consultar = async () => {
    setCargandoGa(true); setErrorGa(null);
    try { setGa(await obtenerGA(desde, hasta)); }
    catch (e: any) { setErrorGa(e?.message || 'No se pudo consultar Google Analytics.'); }
    finally { setCargandoGa(false); }
  };
  useEffect(() => { consultar(); }, []);
  useEffect(() => {
    cargarAgebs().then(t => setAgebs(perfilZona(t, PUNTO_PARTIDA, radioKm, municipio).agebs)).catch(() => setAgebs([]));
  }, [radioKm, municipio, zona]);

  const resumenes = useMemo(() => (ga ? resumirModelos(ga) : []), [ga]);
  const zonas = useMemo(() => (agebs ? zonasPorCp(nse.colonias, agebs) : []), [agebs, nse]);
  useEffect(() => { if (!sel && resumenes.length) setSel(resumenes[0].m.modelo); }, [resumenes]);
  const actual: ResumenModelo | undefined = resumenes.find(r => r.m.modelo === sel);
  const calientes = useMemo(() => (actual ? zonasDelModelo(zonas, actual) : []), [actual, zonas]);
  useEffect(() => { setNegocios(null); }, [sel]);

  const copiar = (t: string, id: string) => { navigator.clipboard.writeText(t); setCopiado(id); setTimeout(() => setCopiado(null), 1600); };

  const buscarNegocios = async () => {
    if (!actual) return;
    setCargandoNeg(true);
    const vistos = new Map<string, NegocioVisita>();
    const radio = Math.min(5000, Math.round(radioKm * 1000));
    for (const seg of actual.perfil.segmentos) {
      for (const termino of BUSQUEDAS_SEGMENTO[seg] || []) {
        try {
          const qs = new URLSearchParams({ termino, lat: String(PUNTO_PARTIDA.lat), lon: String(PUNTO_PARTIDA.lon), radio_m: String(radio), limite: '1500' });
          const d = await llamarApi(`/api/denue?${qs.toString()}`);
          for (const it of d.items || []) {
            const sg = segmentoDeClase(norm(it.actividad));
            if (!sg || !actual.perfil.segmentos.includes(sg)) continue;
            const cp = it.cp || (String(it.direccion).match(/C\.P\. (\d{5})/)?.[1] ?? '');
            vistos.set(it.id, {
              id: it.id, nombre: it.nombre, actividad: it.actividad, estrato: it.estrato, telefono: it.telefono,
              direccion: it.direccion, cp, lat: it.lat, lon: it.lon, segmento: sg,
              distancia: Number(km(PUNTO_PARTIDA.lat, PUNTO_PARTIDA.lon, it.lat, it.lon).toFixed(1)),
            });
          }
        } catch { /* se omite ese término */ }
      }
    }
    const rango = (e: string) => /^0 a 5/.test(e) ? 0 : /^6 a 10/.test(e) ? 1 : 2;
    setNegocios([...vistos.values()].sort((a, b) => rango(b.estrato) - rango(a.estrato) || a.distancia - b.distancia));
    setCargandoNeg(false);
  };

  const cpsCalientes = new Set(calientes.slice(0, 8).map(c => c.z.cp));
  const listaNeg = (negocios || []).filter(n => !soloCalientes || cpsCalientes.has(n.cp));
  const descargarNegocios = () => {
    const enc = ['Nombre', 'Giro', 'Empleados', 'Teléfono', 'Dirección', 'C.P.', 'Distancia (km)', 'Ruta'];
    const filas = listaNeg.map(n => [n.nombre, n.actividad, n.estrato, n.telefono, n.direccion, n.cp, n.distancia, rutaDesdeTrabajo(n.lat, n.lon)]);
    const csv = '﻿' + [enc, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url;
    a.download = `negocios_${sel.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Evaluador ─────────────────────────────────────────
  const [pub, setPub] = useState<Publicacion>({
    modelo: '', cps: [], edadMin: 25, edadMax: 50, franja: 'todo el día', dias: [], formato: 'video_vertical', copy: '', palabrasClave: '',
  });
  const [cpsTexto, setCpsTexto] = useState('');
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  useEffect(() => { if (sel && !pub.modelo) setPub(p => ({ ...p, modelo: sel })); }, [sel]);
  const evaluar = () => {
    const cps = cpsTexto.split(/[^0-9]+/).filter(x => /^\d{5}$/.test(x));
    setEvaluacion(evaluarPublicacion({ ...pub, cps }, resumenes, zonas));
  };
  const usarRecomendado = () => {
    if (!actual) return;
    setPub(p => ({
      ...p, modelo: actual.m.modelo, edadMin: actual.perfil.edad[0], edadMax: actual.perfil.edad[1],
      franja: mejoresFranjas(actual.horas, 1)[0] || 'todo el día', dias: actual.dias.slice(0, 3).map(d => d.dia),
      formato: 'video_vertical',
    }));
    setCpsTexto(calientes.slice(0, 8).map(c => c.z.cp).join(', '));
  };

  const Celda = ({ children, className = '' }: { children: React.ReactNode; className?: string }) =>
    <td className={`py-2 px-3 ${className}`}>{children}</td>;

  return (
    <div id="view-zonas-calientes" className="space-y-5 text-xs">
      {/* Encabezado y fechas */}
      <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <p className="text-[#C084FC] font-bold uppercase">Zonas calientes por modelo</p>
            <h3 className="text-lg font-extrabold text-white">Lo que le interesa a tu público × {zona}</h3>
            <p className="text-gray-400">Google Analytics de tu landing (cartera y prospectos) cruzado con negocios y hogares de INEGI.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1"><span className="block text-gray-400">Desde</span>
              <input id="ga-desde" type="date" value={desde} max={hasta} onChange={e => setDesde(e.target.value)} className="bg-[#0A0713] border border-[#6B21A8]/60 rounded-lg px-2 py-1.5 text-white" /></label>
            <label className="space-y-1"><span className="block text-gray-400">Hasta</span>
              <input id="ga-hasta" type="date" value={hasta} min={desde} max={hoy()} onChange={e => setHasta(e.target.value)} className="bg-[#0A0713] border border-[#6B21A8]/60 rounded-lg px-2 py-1.5 text-white" /></label>
            {[30, 60, 90].map(n => (
              <button key={n} onClick={() => { setDesde(haceDias(n)); setHasta(hoy()); }} className="px-2.5 py-1.5 rounded-lg bg-[#1C1433] text-[#E9D5FF] font-bold">{n} días</button>
            ))}
            <button id="btn-consultar-ga" onClick={consultar} disabled={cargandoGa} className="px-4 py-1.5 rounded-lg bg-[#9333EA] hover:bg-[#A855F7] disabled:opacity-50 text-white font-bold">
              {cargandoGa ? 'Consultando…' : 'Consultar'}
            </button>
          </div>
        </div>
        {errorGa && <p className="text-red-300">⚠️ {errorGa}</p>}
        {ga && (
          <div className="flex flex-wrap gap-4 text-gray-300">
            <span>👥 <b className="text-white">{ga.totales.usuarios}</b> usuarios</span>
            <span>🔁 <b className="text-white">{ga.totales.sesiones}</b> sesiones</span>
            <span>👀 <b className="text-white">{ga.totales.vistas_modelo}</b> vistas de modelos</span>
            <span>💬 <b className="text-emerald-400">{ga.totales.clics_whatsapp}</b> clics a WhatsApp</span>
          </div>
        )}
        {ga && ga.avisos.length > 0 && (
          <details className="text-amber-300/90"><summary className="cursor-pointer">⚠️ {ga.avisos.length} avisos sobre los datos</summary>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              {ga.avisos.map((a, i) => <li key={i}>{a}</li>)}
              {desfaseHoras(ga.avisos) > 0 && <li>Los horarios ya se muestran convertidos a hora de CDMX (+1 h).</li>}
            </ul>
          </details>
        )}
      </div>

      {/* Ranking de modelos */}
      {resumenes.length > 0 && (
        <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl overflow-hidden">
          <p className="px-4 pt-4 text-sm font-extrabold text-white">🏆 ¿Qué modelos le interesan a tu público? <span className="font-normal text-gray-400">(clic para elegir)</span></p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left">
              <thead className="bg-[#1A1033] text-[#E9D5FF]">
                <tr><th className="py-2 px-3">Modelo</th><th className="py-2 px-3">Perfil</th><th className="py-2 px-3 text-right">Vistas</th>
                  <th className="py-2 px-3 text-right">WhatsApp</th><th className="py-2 px-3">Mejor horario (CDMX)</th><th className="py-2 px-3">Días</th>
                  <th className="py-2 px-3">Canal</th><th className="py-2 px-3">Origen</th><th className="py-2 px-3">Confianza</th></tr>
              </thead>
              <tbody className="divide-y divide-purple-900/30 text-gray-200">
                {resumenes.map(r => (
                  <tr key={r.m.modelo} onClick={() => setSel(r.m.modelo)}
                    className={`cursor-pointer ${sel === r.m.modelo ? 'bg-purple-900/40' : 'hover:bg-white/[0.03]'}`}>
                    <Celda className="font-bold text-white">{r.m.modelo}</Celda>
                    <Celda className="text-gray-400">{r.perfil.etiqueta}</Celda>
                    <Celda className="text-right font-mono">{r.m.vistas}</Celda>
                    <Celda className="text-right font-mono text-emerald-400">{r.m.clics_whatsapp}</Celda>
                    <Celda>{mejoresFranjas(r.horas, 2).join(', ') || '—'}</Celda>
                    <Celda>{r.dias.slice(0, 2).map(d => nombreDia(d.dia)).join(', ') || '—'}</Celda>
                    <Celda>{CANAL[r.canalTop] || r.canalTop}</Celda>
                    <Celda>CDMX {r.pctCdmx}% · Edomex {r.pctEdomex}%</Celda>
                    <Celda><span className={r.confianza === 'alta' ? 'text-emerald-400' : r.confianza === 'media' ? 'text-amber-300' : 'text-gray-500'}>{r.confianza}</span></Celda>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-[11px] text-gray-500">Confianza baja = muy pocos datos: tómalo como pista, no como regla. Un clic a WhatsApp pesa como 5 vistas.</p>
        </div>
      )}

      {/* Zonas calientes del modelo elegido */}
      {actual && (
        <div id="zonas-modelo" className="bg-[#140E24] border border-purple-800/60 rounded-2xl p-5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-extrabold text-white">🔥 Zonas calientes para <span className="text-[#C084FC]">{actual.m.modelo}</span></p>
              <p className="text-gray-400">Perfil: {actual.perfil.etiqueta}{actual.perfil.segmentos.length ? ` · ${actual.perfil.segmentos.map(s => NOMBRE_SEGMENTO[s]).join(', ')}` : ` · hogares ${actual.perfil.niveles.join(', ')}`} · edad típica {actual.perfil.edad[0]}–{actual.perfil.edad[1]}</p>
            </div>
            {calientes.length > 0 && (
              <button onClick={() => copiar(calientes.slice(0, 8).map(c => c.z.cp).join(', '), 'cps')} className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold">
                {copiado === 'cps' ? '✅ Copiados' : '📋 Copiar C.P. para Meta'}
              </button>
            )}
          </div>
          {!agebs && <p className="text-gray-400">Cargando datos de la zona…</p>}
          {agebs && calientes.length === 0 && <p className="text-gray-400">No hay zonas con este perfil en el radio escaneado. Amplía el radio o elige otra zona.</p>}
          {calientes.length > 0 && (
            <div className="overflow-x-auto border border-purple-900/40 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-[#1A1033] text-[#E9D5FF]"><tr>
                  <th className="py-2 px-3">#</th><th className="py-2 px-3">C.P.</th><th className="py-2 px-3">Colonias</th><th className="py-2 px-3">Por qué</th>
                  <th className="py-2 px-3 text-right">Afinidad</th><th className="py-2 px-3 text-right">Distancia</th><th className="py-2 px-3 text-center">Ruta</th></tr></thead>
                <tbody className="divide-y divide-purple-900/30 text-gray-200">
                  {calientes.map((c, i) => (
                    <tr key={c.z.cp}>
                      <Celda className="font-mono text-gray-500">{i + 1}</Celda>
                      <Celda className="font-mono font-bold">{c.z.cp}</Celda>
                      <Celda className="text-gray-300">{c.z.colonias.filter((x, i, arr) => arr.findIndex(y => norm(y).replace(/agrocola/, 'agricola') === norm(x).replace(/agrocola/, 'agricola')) === i).slice(0, 3).join(', ')}</Celda>
                      <Celda className="text-gray-300">{c.motivo}</Celda>
                      <Celda className={`text-right font-bold ${c.afinidad >= 1.3 ? 'text-emerald-400' : c.afinidad >= 1 ? 'text-amber-300' : 'text-gray-400'}`}>×{c.afinidad}</Celda>
                      <Celda className="text-right font-mono">{c.z.distancia_km} km</Celda>
                      <Celda className="text-center"><a className="text-emerald-400 font-bold" href={rutaDesdeTrabajo(c.z.lat, c.z.lon)} target="_blank" rel="noopener noreferrer">🧭 Ir</a></Celda>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-gray-500">Afinidad ×1.5 = esa zona concentra 50% más del perfil del modelo que el promedio de tu radio. Se pondera por dónde está el interés en GA (CDMX/Edomex).</p>

          {/* Negocios para visitar */}
          {actual.perfil.tipo === 'trabajo' && (
            <div className="border-t border-purple-900/40 pt-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-white">🏪 Negocios para visitar o pautar con {actual.m.modelo}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={soloCalientes} onChange={e => setSoloCalientes(e.target.checked)} className="accent-purple-500" />
                    Solo en zonas calientes
                  </label>
                  {!negocios && (
                    <button id="btn-buscar-negocios-modelo" onClick={buscarNegocios} disabled={cargandoNeg} className="px-3 py-1.5 rounded-lg bg-[#9333EA] hover:bg-[#A855F7] disabled:opacity-50 text-white font-bold">
                      {cargandoNeg ? 'Buscando en INEGI…' : 'Buscar negocios (gratis)'}
                    </button>
                  )}
                  {negocios && <button onClick={descargarNegocios} className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold">📥 Excel ({listaNeg.length})</button>}
                </div>
              </div>
              {negocios && (
                <div className="overflow-x-auto max-h-80 border border-purple-900/40 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-[#1A1033] text-[#E9D5FF] sticky top-0"><tr>
                      <th className="py-2 px-3">Negocio</th><th className="py-2 px-3">Giro</th><th className="py-2 px-3">Empleados</th>
                      <th className="py-2 px-3">Teléfono</th><th className="py-2 px-3">Dirección</th><th className="py-2 px-3 text-right">Dist.</th><th className="py-2 px-3 text-center">Ruta</th></tr></thead>
                    <tbody className="divide-y divide-purple-900/30 text-gray-200">
                      {listaNeg.slice(0, 300).map(n => (
                        <tr key={n.id}>
                          <Celda className="font-bold text-white">{n.nombre || '—'}</Celda>
                          <Celda className="text-gray-400">{n.actividad}</Celda>
                          <Celda>{n.estrato}</Celda>
                          <Celda className="font-mono">{n.telefono || '—'}</Celda>
                          <Celda className="text-gray-300 min-w-[220px]">{n.direccion}</Celda>
                          <Celda className="text-right font-mono">{n.distancia} km</Celda>
                          <Celda className="text-center"><a className="text-emerald-400 font-bold" href={rutaDesdeTrabajo(n.lat, n.lon)} target="_blank" rel="noopener noreferrer">🧭</a></Celda>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {listaNeg.length === 0 && <p className="text-center py-6 text-gray-400">Sin negocios en las zonas calientes; desmarca "Solo en zonas calientes".</p>}
                </div>
              )}
              <p className="text-[11px] text-gray-500">Primero salen los negocios con más empleados (posibles flotillas). Búsqueda en el DENUE hasta 5 km del punto de partida.</p>
            </div>
          )}
        </div>
      )}

      {/* Evaluador de publicación */}
      {resumenes.length > 0 && (
        <div id="evaluador-publicacion" className="bg-[#140E24] border border-purple-900/40 rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-white">🧪 Evaluador de publicación</p>
            <button onClick={usarRecomendado} className="px-3 py-1.5 rounded-lg bg-[#1C1433] hover:bg-[#2A1D4A] text-[#E9D5FF] font-bold">✨ Llenar con lo recomendado para {sel || 'el modelo'}</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="space-y-1"><span className="text-gray-400">Modelo</span>
              <select value={pub.modelo} onChange={e => setPub({ ...pub, modelo: e.target.value })} className="w-full bg-[#0A0713] border border-[#6B21A8]/60 rounded-lg px-2 py-2 text-white">
                {resumenes.map(r => <option key={r.m.modelo} value={r.m.modelo}>{r.m.modelo}</option>)}
              </select></label>
            <label className="space-y-1"><span className="text-gray-400">Edad</span>
              <div className="flex items-center gap-2">
                <input type="number" min={18} max={65} value={pub.edadMin} onChange={e => setPub({ ...pub, edadMin: Number(e.target.value) })} className="w-20 bg-[#0A0713] border border-[#6B21A8]/60 rounded-lg px-2 py-2 text-white" />
                <span className="text-gray-400">a</span>
                <input type="number" min={18} max={65} value={pub.edadMax} onChange={e => setPub({ ...pub, edadMax: Number(e.target.value) })} className="w-20 bg-[#0A0713] border border-[#6B21A8]/60 rounded-lg px-2 py-2 text-white" />
              </div></label>
            <label className="space-y-1"><span className="text-gray-400">Formato del arte</span>
              <select value={pub.formato} onChange={e => setPub({ ...pub, formato: e.target.value as Publicacion['formato'] })} className="w-full bg-[#0A0713] border border-[#6B21A8]/60 rounded-lg px-2 py-2 text-white">
                <option value="video_vertical">Video vertical (reel / historia / TikTok)</option>
                <option value="carrusel">Carrusel de fotos</option>
                <option value="imagen">Una imagen</option>
                <option value="video_horizontal">Video horizontal</option>
              </select></label>
            <label className="space-y-1 md:col-span-2"><span className="text-gray-400">Códigos postales donde vas a pautar (vacío = todo el radio)</span>
              <input value={cpsTexto} onChange={e => setCpsTexto(e.target.value)} placeholder="08100, 57700, 09020" className="w-full bg-[#0A0713] border border-[#6B21A8]/60 rounded-lg px-2 py-2 text-white font-mono" /></label>
            <label className="space-y-1"><span className="text-gray-400">Horario</span>
              <select value={pub.franja} onChange={e => setPub({ ...pub, franja: e.target.value })} className="w-full bg-[#0A0713] border border-[#6B21A8]/60 rounded-lg px-2 py-2 text-white">
                {FRANJAS.map(f => <option key={f} value={f}>{f}</option>)}
              </select></label>
            <div className="space-y-1 md:col-span-3"><span className="text-gray-400">Días</span>
              <div className="flex flex-wrap gap-1.5">
                {DIAS.map(d => (
                  <button key={d} onClick={() => setPub({ ...pub, dias: pub.dias.includes(d) ? pub.dias.filter(x => x !== d) : [...pub.dias, d] })}
                    className={`px-2.5 py-1 rounded-lg font-bold ${pub.dias.includes(d) ? 'bg-[#9333EA] text-white' : 'bg-[#1C1433] text-gray-400'}`}>{nombreDia(d)}</button>
                ))}
                <span className="text-gray-500 self-center">(ninguno = todos)</span>
              </div></div>
            <label className="space-y-1 md:col-span-3"><span className="text-gray-400">Copy del anuncio</span>
              <textarea id="input-copy" value={pub.copy} onChange={e => setPub({ ...pub, copy: e.target.value })} rows={3}
                placeholder="Ej: ¿Tu negocio necesita carga? RAM 700 lista para trabajar en Neza e Iztacalco. Escríbeme por WhatsApp y te llevo la prueba a tu negocio."
                className="w-full bg-[#0A0713] border border-[#6B21A8]/60 rounded-lg px-2 py-2 text-white" /></label>
            <label className="space-y-1 md:col-span-3"><span className="text-gray-400">Palabras clave / tema (opcional)</span>
              <input value={pub.palabrasClave} onChange={e => setPub({ ...pub, palabrasClave: e.target.value })} placeholder="camioneta de carga, negocio, entrega inmediata" className="w-full bg-[#0A0713] border border-[#6B21A8]/60 rounded-lg px-2 py-2 text-white" /></label>
          </div>
          <button id="btn-evaluar" onClick={evaluar} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#6B21A8] to-[#9333EA] text-white font-extrabold">Evaluar publicación</button>

          {evaluacion && (
            <div id="resultado-evaluacion" className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
              <div className="bg-[#0A0713] rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <p className={`text-5xl font-extrabold ${evaluacion.nivel === 'Alta' ? 'text-emerald-400' : evaluacion.nivel === 'Media' ? 'text-amber-300' : 'text-red-400'}`}>{evaluacion.total}</p>
                <p className="text-white font-bold">de 100 · Afinidad {evaluacion.nivel}</p>
                <p className="text-gray-400 mt-1">{evaluacion.confianza}</p>
              </div>
              <div className="space-y-1.5">
                {evaluacion.partes.map(p => (
                  <div key={p.nombre}>
                    <div className="flex justify-between"><span className="text-gray-300">{p.nombre}</span><b className="text-white">{p.puntos}/{p.max}</b></div>
                    <div className="h-1.5 bg-[#1C1433] rounded-full overflow-hidden"><div className="h-full bg-[#9333EA]" style={{ width: `${(100 * p.puntos) / p.max}%` }} /></div>
                    <p className="text-[10px] text-gray-500">{p.nota}</p>
                  </div>
                ))}
              </div>
              <div className="bg-[#0A0713] rounded-xl p-4">
                <p className="font-bold text-[#C084FC] mb-1">Para subir el puntaje</p>
                {evaluacion.mejoras.length ? (
                  <ul className="list-disc pl-4 space-y-1 text-gray-200">{evaluacion.mejoras.map((m, i) => <li key={i}>{m}</li>)}</ul>
                ) : <p className="text-emerald-400">¡Así está bien armada!</p>}
              </div>
            </div>
          )}
          <p className="text-[11px] text-gray-500">
            El puntaje mide qué tan bien se alinea tu publicación con lo que tus datos muestran (interés en la web, zonas de INEGI, horario,
            formato, copy y edad). No es una probabilidad de venta: compáralo entre opciones y quédate con la más alta. Se volverá más preciso
            cuando GA reporte edad (Google Signals) y registres de qué anuncio vino cada venta.
          </p>
        </div>
      )}
    </div>
  );
};
