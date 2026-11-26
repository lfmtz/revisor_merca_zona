import React, { useMemo, useState } from 'react';
import { ResultadoNse } from '../services/denueScan';
import { rutaDesdeTrabajo, PUNTO_PARTIDA } from '../services/apifyService';

const NIVELES = ['A/B', 'C+', 'C', 'C-', 'D+', 'D/E'] as const;

interface Props {
  nse: ResultadoNse;
  zona: string;
}

export const NseZonaPanel: React.FC<Props> = ({ nse, zona }) => {
  const [filtroNivel, setFiltroNivel] = useState<string>('todos');
  const [orden, setOrden] = useState<'negocios' | 'nivel' | 'distancia'>('nivel');
  const [busqueda, setBusqueda] = useState('');

  const conDatos = nse.colonias.filter(c => c.indice !== null);
  const conteoPorNivel = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of conDatos) m[c.nivel.nivel] = (m[c.nivel.nivel] || 0) + 1;
    return m;
  }, [nse]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let l = conDatos.filter(c =>
      (filtroNivel === 'todos' || c.nivel.nivel === filtroNivel) &&
      (!q || c.colonia.toLowerCase().includes(q) || c.cp.includes(q)));
    if (orden === 'negocios') l = [...l].sort((a, b) => b.total - a.total);
    if (orden === 'nivel') l = [...l].sort((a, b) => (b.indice ?? 0) - (a.indice ?? 0));
    if (orden === 'distancia') l = [...l].sort((a, b) => a.distancia_km - b.distancia_km);
    return l;
  }, [nse, filtroNivel, orden, busqueda]);

  const ind = nse.indicadores;
  const pct = (n: number) => ind.total ? Math.round((n / ind.total) * 100) : 0;

  const descargarCsv = () => {
    const filas = [['Colonia', 'CP', 'Negocios', 'Indice', 'Nivel', 'Distancia_km', 'Perfil_de_venta', 'Ruta']];
    for (const c of lista) {
      filas.push([c.colonia, c.cp, String(c.total), String(c.indice ?? ''), c.nivel.nivel,
        String(c.distancia_km), c.nivel.perfilVenta, rutaDesdeTrabajo(c.lat, c.lon)]);
    }
    const csv = '﻿' + filas.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `nivel_socioeconomico_${zona.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="view-nse" className="space-y-4">
      {/* Resumen de la zona */}
      <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white shrink-0"
            style={{ backgroundColor: nse.nivel.color }}
          >
            {nse.nivel.nivel}
          </div>
          <div>
            <p className="text-xs text-[#C084FC] font-bold uppercase">Nivel socioeconómico estimado</p>
            <p className="text-lg font-extrabold text-white">{zona}</p>
            <p className="text-xs text-gray-300">
              {nse.nivel.descripcion} · índice {nse.indice ?? '—'}/100
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-300 space-y-1">
          <p>🏪 <b className="text-white">{ind.total.toLocaleString('es-MX')}</b> negocios analizados (DENUE INEGI)</p>
          <p>💼 Giros de zona alta: <b className="text-emerald-400">{pct(ind.alto)}%</b> · populares: <b className="text-orange-400">{pct(ind.bajo)}%</b></p>
          <p>🏢 Con más de 10 empleados: <b className="text-white">{pct(ind.grandes)}%</b> · con sitio web: <b className="text-white">{pct(ind.web)}%</b></p>
        </div>
        <div className="text-xs bg-[#0F0A1E] border border-purple-800/50 rounded-xl p-3">
          <p className="text-[#C084FC] font-bold mb-1">🚗 Perfil de venta sugerido</p>
          <p className="text-gray-200">{nse.nivel.perfilVenta}</p>
        </div>
      </div>

      {/* Conteo por nivel */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroNivel('todos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${filtroNivel === 'todos' ? 'bg-[#9333EA] border-[#C084FC] text-white' : 'bg-[#140E24] border-purple-900/50 text-[#E9D5FF]'}`}
        >
          Todas ({conDatos.length})
        </button>
        {NIVELES.map(n => (
          <button
            key={n}
            onClick={() => setFiltroNivel(n)}
            disabled={!conteoPorNivel[n]}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-30 ${filtroNivel === n ? 'bg-[#9333EA] border-[#C084FC] text-white' : 'bg-[#140E24] border-purple-900/50 text-[#E9D5FF]'}`}
          >
            {n} ({conteoPorNivel[n] || 0})
          </button>
        ))}
      </div>

      {/* Tabla por colonia */}
      <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between p-3 border-b border-purple-900/40">
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar colonia o C.P."
            className="bg-[#0A0713] border border-[#6B21A8]/50 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none w-full sm:w-72"
          />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Ordenar:</span>
            <select
              value={orden}
              onChange={e => setOrden(e.target.value as any)}
              className="bg-[#0A0713] border border-[#6B21A8]/50 rounded-lg px-2 py-1.5 text-white"
            >
              <option value="nivel">Mayor nivel primero</option>
              <option value="distancia">Más cerca de mi trabajo</option>
              <option value="negocios">Más negocios</option>
            </select>
            <button onClick={descargarCsv} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg">
              📥 CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#1C1433] text-[#C084FC] uppercase font-bold">
                <th className="py-3 px-3">Colonia</th>
                <th className="py-3 px-3">C.P.</th>
                <th className="py-3 px-3 text-right">Negocios</th>
                <th className="py-3 px-3 text-center">Nivel</th>
                <th className="py-3 px-3">Índice</th>
                <th className="py-3 px-3 text-right">Distancia</th>
                <th className="py-3 px-3">Perfil de venta</th>
                <th className="py-3 px-3 text-center">Ruta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D1B4E]/40 text-gray-200">
              {lista.map(c => (
                <tr key={`${c.colonia}-${c.cp}`} className="hover:bg-white/[0.03]">
                  <td className="py-2.5 px-3 font-semibold text-white">{c.colonia}</td>
                  <td className="py-2.5 px-3 font-mono text-gray-400">{c.cp}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{c.total.toLocaleString('es-MX')}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-md font-extrabold text-white" style={{ backgroundColor: c.nivel.color }}>
                      {c.nivel.nivel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 w-32">
                    <div className="h-2 bg-[#0A0713] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.indice}%`, backgroundColor: c.nivel.color }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{c.indice}/100</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">{c.distancia_km} km</td>
                  <td className="py-2.5 px-3 text-gray-300 min-w-[220px]">{c.nivel.perfilVenta}</td>
                  <td className="py-2.5 px-3 text-center">
                    <a href={rutaDesdeTrabajo(c.lat, c.lon)} target="_blank" rel="noopener noreferrer"
                       className="text-emerald-400 hover:text-emerald-300 font-bold">🧭 Ir</a>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">No hay colonias con suficientes negocios para este filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed">
        ℹ️ <b>Cómo se calcula:</b> es una <b>estimación</b> a partir de los negocios registrados en el DENUE de INEGI
        (no es el NSE oficial AMAI, que se mide con encuestas a hogares). Compara cuántos giros son típicos de zonas
        de mayor ingreso (consultorios de especialidad, restaurantes a la carta, despachos, bancos, inmobiliarias)
        contra giros típicos de zonas populares (abarrotes, tortillerías, purificadoras, pollerías), además del tamaño
        de los negocios y cuántos tienen sitio web. Se calibró con zonas conocidas (Polanco ≈ A/B, Del Valle ≈ C+,
        Neza ≈ D+). Colonias con menos de 25 negocios no se califican. Distancias y rutas desde {PUNTO_PARTIDA.direccion}.
      </p>
    </div>
  );
};
