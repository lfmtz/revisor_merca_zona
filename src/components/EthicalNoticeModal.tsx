import React from 'react';
import { X, ShieldCheck, Scale, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';

interface EthicalNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EthicalNoticeModal: React.FC<EthicalNoticeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1E1B2E] border border-[#6B21A8] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-[#2D2540] border-b border-[#6B21A8]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#22C55E]/20 flex items-center justify-center text-[#22C55E] border border-[#22C55E]/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Marco Ético y Legal de Extracción</h2>
              <p className="text-xs text-[#E9D5FF]/70">LFPDPPP y Mejores Prácticas en México</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#E9D5FF]/60 hover:text-white hover:bg-[#6B21A8]/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-[#E9D5FF] leading-relaxed">
          <div className="p-3 bg-[#2D2540] border border-[#6B21A8]/50 rounded-lg flex items-start gap-3">
            <Scale className="w-5 h-5 text-[#C084FC] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Datos Públicos de Comercios</h4>
              <p>
                LeadScrapper MX está diseñado para recopilar exclusivamente datos de negocios públicamente visibles en Google Maps (nombre comercial, teléfono de atención, dirección física, horarios de operación y sitio web).
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <span>Buenas Prácticas Implementadas:</span>
            </h4>
            <ul className="space-y-1.5 pl-6 list-disc text-[#E9D5FF]/90">
              <li><b>Delays aleatorios entre requests:</b> No sobrecargar los servidores ni alterar la disponibilidad del servicio.</li>
              <li><b>Sin extracción de datos personales sensibles:</b> No se extraen correos personales de usuarios ni identificadores privados.</li>
              <li><b>Respeto a Captchas y límites:</b> Detección automática de advertencias para detener la extracción si se solicita.</li>
              <li><b>Filtro territorial estricto:</b> Todo el procesamiento está acotado geográficamente a los 32 estados de los Estados Unidos Mexicanos.</li>
            </ul>
          </div>

          <div className="p-3 bg-[#9333EA]/15 border border-[#9333EA]/40 rounded-lg space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#C084FC]" />
              <span>Responsabilidad del Usuario:</span>
            </div>
            <p className="text-[11px] text-[#E9D5FF]/80">
              El usuario final es responsable del uso ético y comercial de los datos recopilados conforme a la <b>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</b>, la Ley Federal de Protección al Consumidor (LFPC) y el Registro Público para Evitar Publicidad (REPEP de PROFECO).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#2D2540] border-t border-[#6B21A8]/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#C084FC] text-white text-xs font-bold rounded-lg transition-all"
          >
            Entendido y Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
