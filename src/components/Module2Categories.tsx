import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Download, 
  Layers, 
  ArrowRight, 
  Sparkles, 
  Building2, 
  Store, 
  Filter 
} from 'lucide-react';
import { CategorySummary, ActiveModule, EntityType } from '../types';
import { exportCategoriesCSV } from '../utils/dataProcessor';

interface Module2CategoriesProps {
  estado: string;
  municipio: string;
  categories: CategorySummary[];
  coverage: string;
  isLoading: boolean;
  onExtractCategory: (categoryName: string) => void;
  onScanZoneFirst: () => void;
}

export const Module2Categories: React.FC<Module2CategoriesProps> = ({
  estado,
  municipio,
  categories,
  coverage,
  isLoading,
  onExtractCategory,
  onScanZoneFirst
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<'all' | EntityType>('all');

  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      const matchesSearch = !searchTerm.trim() || c.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEntity = entityFilter === 'all' || c.tipo === entityFilter;
      return matchesSearch && matchesEntity;
    });
  }, [categories, searchTerm, entityFilter]);

  const totalNegociosInCategories = useMemo(() => {
    return categories.reduce((acc, curr) => acc + curr.cantidad, 0);
  }, [categories]);

  const countEmpresas = useMemo(() => {
    return categories.filter(c => c.tipo === 'empresa').length;
  }, [categories]);

  const countNegocios = useMemo(() => {
    return categories.filter(c => c.tipo === 'negocio').length;
  }, [categories]);

  const handleDownloadCSV = () => {
    exportCategoriesCSV(categories, coverage);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#2D2540] border border-[#6B21A8]/60 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#9333EA]/30 text-[#C084FC] border border-[#9333EA]/60">
                MÓDULO 2
              </span>
              <span className="text-xs text-[#E9D5FF]/70">Inventario y Censo Comercial</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Inventario de Categorías y Giros Comerciales
            </h2>
            <p className="text-xs md:text-sm text-[#E9D5FF]/80 mt-1 max-w-2xl">
              Explora todas las categorías encontradas en la zona con clasificación dual (Comercios Locales vs. Empresas B2B). Elige cualquier giro para extraer prospectos de inmediato.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {categories.length > 0 && (
              <button
                onClick={handleDownloadCSV}
                className="px-4 py-2 bg-[#1E1B2E] hover:bg-[#6B21A8]/30 border border-[#C084FC]/40 text-xs font-bold text-[#C084FC] rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Categorías (CSV)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Coverage Badge & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#2D2540]/60 p-3 rounded-lg border border-[#6B21A8]/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#E9D5FF]">Zona activa:</span>
          <div className="geo-badge !border-[#C084FC] !text-[#C084FC]">
            📊 Categorías encontradas en: {coverage || `${municipio ? municipio + ', ' : ''}${estado || 'México'}`}
          </div>
        </div>

        {categories.length > 0 && (
          <div className="text-xs text-[#E9D5FF]/80 flex flex-wrap items-center gap-3">
            <span><b>{categories.length}</b> categorías únicas</span>
            <span>•</span>
            <span className="text-blue-300"><b>{countEmpresas}</b> giros B2B</span>
            <span>•</span>
            <span className="text-green-300"><b>{countNegocios}</b> comercios locales</span>
            <span>•</span>
            <span><b>{totalNegociosInCategories.toLocaleString()}</b> establecimientos</span>
          </div>
        )}
      </div>

      {/* If no categories yet */}
      {categories.length === 0 ? (
        <div className="bg-[#2D2540] border border-[#6B21A8]/40 rounded-xl p-8 text-center space-y-4 shadow-lg">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#9333EA]/20 flex items-center justify-center text-[#C084FC]">
            <Layers className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">Inventario no generado para esta zona</h3>
            <p className="text-xs text-[#E9D5FF]/70 mt-1">
              Ejecuta el escaneo para descubrir automáticamente qué tipos de negocios operan en {coverage || "la zona seleccionada"}.
            </p>
          </div>
          <button
            onClick={onScanZoneFirst}
            disabled={isLoading || !estado}
            className="px-5 py-2.5 bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#C084FC] text-xs font-bold text-white rounded-lg shadow-lg border border-[#C084FC]/30 transition-all inline-flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generando inventario...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Escanear Categorías de la Zona</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-[#2D2540] border border-[#6B21A8]/50 rounded-xl overflow-hidden shadow-xl">
          {/* Table Search & Dual Filter Bar */}
          <div className="p-4 border-b border-[#6B21A8]/40 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1E1B2E]/40">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#C084FC] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Filtrar categorías..."
                  className="w-full bg-[#1E1B2E] text-white placeholder:text-[#E9D5FF]/40 text-xs rounded-lg border border-[#6B21A8] pl-9 pr-3 py-2 focus:outline-none focus:border-[#C084FC] transition-colors"
                />
              </div>

              {/* Dual Filter Buttons */}
              <div className="flex items-center gap-1.5 bg-[#1E1B2E] p-1 rounded-lg border border-[#6B21A8]/60 text-xs">
                <button
                  onClick={() => setEntityFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    entityFilter === 'all'
                      ? 'bg-[#9333EA] text-white shadow-sm'
                      : 'text-[#E9D5FF]/70 hover:text-white'
                  }`}
                >
                  Todas ({categories.length})
                </button>
                <button
                  onClick={() => setEntityFilter('empresa')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                    entityFilter === 'empresa'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-[#E9D5FF]/70 hover:text-blue-300'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Empresas B2B ({countEmpresas})</span>
                </button>
                <button
                  onClick={() => setEntityFilter('negocio')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                    entityFilter === 'negocio'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-[#E9D5FF]/70 hover:text-green-300'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Comercios Locales ({countNegocios})</span>
                </button>
              </div>
            </div>

            <div className="text-xs text-[#E9D5FF]/70">
              Mostrando <b>{filteredCategories.length}</b> de {categories.length} categorías
            </div>
          </div>

          {/* Interactive Categories Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1E1B2E] text-[#C084FC] border-b border-[#6B21A8]/50 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Categoría / Giro Comercial</th>
                  <th className="py-3 px-4 text-center">Tipo de Entidad</th>
                  <th className="py-3 px-4 text-center">Cantidad de Negocios</th>
                  <th className="py-3 px-4 text-center">% del Mercado Total</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#6B21A8]/30">
                {filteredCategories.map((item) => (
                  <tr 
                    key={item.rank} 
                    className="hover:bg-[#6B21A8]/20 transition-colors group"
                  >
                    <td className="py-3 px-4 text-center font-bold text-[#E9D5FF]/60">
                      {item.rank}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white group-hover:text-[#C084FC] transition-colors">
                      <div className="flex items-center gap-2">
                        <span>{item.categoria}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.tipo === 'empresa' ? (
                        <span className="empresa-badge inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>Empresa B2B</span>
                        </span>
                      ) : (
                        <span className="negocio-badge inline-flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          <span>Negocio Local</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-white">
                      <span className="px-2.5 py-1 rounded bg-[#1E1B2E] border border-[#6B21A8]/40">
                        {item.cantidad.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-[#1E1B2E] rounded-full h-2 overflow-hidden border border-[#6B21A8]/30">
                          <div
                            className="bg-gradient-to-r from-[#6B21A8] to-[#C084FC] h-full rounded-full"
                            style={{ width: `${Math.min(100, item.porcentaje * 3.5)}%` }}
                          />
                        </div>
                        <span className="font-semibold text-[#E9D5FF] text-[11px]">
                          {item.porcentaje}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onExtractCategory(item.categoria)}
                        className="px-3 py-1.5 bg-gradient-to-r from-[#6B21A8] to-[#9333EA] hover:from-[#9333EA] hover:to-[#C084FC] text-white text-xs font-bold rounded-lg shadow transition-all inline-flex items-center gap-1.5 group-hover:scale-105"
                      >
                        <span>🎯</span>
                        <span>Extraer Leads</span>
                        <ArrowRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
