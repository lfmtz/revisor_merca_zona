import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, FolderArchive, Terminal, ExternalLink } from 'lucide-react';
import JSZip from 'jszip';
import { getLeadScrapperPythonFiles, PythonFileItem } from '../services/pythonFilesGenerator';

interface PythonProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonProjectModal: React.FC<PythonProjectModalProps> = ({ isOpen, onClose }) => {
  const files = getLeadScrapperPythonFiles();
  const [selectedFile, setSelectedFile] = useState<PythonFileItem>(files[0]);
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingleFile = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("leadscrapper_mx");
      
      files.forEach(f => {
        folder?.file(f.filename, f.content);
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = "leadscrapper_mx.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1E1B2E] border border-[#6B21A8] rounded-xl max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 bg-[#2D2540] border-b border-[#6B21A8]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#9333EA]/30 flex items-center justify-center text-[#C084FC] border border-[#9333EA]">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>leadscrapper_mx/</span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#6B21A8] text-[#E9D5FF]">Python + Streamlit + Playwright</span>
              </h2>
              <p className="text-xs text-[#E9D5FF]/70">Código fuente completo listo para ejecutar en local o desplegar en Streamlit Cloud</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAllZip}
              disabled={isZipping}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#C084FC] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Comprimiendo...' : 'Descargar Todo (ZIP)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#E9D5FF]/60 hover:text-white hover:bg-[#6B21A8]/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* File sidebar list */}
          <div className="w-full md:w-64 bg-[#2D2540]/70 border-r border-[#6B21A8]/40 p-3 overflow-y-auto space-y-1">
            <div className="text-[11px] font-bold text-[#C084FC] uppercase tracking-wider px-2 py-1">
              Archivos del Proyecto
            </div>
            {files.map((file) => (
              <button
                key={file.filename}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                  selectedFile.filename === file.filename
                    ? 'bg-[#9333EA]/30 text-white border border-[#C084FC]/60'
                    : 'text-[#E9D5FF]/80 hover:bg-[#6B21A8]/20 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="w-3.5 h-3.5 text-[#C084FC] shrink-0" />
                  <span className="truncate">{file.filename}</span>
                </div>
              </button>
            ))}

            {/* Quick Terminal Guide */}
            <div className="mt-4 p-3 bg-[#1E1B2E] rounded-lg border border-[#6B21A8]/40 text-[11px] text-[#E9D5FF] space-y-2">
              <div className="font-bold text-[#C084FC] flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>Ejecutar en Local:</span>
              </div>
              <pre className="bg-[#2D2540] p-2 rounded text-[10px] overflow-x-auto text-[#22C55E]">
                pip install -r requirements.txt{'\n'}
                playwright install chromium{'\n'}
                streamlit run app.py
              </pre>
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col bg-[#1E1B2E] overflow-hidden">
            <div className="p-3 bg-[#2D2540]/40 border-b border-[#6B21A8]/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-white">{selectedFile.filename}</span>
                <p className="text-[11px] text-[#E9D5FF]/60">{selectedFile.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 bg-[#2D2540] hover:bg-[#6B21A8]/40 text-xs text-[#E9D5FF] rounded border border-[#6B21A8]/50 flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
                <button
                  onClick={handleDownloadSingleFile}
                  className="px-2.5 py-1 bg-[#2D2540] hover:bg-[#6B21A8]/40 text-xs text-[#E9D5FF] rounded border border-[#6B21A8]/50 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-[#E9D5FF] bg-[#1E1B2E]">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {selectedFile.content}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
