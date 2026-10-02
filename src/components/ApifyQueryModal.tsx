import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Sparkles, DollarSign, Database, Search } from 'lucide-react';

interface ApifyQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoria: string;
  municipio: string;
  estado: string;
  cantidadMuestra: number;
  modoFactor?: number;
}

export const ApifyQueryModal: React.FC<ApifyQueryModalProps> = ({
  isOpen,
  onClose,
  categoria,
  municipio,
  estado,
  cantidadMuestra,
  modoFactor = 20
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const ubicacion = municipio && municipio.trim() ? `${municipio.trim()} ${estado}` : estado;
  const query = `${categoria} en ${ubicacion} México`;

  // Factor de estimación real (20x estimado conservador para Google Maps)
  const factor = modoFactor || 20;
  const totalEst = cantidadMuestra * factor;
  const costoEst = (totalEst / 1000) * 4;

  const handleCopy = () => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      id="apify-query-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        id="apify-query-modal-content"
        className="bg-[#13111C] border-2 border-[#9333EA] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#6B21A8]/40 bg-[#1A162B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9333EA] to-[#C084FC] flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#C084FC] text-base sm:text-lg flex items-center gap-2">
                🎯 Query para Apify — <span className="text-white font-mono">{categoria}</span>
              </h3>
              <p className="text-xs text-[#E9D5FF]/70">
                Extracción masiva y completa con Google Places Crawler
              </p>
            </div>
          </div>
          <button 
            id="btn-close-apify-modal"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div>
            <p className="text-sm text-[#E9D5FF] mb-2 font-medium">
              Copia este término de búsqueda en Apify para extraer todos los registros reales de esta categoría en tu zona:
            </p>
            
            {/* Query Box */}
            <div className="relative group">
              <div className="bg-[#0D0B14] border border-[#6B21A8] rounded-xl p-4 font-mono text-emerald-400 text-sm sm:text-base font-semibold break-words select-all shadow-inner pr-24">
                {query}
              </div>
              <button
                id="btn-copy-apify-query"
                onClick={handleCopy}
                className={`absolute right-2 top-2 bottom-2 px-3.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow ${
                  copied 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-[#9333EA] hover:bg-[#A855F7] text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#E9D5FF]/60 mt-1.5">
              👆 Haz clic en "Copiar" o selecciona el texto para pegarlo en el campo <i>Search terms</i> de Apify.
            </p>
          </div>

          {/* Estimation Metrics Card */}
          <div className="bg-[#1A162B]/80 border border-[#6B21A8]/40 rounded-xl p-4 space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-[#C084FC] font-bold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Proyección Comercial y Costo en Apify
            </h4>
            
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="bg-[#0D0B14]/60 p-2.5 rounded-lg border border-purple-900/30">
                <span className="text-[11px] text-[#E9D5FF]/70 block">En muestra app:</span>
                <span className="text-sm sm:text-base font-bold text-white">
                  {cantidadMuestra.toLocaleString()} negocios
                </span>
              </div>

              <div className="bg-[#0D0B14]/60 p-2.5 rounded-lg border border-purple-900/30">
                <span className="text-[11px] text-[#E9D5FF]/70 block">Estimado real total:</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400">
                  ~{totalEst.toLocaleString()} registros
                </span>
              </div>

              <div className="bg-[#0D0B14]/60 p-2.5 rounded-lg border border-purple-900/30">
                <span className="text-[11px] text-[#E9D5FF]/70 block">Costo Apify:</span>
                <span className="text-sm sm:text-base font-bold text-amber-400">
                  ~${costoEst.toFixed(1)} USD
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[#E9D5FF]/70 pt-1 border-t border-[#6B21A8]/20 flex items-center justify-between">
              <span>Tarifa oficial Apify: $4 USD / 1,000 resultados</span>
              <span className="text-[#C084FC]">Google Places Crawler</span>
            </div>
          </div>

          {/* Direct Apify Button & Instructions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-[#E9D5FF]/70 text-center sm:text-left">
              Pega el query copiado en <b>compass/crawler-google-places</b>
            </div>
            
            <a
              id="btn-open-apify-link"
              href="https://apify.com/compass/crawler-google-places"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#A855F7] text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 group"
            >
              <span>🔗 Abrir Apify Crawler</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
