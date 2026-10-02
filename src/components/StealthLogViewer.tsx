import React from 'react';
import { Terminal, Shield, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ExtractionLog } from '../types';

interface StealthLogViewerProps {
  logs: ExtractionLog[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
}

export const StealthLogViewer: React.FC<StealthLogViewerProps> = ({ logs, isOpen, onClose, onClear }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-lg w-full bg-[#1E1B2E] border border-[#6B21A8] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-96 animate-in slide-in-from-bottom-5 duration-200">
      <div className="p-3 bg-[#2D2540] border-b border-[#6B21A8]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#C084FC]" />
          <span className="text-xs font-bold text-white">Consola Stealth & Extracción</span>
          <span className="text-[10px] bg-[#22C55E]/20 text-[#22C55E] px-1.5 py-0.5 rounded border border-[#22C55E]/40 font-mono">
            {logs.length} eventos
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onClear}
            className="text-[10px] text-[#E9D5FF]/60 hover:text-white px-2 py-0.5 rounded hover:bg-[#6B21A8]/30"
          >
            Limpiar
          </button>
          <button
            onClick={onClose}
            className="text-[#E9D5FF]/60 hover:text-white p-1 rounded hover:bg-[#6B21A8]/30"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-1.5 font-mono text-[11px] bg-[#1E1B2E]">
        {logs.length === 0 ? (
          <div className="text-center py-6 text-[#E9D5FF]/40">
            No hay eventos registrados en esta sesión.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-[#E9D5FF]/40 shrink-0 select-none">[{log.timestamp}]</span>
              {log.type === 'stealth' && <Shield className="w-3.5 h-3.5 text-[#C084FC] shrink-0 mt-0.5" />}
              {log.type === 'success' && <CheckCircle className="w-3.5 h-3.5 text-[#22C55E] shrink-0 mt-0.5" />}
              {log.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />}
              {log.type === 'info' && <Info className="w-3.5 h-3.5 text-[#9333EA] shrink-0 mt-0.5" />}
              
              <span className={`
                ${log.type === 'stealth' ? 'text-[#C084FC]' : ''}
                ${log.type === 'success' ? 'text-[#22C55E]' : ''}
                ${log.type === 'warning' ? 'text-[#F59E0B]' : ''}
                ${log.type === 'info' ? 'text-[#E9D5FF]' : ''}
                break-all
              `}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
