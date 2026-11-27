// Giros de negocio que necesitan vehículo de trabajo (compartido por servidor y navegador).
// Cada clase de actividad del DENUE se asigna al primer segmento cuyo patrón coincide.

export const PATRONES_SEGMENTO: { id: string; re: RegExp }[] = [
  { id: 'construccion', re: /construccion|edificacion|materiales para la construccion|ferreteria|tlapaleria|herreria|carpinteria|vidrio|plomeria|electrico|pintura|aluminio|cerrajeria|instalaciones/ },
  { id: 'reparto', re: /al por mayor|transporte|mensajeria|paqueteria|mudanza|almacen|distribu|purificacion y embotellado de agua|reparto/ },
  { id: 'alimentos', re: /abarrotes|carne|frutas y verduras|tortillas|panificacion|leche|dulces|semillas|pollo|pescados|huevo|bebidas|hielo|minisuper/ },
  { id: 'automotriz', re: /reparacion mecanica|hojalateria|automoviles|refacciones|llantas|lavado|autopartes|vulcaniz|alineacion/ },
  { id: 'salud', re: /consultorio|medic|dental|laboratorio|hospital|clinica|bufete|contabilidad|notari|arquitect|ingenieria|veterinari|psicolog|optica/ },
  { id: 'comida', re: /restaurante|antojitos|cafeteria|comida|banquetes|cocina|alimentos para llevar|pizzas|tacos/ },
  { id: 'servicios', re: /salon|belleza|peluqueria|estetica|lavanderia|papeleria|ropa|calzado|regalos|telefonos|celulares|computadoras|gimnasio|escuela|guarderia/ },
];

/** Segmento de una clase de actividad ya normalizada (minúsculas, sin acentos), o null. */
export function segmentoDeClase(claseNormalizada: string): string | null {
  for (const p of PATRONES_SEGMENTO) if (p.re.test(claseNormalizada)) return p.id;
  return null;
}
