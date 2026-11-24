import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { obtenerSaldoApify, SaldoApify } from '../services/apifyService';

// Indicador del saldo REAL del mes en Apify (se consulta en el servidor).
export const SaldoApifyBadge: React.FC = () => {
  const [saldo, setSaldo] = useState<SaldoApify | null>(null);
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      setSaldo(await obtenerSaldoApify());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    const onCambio = () => cargar();
    window.addEventListener('leadscrapper:saldo-actualizar', onCambio);
    const t = window.setInterval(cargar, 5 * 60 * 1000);
    return () => {
      window.removeEventListener('leadscrapper:saldo-actualizar', onCambio);
      window.clearInterval(t);
    };
  }, []);

  const disp = saldo?.disponibleUsd ?? 0;
  const color = !saldo ? '#9CA3AF' : disp <= 0.25 ? '#EF4444' : disp < 1 ? '#F59E0B' : '#22C55E';
  const pct = saldo && saldo.limiteUsd > 0 ? Math.min(100, (saldo.usadoUsd / saldo.limiteUsd) * 100) : 0;
  const renueva = saldo?.finCiclo
    ? new Date(new Date(saldo.finCiclo).getTime() + 1000).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    : '';

  return (
    <button
      id="badge-saldo-apify"
      onClick={cargar}
      title={saldo
        ? `Apify: usado USD ${saldo.usadoUsd.toFixed(2)} de USD ${saldo.limiteUsd.toFixed(2)} este mes. Se renueva el ${renueva}. Clic para actualizar.`
        : 'Saldo de Apify'}
      className="px-3 py-1.5 rounded-lg border bg-[#1E1635] text-xs font-semibold flex items-center gap-2 transition"
      style={{ borderColor: `${color}99` }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {error ? (
        <span className="text-gray-400">Saldo Apify: no disponible</span>
      ) : !saldo ? (
        <span className="text-gray-400">Saldo Apify…</span>
      ) : (
        <span className="flex flex-col items-start leading-tight">
          <span className="text-white">
            Apify: <b style={{ color }}>${disp.toFixed(2)}</b>
            <span className="text-gray-400 font-normal"> de ${saldo.limiteUsd.toFixed(2)}</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-400 font-normal">
            <span className="w-14 h-1 bg-[#0A0713] rounded-full overflow-hidden">
              <span className="block h-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </span>
            se renueva {renueva}
          </span>
        </span>
      )}
      <RefreshCw className={`w-3 h-3 text-gray-400 ${cargando ? 'animate-spin' : ''}`} />
    </button>
  );
};
