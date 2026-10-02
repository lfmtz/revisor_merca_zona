import * as XLSX from 'xlsx';
import { Lead, CategorySummary } from '../types';

/**
 * Normalizes Mexican phone numbers into clean 10 digits
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone || phone === 'N/A') return 'N/A';
  
  // Remove non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // Strip country code 52 or 521 if present and length is 12 or 13
  if (digits.startsWith('521') && digits.length === 13) {
    digits = digits.substring(3);
  } else if (digits.startsWith('52') && digits.length === 12) {
    digits = digits.substring(2);
  } else if (digits.startsWith('044') || digits.startsWith('045')) {
    digits = digits.substring(3);
  } else if (digits.startsWith('01') && digits.length === 12) {
    digits = digits.substring(2);
  }

  // Format as (XX) XXXX-XXXX or return 10 digits
  if (digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  
  return phone.trim();
}

/**
 * Builds Google Maps navigation route link
 */
export function buildNavigationLink(nombre: string, direccion: string, lat?: number, lon?: number): string {
  if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  }
  const destination = (direccion && direccion.trim() !== 'N/A' ? direccion : nombre).trim();
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/**
 * Generates standardized export filename
 */
export function generateExportFilename(
  businessType: string,
  estado: string,
  municipio: string,
  extension: 'csv' | 'xlsx'
): string {
  const sanitize = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

  const bType = sanitize(businessType || 'negocios');
  const est = sanitize(estado || 'mexico');
  const mun = municipio.trim() ? sanitize(municipio) : 'estado_completo';
  const today = new Date().toISOString().split('T')[0];

  return `leads_${bType}_${est}_${mun}_${today}.${extension}`;
}

/**
 * Exports leads to CSV format with Link GPS column for Excel click-through
 */
export function exportToCSV(leads: Lead[], filename: string): void {
  const headers = [
    'nombre_negocio',
    'categoria',
    'municipio_detectado',
    'estado_detectado',
    'direccion_completa',
    'telefono',
    'calificacion',
    'num_resenas',
    'horario',
    'estado_apertura',
    'url_google_maps',
    'Link GPS',
    'link_navegacion',
    'sitio_web',
    'fecha_extraccion',
    'cobertura_busqueda'
  ];

  const escapeCSV = (value: any) => {
    if (value === undefined || value === null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = leads.map(l => {
    const linkGps = (typeof l.lat === 'number' && typeof l.lng === 'number' && !isNaN(l.lat) && !isNaN(l.lng) && l.lat !== 0 && l.lng !== 0)
      ? `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`
      : (l.link_navegacion || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(l.direccion_completa || l.nombre_negocio)}`);

    return [
      escapeCSV(l.nombre_negocio),
      escapeCSV(l.categoria),
      escapeCSV(l.municipio_detectado),
      escapeCSV(l.estado_detectado),
      escapeCSV(l.direccion_completa),
      escapeCSV(l.telefono),
      escapeCSV(l.calificacion),
      escapeCSV(l.num_resenas),
      escapeCSV(l.horario),
      escapeCSV(l.estado_apertura),
      escapeCSV(l.url_google_maps),
      escapeCSV(linkGps),
      escapeCSV(l.link_navegacion),
      escapeCSV(l.sitio_web),
      escapeCSV(l.fecha_extraccion),
      escapeCSV(l.cobertura_busqueda)
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports leads to formatted Excel file
 */
export function exportToExcel(leads: Lead[], filename: string): void {
  const worksheetData = leads.map((l, index) => {
    const linkGps = (typeof l.lat === 'number' && typeof l.lng === 'number' && !isNaN(l.lat) && !isNaN(l.lng) && l.lat !== 0 && l.lng !== 0)
      ? `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`
      : (l.link_navegacion || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(l.direccion_completa || l.nombre_negocio)}`);

    return {
      '#': index + 1,
      'Nombre del Negocio': l.nombre_negocio,
      'Giro / Categoría': l.categoria,
      'Municipio / Alcaldía': l.municipio_detectado,
      'Estado': l.estado_detectado,
      'Dirección Completa': l.direccion_completa,
      'Teléfono Contacto': l.telefono,
      'Calificación (★)': l.calificacion,
      'No. Reseñas': l.num_resenas,
      'Horario Hoy': l.horario,
      'Estado Apertura': l.estado_apertura,
      'Enlace Google Maps': l.url_google_maps,
      'Link GPS': linkGps,
      'Ruta de Visita (Cómo llegar)': l.link_navegacion,
      'Sitio Web': l.sitio_web,
      'Fecha de Extracción': l.fecha_extraccion,
      'Cobertura de Búsqueda': l.cobertura_busqueda
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  
  // Set column widths
  const colWidths = [
    { wch: 5 },   // #
    { wch: 30 },  // Nombre
    { wch: 22 },  // Categoria
    { wch: 20 },  // Municipio
    { wch: 18 },  // Estado
    { wch: 45 },  // Direccion
    { wch: 18 },  // Telefono
    { wch: 15 },  // Calificacion
    { wch: 12 },  // Reseñas
    { wch: 20 },  // Horario
    { wch: 15 },  // Apertura
    { wch: 35 },  // Maps
    { wch: 35 },  // Navegacion
    { wch: 25 },  // Sitio Web
    { wch: 18 },  // Fecha
    { wch: 28 }   // Cobertura
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Prospectos Comerciales');
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports category inventory list to CSV
 */
export function exportCategoriesCSV(categories: CategorySummary[], coverage: string): void {
  const filename = `inventario_categorias_${new Date().toISOString().split('T')[0]}.csv`;
  const headers = ['Ranking', 'Categoria', 'Total Negocios', 'Porcentaje del Mercado', 'Cobertura'];
  const rows = categories.map(c => [
    c.rank,
    `"${c.categoria}"`,
    c.cantidad,
    `"${c.porcentaje.toFixed(1)}%"`,
    `"${coverage}"`
  ].join(','));

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Extracts and formats all clean phone numbers separated by newlines
 */
export function extractCleanPhoneList(leads: Lead[]): string {
  const phones = leads
    .map(l => l.telefono)
    .filter(p => p && p !== 'N/A')
    .map(p => p.replace(/\D/g, ''))
    .filter(p => p.length >= 10);

  const uniquePhones = Array.from(new Set(phones));
  return uniquePhones.join('\n');
}

/**
 * Copies phone numbers list to clipboard
 */
export function copyPhoneListToClipboard(leads: Lead[]): void {
  const list = extractCleanPhoneList(leads);
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(list);
  }
}

/**
 * Downloads a generic text file
 */
export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const exportLeadsToCsv = exportToCSV;
export const exportCategoriesToCsv = (categories: CategorySummary[], filename: string) => {
  const headers = ['Ranking', 'Categoria', 'En Muestra', 'Porcentaje del Mercado', 'Estimado Real Apify', 'Costo Apify USD'];
  const rows = categories.map(c => [
    c.rank,
    `"${c.categoria}"`,
    c.cantidad,
    `"${c.porcentaje.toFixed(1)}%"`,
    c.estimado_real || (c.cantidad * 20),
    c.costo_apify_usd || ((c.cantidad * 20 / 1000) * 4).toFixed(1)
  ].join(','));

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
