import type { FacturaItem, RangoTalle } from '../types';

// Talles individuales que se cargan en la factura, en el orden en que se muestran.
export const TALLES = ['4', '6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'ESPECIAL'] as const;
export type Talle = (typeof TALLES)[number];

// Los precios se cargan por rango; cada talle toma el precio de su rango.
// XXL y XXXL quedan fuera de "S AL XL", así que se cobran como ESPECIAL.
const RANGO_POR_TALLE: Record<Talle, RangoTalle> = {
  '4': '4 AL 10',
  '6': '4 AL 10',
  '8': '4 AL 10',
  '10': '4 AL 10',
  '12': '12 AL 16',
  '14': '12 AL 16',
  '16': '12 AL 16',
  S: 'S AL XL',
  M: 'S AL XL',
  L: 'S AL XL',
  XL: 'S AL XL',
  XXL: 'ESPECIAL',
  XXXL: 'ESPECIAL',
  ESPECIAL: 'ESPECIAL',
};

export const rangoDeTalle = (talle: Talle): RangoTalle => RANGO_POR_TALLE[talle];

export const tallesDelRango = (rango: RangoTalle): Talle[] =>
  TALLES.filter(t => RANGO_POR_TALLE[t] === rango);

export const esTalleIndividual = (valor: string): valor is Talle =>
  (TALLES as readonly string[]).includes(valor);

/**
 * Descripción de un ítem de factura. Tres generaciones de ítems conviven:
 * - talle individual (actual): Variedad · Talle 6 · Color
 * - rango de talle (versión anterior): Variedad · 4 AL 10 · Color
 * - previos al catálogo: Categoría · Talle · Color
 */
export const describirItem = (item: FacturaItem): string => {
  const color = item.color?.trim();
  if (item.variedad || item.rangoTalle) {
    const talle = item.talle && item.talle !== item.rangoTalle && esTalleIndividual(item.talle)
      ? `Talle ${item.talle}`
      : item.rangoTalle;
    return [item.variedad, talle, color].filter(Boolean).join(' · ');
  }
  return [item.categoria, item.talle, color].filter(Boolean).join(' · ');
};
