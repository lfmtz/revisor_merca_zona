import React, { useEffect, useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { llamarApi, guardarClave, borrarClave, obtenerClaveGuardada, HORAS_SESION, DIAS_RECORDAR } from '../services/apiCliente';

// Pide la clave de acceso (APP_ACCESS_KEY de Vercel) antes de mostrar la app.
export const AccesoGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [estado, setEstado] = useState<'verificando' | 'bloqueado' | 'abierto'>('verificando');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const verificar = async () => {
    if (!obtenerClaveGuardada()) { setEstado('bloqueado'); return false; }
    try {
      await llamarApi('/api/acceso');
      setEstado('abierto');
      return true;
    } catch (e: any) {
      setError(e?.status === 401 ? null : (e?.message || 'No se pudo verificar la clave.'));
      setEstado('bloqueado');
      return false;
    }
  };

  useEffect(() => {
    verificar();
    const relock = () => { setEstado('bloqueado'); setError('Tu clave ya no es válida. Escríbela de nuevo.'); };
    const salir = () => { setEstado('bloqueado'); setClave(''); setError(null); setAviso('Sesión cerrada.'); };
    // Si la sesión vence con la app abierta, se bloquea sola.
    const reloj = window.setInterval(() => {
      if (!obtenerClaveGuardada()) setEstado(e => { if (e === 'abierto') setAviso('Tu sesión venció. Vuelve a entrar.'); return e === 'abierto' ? 'bloqueado' : e; });
    }, 60000);
    window.addEventListener('leadscrapper:clave-invalida', relock);
    window.addEventListener('leadscrapper:salir', salir);
    return () => {
      window.clearInterval(reloj);
      window.removeEventListener('leadscrapper:clave-invalida', relock);
      window.removeEventListener('leadscrapper:salir', salir);
    };
  }, []);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clave.trim()) return;
    setEnviando(true);
    setError(null);
    setAviso(null);
    guardarClave(clave, recordar);
    const ok = await verificar();
    if (!ok) {
      borrarClave();
      setError(prev => prev || 'Clave incorrecta.');
    }
    setEnviando(false);
  };

  if (estado === 'abierto') return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#1E1B2E]">
      {estado === 'verificando' ? (
        <Loader2 className="w-8 h-8 text-[#C084FC] animate-spin" />
      ) : (
        <form onSubmit={entrar} className="w-full max-w-sm bg-[#140E24] border-2 border-[#9333EA] rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9333EA] to-[#C084FC] flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white">LeadScrapper MX</h1>
              <p className="text-xs text-[#E9D5FF]/70">Escribe la clave de acceso para continuar</p>
            </div>
          </div>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={clave}
            onChange={e => setClave(e.target.value)}
            placeholder="Clave de acceso"
            className="w-full bg-[#0A0713] border border-[#6B21A8]/60 focus:border-[#C084FC] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none"
          />
          <label className="flex items-center gap-2 text-xs text-[#E9D5FF]/80 cursor-pointer select-none">
            <input id="chk-recordar" type="checkbox" checked={recordar} onChange={e => setRecordar(e.target.checked)} className="accent-purple-500" />
            Mantener sesión {DIAS_RECORDAR} días en este dispositivo
          </label>
          {aviso && !error && <p className="text-xs text-emerald-300">{aviso}</p>}
          {error && <p className="text-xs text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={enviando || !clave.trim()}
            className="w-full bg-[#9333EA] hover:bg-[#A855F7] disabled:opacity-50 text-white font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2"
          >
            {enviando && <Loader2 className="w-4 h-4 animate-spin" />} Entrar
          </button>
          <p className="text-[10px] text-gray-500">Sin marcar, la sesión se cierra sola a las {HORAS_SESION} horas. Usa "Salir" en una computadora que no sea tuya.</p>
        </form>
      )}
    </div>
  );
};
