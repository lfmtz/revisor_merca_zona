import React, { useMemo, useState } from 'react';
import { CategorySummary } from '../types';
import { ResultadoNse } from '../services/denueScan';
import { PUNTO_PARTIDA } from '../services/apifyService';
import { contarSegmentos, generarPersonas, codigosPostales, briefTexto } from '../utils/buyer';

interface Props {
  zona: string;
  radioKm: number;
  categorias: CategorySummary[];
  nse: ResultadoNse;
}

const NIVELES = ['A/B', 'C+', 'C', 'C-', 'D+', 'D/E'];

function descargar(contenido: string, nombre: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const PanelBuyer: React.FC<Props> = ({ zona, radioKm, categorias, nse }) => {
  const [niveles, setNiveles] = useState<Set<string>>(new Set(NIVELES));
  const [copiado, setCopiado] = useState<string | null>(null);

  const segmentos = useMemo(() => contarSegmentos(categorias), [categorias]);
  const personas = useMemo(() => generarPersonas(segmentos, nse, zona, PUNTO_PARTIDA.direccion), [segmentos, nse, zona]);
  const cps = useMemo(() => codigosPostales(nse.colonias, niveles), [nse, niveles]);
  const maxSeg = Math.max(1, ...segmentos.map(s => s.negocios));
  const archivo = zona.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').slice(0, 50);

  const copiar = (texto: string, id: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 1800);
  };

  const alternarNivel = (n: string) => setNiveles(prev => {
    const s = new Set(prev);
    if (s.has(n)) s.delete(n); else s.add(n);
    return s.size ? s : new Set(NIVELES);
  });

  const brief = () => briefTexto(zona, PUNTO_PARTIDA, radioKm, nse, segmentos, personas, cps);

  return (
    <div id="view-buyer" className="space-y-5">
      {/* Encabezado */}
      <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[#C084FC] font-bold uppercase">Perfil de la zona para pautar</p>
          <h3 className="text-lg font-extrabold text-white">{zona}</h3>
          <p className="text-xs text-gray-400 mt-1">
            Nivel socioeconómico <b className="text-white">{nse.nivel.nivel}</b> ·{' '}
            {nse.indicadores.total.toLocaleString('es-MX')} negocios · radio {radioKm} km desde {PUNTO_PARTIDA.nombre.toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button id="btn-brief-txt" onClick={() => descargar('﻿' + brief(), `brief_pauta_${archivo}.txt`, 'text/plain;charset=utf-8')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
            📄 Descargar brief de pauta
          </button>
          <button onClick={() => copiar(brief(), 'brief')}
            className="px-4 py-2 rounded-xl bg-[#1C1433] hover:bg-[#2A1D4A] text-[#E9D5FF] text-xs font-bold">
            {copiado === 'brief' ? '✅ Copiado' : '📋 Copiar brief'}
          </button>
        </div>
      </div>

      {/* Segmentos */}
      <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-extrabold text-white">🧭 ¿De qué vive la zona? Negocios por necesidad de vehículo</h4>
        {segmentos.length === 0 && <p className="text-xs text-gray-400">No hay suficientes negocios para segmentar.</p>}
        {segmentos.map(s => (
          <div key={s.def.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-xs">
            <div className="md:col-span-3 font-bold text-white">{s.def.emoji} {s.def.nombre}</div>
            <div className="md:col-span-4">
              <div className="h-3 bg-[#0A0713] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#6B21A8] to-[#C084FC]" style={{ width: `${(s.negocios / maxSeg) * 100}%` }} />
              </div>
              <span className="text-[10px] text-gray-400">
                {s.negocios.toLocaleString('es-MX')} negocios ({s.pct}%){s.grandes ? ` · ${s.grandes.toLocaleString('es-MX')} con +10 empleados` : ''}
              </span>
            </div>
            <div className="md:col-span-5 text-gray-300"><b className="text-[#C084FC]">{s.def.vehiculo}</b> · {s.def.modelos}</div>
          </div>
        ))}
      </div>

      {/* Buyer personas */}
      <div className="space-y-2">
        <h4 className="text-sm font-extrabold text-white">👤 Buyer personas sugeridos</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {personas.map((p, i) => (
            <div key={i} className="bg-[#140E24] border border-purple-800/60 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-2xl">{p.emoji}</p>
                  <p className="font-extrabold text-white text-sm leading-tight">{p.titulo}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.tipo === 'Negocio' ? 'bg-amber-900/60 text-amber-300' : 'bg-sky-900/60 text-sky-300'}`}>
                  {p.tipo}
                </span>
              </div>
              <p className="text-gray-300">{p.quien}</p>
              <p><b className="text-[#C084FC]">Edad sugerida:</b> <span className="text-gray-200">{p.edad}</span></p>
              <p><b className="text-[#C084FC]">Necesita:</b> <span className="text-gray-200">{p.necesita}</span></p>
              <p><b className="text-[#C084FC]">Vehículos:</b> <span className="text-gray-200">{p.vehiculos}</span></p>
              <p><b className="text-[#C084FC]">Oferta:</b> <span className="text-gray-200">{p.oferta}</span></p>
              <div>
                <b className="text-[#C084FC]">Mensajes para anuncios:</b>
                <ul className="mt-1 space-y-1">
                  {p.mensajes.map((m, j) => (
                    <li key={j} className="flex items-start gap-1.5">
                      <button onClick={() => copiar(m, `m${i}${j}`)} className="text-[10px] text-gray-500 hover:text-white shrink-0">
                        {copiado === `m${i}${j}` ? '✅' : '📋'}
                      </button>
                      <span className="text-gray-200">“{m}”</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p><b className="text-[#C084FC]">Objeciones a resolver:</b> <span className="text-gray-300">{p.objeciones.join(' · ')}</span></p>
              <div className="border-t border-purple-900/40 pt-2 space-y-1.5">
                <p className="flex items-start justify-between gap-2">
                  <span><b className="text-emerald-400">Meta · intereses:</b> <span className="text-gray-300">{p.intereses.join(', ')}</span></span>
                  <button onClick={() => copiar(p.intereses.join(', '), `i${i}`)} className="text-[10px] text-gray-500 hover:text-white shrink-0">{copiado === `i${i}` ? '✅' : '📋'}</button>
                </p>
                <p className="flex items-start justify-between gap-2">
                  <span><b className="text-emerald-400">Google Ads · palabras clave:</b> <span className="text-gray-300">{p.palabrasClave.join(', ')}</span></span>
                  <button onClick={() => copiar(p.palabrasClave.join('\n'), `k${i}`)} className="text-[10px] text-gray-500 hover:text-white shrink-0">{copiado === `k${i}` ? '✅' : '📋'}</button>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Segmentación geográfica */}
      <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl p-5 space-y-3 text-xs">
        <h4 className="text-sm font-extrabold text-white">📍 Dónde pautar</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-[#0A0713] rounded-xl p-3 space-y-1">
            <p className="font-bold text-[#C084FC]">Opción A · Radio (Meta / Google Ads)</p>
            <p className="text-gray-200">Pin: <span className="font-mono">{PUNTO_PARTIDA.lat.toFixed(5)}, {PUNTO_PARTIDA.lon.toFixed(5)}</span> · radio <b>{radioKm} km</b></p>
            <p className="text-gray-400">{PUNTO_PARTIDA.direccion}</p>
            <button onClick={() => copiar(`${PUNTO_PARTIDA.lat.toFixed(5)}, ${PUNTO_PARTIDA.lon.toFixed(5)}`, 'pin')}
              className="text-[#C084FC] underline">{copiado === 'pin' ? '✅ Copiado' : 'Copiar coordenadas'}</button>
          </div>
          <div className="bg-[#0A0713] rounded-xl p-3 space-y-1">
            <p className="font-bold text-[#C084FC]">Opción B · Códigos postales ({cps.length})</p>
            <p className="text-gray-400">Más preciso: elige solo los niveles socioeconómicos que te interesan.</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {NIVELES.map(n => (
                <button key={n} onClick={() => alternarNivel(n)}
                  className={`px-2 py-0.5 rounded-md font-bold ${niveles.has(n) ? 'bg-[#9333EA] text-white' : 'bg-[#1C1433] text-gray-500'}`}>{n}</button>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <button id="btn-copiar-cps" onClick={() => copiar(cps.map(c => c.cp).join(', '), 'cps')} className="text-[#C084FC] underline">
                {copiado === 'cps' ? '✅ Copiados' : 'Copiar códigos postales'}
              </button>
              <button onClick={() => descargar('﻿CP,Colonias,Negocios,Nivel,Distancia_km\n' + cps.map(c =>
                `${c.cp},"${c.colonias.join(' / ')}",${c.negocios},${c.nivel},${c.distancia_km}`).join('\n'),
                `codigos_postales_${archivo}.csv`, 'text/csv;charset=utf-8')} className="text-[#C084FC] underline">
                Descargar CSV
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-72 border border-purple-900/40 rounded-xl">
          <table className="w-full text-left">
            <thead className="bg-[#1A1033] text-[#E9D5FF] sticky top-0">
              <tr><th className="py-2 px-3">C.P.</th><th className="py-2 px-3">Colonias</th><th className="py-2 px-3 text-right">Negocios</th><th className="py-2 px-3 text-center">Nivel</th><th className="py-2 px-3 text-right">Distancia</th></tr>
            </thead>
            <tbody className="divide-y divide-purple-900/30 text-gray-200">
              {cps.map(c => (
                <tr key={c.cp}>
                  <td className="py-1.5 px-3 font-mono font-bold">{c.cp}</td>
                  <td className="py-1.5 px-3 text-gray-300">{c.colonias.slice(0, 4).join(', ')}{c.colonias.length > 4 ? ` +${c.colonias.length - 4}` : ''}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{c.negocios.toLocaleString('es-MX')}</td>
                  <td className="py-1.5 px-3 text-center font-bold">{c.nivel}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{c.distancia_km} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-gray-500">
        ℹ️ Fase 1: perfiles estimados con los negocios del DENUE y el nivel socioeconómico estimado de la zona
        (datos públicos agregados, no datos personales). Los modelos son ejemplos de Stellantis: ajústalos a tu catálogo.
        En la fase 2 se agregan edades, hogares con auto y escolaridad del Censo 2020 de INEGI.
      </p>
    </div>
  );
};
