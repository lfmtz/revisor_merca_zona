import React, { useEffect, useMemo, useState } from 'react';
import { ResultadoNse } from '../services/denueScan';
import { PUNTO_PARTIDA } from '../services/apifyService';
import { cargarAgebs, perfilZona, Ageb } from '../services/censo';
import { zonasPorCp, generarPlanMeta, planTexto, ConjuntoMeta } from '../utils/planMeta';
import { lugarDeZona } from '../utils/buyer';

interface Props {
  zona: string;
  radioKm: number;
  nse: ResultadoNse;
  municipio?: string;
}

const LS_PRES = 'leadscrapper_presupuesto_meta';
const LS_WA = 'leadscrapper_whatsapp';
const leer = (k: string, d: string) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
const guardar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* */ } };

export const PlanMeta: React.FC<Props> = ({ zona, radioKm, nse, municipio = '' }) => {
  const [agebs, setAgebs] = useState<Ageb[] | null>(null);
  const [censoError, setCensoError] = useState<string | null>(null);
  const [presupuesto, setPresupuesto] = useState<number>(() => Number(leer(LS_PRES, '300')) || 300);
  const [whatsapp, setWhatsapp] = useState<string>(() => leer(LS_WA, ''));
  const [copiado, setCopiado] = useState<string | null>(null);
  const [verGuia, setVerGuia] = useState(false);

  useEffect(() => {
    cargarAgebs()
      .then(t => setAgebs(perfilZona(t, PUNTO_PARTIDA, radioKm, municipio).agebs))
      .catch(e => { setCensoError(e?.message || 'Sin datos del censo'); setAgebs([]); });
  }, [radioKm, municipio, zona]);

  const { municipio: munZona } = lugarDeZona(zona, PUNTO_PARTIDA.direccion);
  const zonas = useMemo(() => (agebs ? zonasPorCp(nse.colonias, agebs) : []), [agebs, nse]);
  const conjuntos = useMemo(() => generarPlanMeta(zonas, zona, munZona, presupuesto), [zonas, zona, munZona, presupuesto]);

  const copiar = (t: string, id: string) => {
    navigator.clipboard.writeText(t);
    setCopiado(id);
    setTimeout(() => setCopiado(null), 1600);
  };
  const waLimpio = whatsapp.replace(/\D/g, '');
  const linkWa = (msg: string) => waLimpio.length >= 10
    ? `https://wa.me/52${waLimpio.slice(-10)}?text=${encodeURIComponent(msg)}` : '';

  const descargar = () => {
    const txt = planTexto(conjuntos, zona, presupuesto) +
      (waLimpio.length >= 10 ? '\n\nEnlaces de WhatsApp por conjunto:\n' + conjuntos.map(c => `${c.id}: ${linkWa(c.mensajeWhatsapp)}`).join('\n') : '');
    const url = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan_meta_${zona.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').slice(0, 40)}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const Campo: React.FC<{ etq: string; valor: string; id: string; mono?: boolean }> = ({ etq, valor, id, mono }) => (
    <div className="bg-[#0A0713] rounded-lg p-2.5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wide font-bold text-[#C084FC]">{etq}</span>
        <button onClick={() => copiar(valor, id)} className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 shrink-0">
          {copiado === id ? '✅ Copiado' : '📋 Copiar'}
        </button>
      </div>
      <p className={`text-gray-200 break-words ${mono ? 'font-mono text-[11px]' : ''}`}>{valor || '—'}</p>
    </div>
  );

  const Tarjeta: React.FC<{ c: ConjuntoMeta }> = ({ c }) => (
    <div id={`conjunto-${c.id}`} className="bg-[#140E24] border border-purple-800/60 rounded-2xl p-4 space-y-2.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold text-gray-400">CONJUNTO {c.id}</p>
          <p className="text-base font-extrabold text-white">{c.emoji} {c.persona}</p>
          <p className="text-gray-400">{c.tamanoTxt}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-emerald-400">${c.presupuesto.toLocaleString('es-MX')}</p>
          <p className="text-[10px] text-gray-400">MXN/día · {c.pctPresupuesto}%</p>
        </div>
      </div>
      <p className="text-[11px] text-gray-400">💡 {c.porQue}</p>
      <Campo etq="1. Nombre del conjunto de anuncios" valor={c.nombre} id={`${c.id}-n`} />
      <Campo etq={`2. Ubicaciones · ${c.zonas.length} códigos postales (pegar en bloque)`} valor={c.zonas.map(z => z.cp).join(', ')} id={`${c.id}-cp`} mono />
      <details className="bg-[#0A0713] rounded-lg p-2.5">
        <summary className="cursor-pointer text-[10px] uppercase font-bold text-[#C084FC]">Ver colonias de cada código postal</summary>
        <ul className="mt-1.5 space-y-0.5 text-[11px] text-gray-300">
          {c.zonas.map(z => (
            <li key={z.cp}><b className="font-mono">{z.cp}</b> · {z.colonias.slice(0, 3).join(', ')} · hogares {z.nivelHogar}
              {z.viviendas ? ` · ${Math.round(100 * z.sinAuto / z.viviendas)}% sin auto` : ''} · {z.distancia_km} km</li>
          ))}
        </ul>
      </details>
      {c.excluir.length > 0 && <Campo etq="Excluir estos códigos postales" valor={c.excluir.join(', ')} id={`${c.id}-ex`} mono />}
      <Campo etq="Alternativa: pines con radio de 1 km" valor={c.pines.map(p => `${p.lat}, ${p.lon}`).join('  |  ')} id={`${c.id}-pin`} mono />
      <div className="grid grid-cols-2 gap-2">
        <Campo etq="3. Edad" valor={`${c.edadMin} a ${c.edadMax}`} id={`${c.id}-e`} />
        <Campo etq="Sexo" valor="Todos" id={`${c.id}-s`} />
      </div>
      <Campo etq="4. Segmentación detallada (intereses)" valor={c.intereses.join(', ')} id={`${c.id}-i`} />
      <Campo etq="5. Presupuesto diario" valor={`${c.presupuesto}`} id={`${c.id}-p`} />
      <p className="text-[10px] uppercase font-bold text-[#C084FC] pt-1">6. Anuncio · vehículos: <span className="normal-case text-gray-300">{c.vehiculos}</span></p>
      {c.textos.principal.map((t, i) => <Campo key={i} etq={`Texto principal ${i + 1}`} valor={t} id={`${c.id}-t${i}`} />)}
      <Campo etq="Títulos" valor={c.textos.titulo.join(' | ')} id={`${c.id}-ti`} />
      <Campo etq="Descripción" valor={c.textos.descripcion} id={`${c.id}-d`} />
      <Campo etq="7. Mensaje prellenado de WhatsApp (para saber de qué zona viene)" valor={c.mensajeWhatsapp} id={`${c.id}-w`} />
      {linkWa(c.mensajeWhatsapp) && <Campo etq="Enlace de WhatsApp listo" valor={linkWa(c.mensajeWhatsapp)} id={`${c.id}-wl`} mono />}
    </div>
  );

  return (
    <div id="view-plan-meta" className="space-y-4">
      <div className="bg-[#140E24] border border-purple-900/40 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <p className="text-xs text-[#C084FC] font-bold uppercase">Plan de pauta Meta (Facebook / Instagram)</p>
            <h3 className="text-lg font-extrabold text-white">{zona}</h3>
            <p className="text-xs text-gray-400">Micro-zonas elegidas con negocios (DENUE) y poder de compra de los hogares (Censo 2020). Gratis: no usa Apify.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3 text-xs">
            <label className="space-y-1">
              <span className="block text-gray-400">Presupuesto diario total (MXN)</span>
              <input id="input-presupuesto-meta" type="number" min={50} step={50} value={presupuesto}
                onChange={e => { const v = Math.max(50, Number(e.target.value) || 50); setPresupuesto(v); guardar(LS_PRES, String(v)); }}
                className="w-32 bg-[#0A0713] border border-[#6B21A8]/60 rounded-lg px-3 py-2 text-white" />
            </label>
            <label className="space-y-1">
              <span className="block text-gray-400">Tu WhatsApp (opcional)</span>
              <input value={whatsapp} placeholder="55 1234 5678"
                onChange={e => { setWhatsapp(e.target.value); guardar(LS_WA, e.target.value); }}
                className="w-36 bg-[#0A0713] border border-[#6B21A8]/60 rounded-lg px-3 py-2 text-white" />
            </label>
            <button id="btn-descargar-plan-meta" onClick={descargar} disabled={!conjuntos.length}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold">
              📄 Descargar plan
            </button>
          </div>
        </div>
        <button onClick={() => setVerGuia(!verGuia)} className="text-xs text-[#C084FC] underline">
          {verGuia ? 'Ocultar' : '¿Cómo lo capturo en Meta? Ver pasos'}
        </button>
        {verGuia && (
          <ol className="text-xs text-gray-300 list-decimal pl-5 space-y-1">
            <li>Entra a <b>Administrador de anuncios</b> de Meta → <b>Crear</b> → objetivo <b>Clientes potenciales</b> o <b>Interacción → Mensajes (WhatsApp)</b>.</li>
            <li>Crea <b>un conjunto de anuncios por tarjeta</b> (A, B, C) y ponle el <b>nombre</b> que te da la tarjeta.</li>
            <li>En <b>Público → Ubicaciones</b>: escribe "México", luego <b>"Agregar ubicaciones en bloque"</b> → tipo <b>Código postal</b> → pega los códigos. Si hay "Excluir", agrégalos como exclusión.</li>
            <li>Captura la <b>edad</b> y en <b>Segmentación detallada</b> busca y agrega los <b>intereses</b> (si alguno no aparece, sáltalo).</li>
            <li>Pon el <b>presupuesto diario</b> de la tarjeta.</li>
            <li>En el <b>anuncio</b>: usa fotos de los vehículos indicados, pega un <b>texto principal</b>, un <b>título</b> y la <b>descripción</b>. Si es de WhatsApp, pega el <b>mensaje prellenado</b>.</li>
            <li>Si Meta te pide <b>"Categoría especial: productos financieros"</b>, revisa que el anuncio no hable de crédito/enganche/mensualidades (los textos ya lo evitan).</li>
            <li>Después de 5–7 días compara en Meta el <b>costo por resultado</b> de cada conjunto y pasa presupuesto al que mejor funcione.</li>
          </ol>
        )}
        {censoError && <p className="text-xs text-amber-300">{censoError} El plan usará solo los negocios.</p>}
      </div>

      {!agebs && <p className="text-xs text-gray-400">Preparando micro-zonas…</p>}
      {agebs && conjuntos.length === 0 && <p className="text-xs text-gray-400">No hay suficientes datos en esta zona para armar el plan.</p>}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {conjuntos.map(c => <Tarjeta key={c.id} c={c} />)}
      </div>
      {agebs && conjuntos.length > 0 && !conjuntos.some(c => c.id === 'C') && (
        <p className="text-xs text-gray-400">
          ℹ️ No se armó el conjunto C (Renovación/SUV): en este radio no hay códigos postales con hogares de nivel C+ o A/B.
          Amplía el radio o elige otra zona si quieres ese perfil.
        </p>
      )}
    </div>
  );
};
