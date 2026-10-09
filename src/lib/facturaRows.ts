import type { FacturaItem, RangoTalle, Variedad } from '../types';
import { RANGOS_TALLE } from '../types';
import { TALLES, esTalleIndividual, rangoDeTalle } from './talles';
import type { Talle } from './talles';

/**
 * Fila del editor de facturas/presupuestos.
 * - modo 'talles': un producto + variedad + color, con cantidad por talle.
 *   Al guardar se convierte en una línea por cada talle con cantidad > 0.
 * - modo 'simple': ítem que no se puede abrir por talle (facturas anteriores
 *   al desglose). Se edita como antes, con cantidad y precio únicos.
 */
export interface RowFactura {
  rowKey: string;
  modo: 'talles' | 'simple';
  query: string;
  prodId: string;
  nombre: string;
  variedad?: Variedad;
  color: string;
  cantidades: Partial<Record<Talle, number>>;
  precios: Partial<Record<RangoTalle, number>>;
  // Solo modo 'simple': el ítem original tal como se facturó.
  item?: FacturaItem;
}

export const nuevaFila = (): RowFactura => ({
  rowKey: `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
  modo: 'talles',
  query: '',
  prodId: '',
  nombre: '',
  color: '',
  cantidades: {},
  precios: {},
});

export const precioDelRango = (row: RowFactura, rango: RangoTalle): number => row.precios[rango] ?? 0;

/** Líneas de factura que genera una fila: una por talle, nunca agrupadas. */
export const filaAItems = (row: RowFactura): FacturaItem[] => {
  if (!row.prodId) return [];
  if (row.modo === 'simple') {
    return row.item && row.item.cant > 0 ? [{ ...row.item, color: row.color.trim() }] : [];
  }
  const variedad = row.variedad;
  return TALLES.flatMap(talle => {
    const cant = row.cantidades[talle] ?? 0;
    if (cant <= 0) return [];
    const rangoTalle = rangoDeTalle(talle);
    return [{
      prodId: row.prodId,
      nombre: row.nombre,
      // Espejo en los campos viejos para listados que todavía los leen.
      categoria: variedad ?? '',
      talle,
      color: row.color.trim(),
      cant,
      precio: precioDelRango(row, rangoTalle),
      variedad,
      rangoTalle,
    }];
  });
};

export const filasAItems = (rows: RowFactura[]): FacturaItem[] => rows.flatMap(filaAItems);

export const unidadesDeFila = (row: RowFactura): number =>
  filaAItems(row).reduce((s, i) => s + i.cant, 0);

export const subtotalDeFila = (row: RowFactura): number =>
  filaAItems(row).reduce((s, i) => s + i.cant * i.precio, 0);

/** Rangos que tienen al menos un talle con cantidad cargada. */
export const rangosUsados = (row: RowFactura): RangoTalle[] =>
  RANGOS_TALLE.filter(r => TALLES.some(t => rangoDeTalle(t) === r && (row.cantidades[t] ?? 0) > 0));

/**
 * Reconstruye las filas del editor a partir de los ítems guardados. Los ítems
 * por talle individual se reagrupan por producto + variedad + color; el resto
 * queda como fila simple para no alterar lo que ya se facturó.
 */
export const itemsAFilas = (items: FacturaItem[]): RowFactura[] => {
  const filas: RowFactura[] = [];
  const porClave = new Map<string, RowFactura>();
  items.forEach((item, i) => {
    const color = item.color ?? '';
    const desglosable = item.variedad && item.rangoTalle && esTalleIndividual(item.talle)
      && item.talle !== item.rangoTalle && rangoDeTalle(item.talle) === item.rangoTalle;
    if (!desglosable) {
      filas.push({ ...nuevaFila(), rowKey: `r${i}`, modo: 'simple', prodId: item.prodId, nombre: item.nombre, variedad: item.variedad, color, item });
      return;
    }
    const talle = item.talle as Talle;
    const rango = item.rangoTalle as RangoTalle;
    const clave = `${item.prodId}|${item.variedad}|${color.trim().toLowerCase()}`;
    let fila = porClave.get(clave);
    // Si el mismo talle aparece dos veces con precios distintos no se pueden
    // fusionar sin perder información: va a una fila aparte.
    const choca = fila && ((fila.cantidades[talle] ?? 0) > 0 || (fila.precios[rango] !== undefined && fila.precios[rango] !== item.precio));
    if (!fila || choca) {
      fila = { ...nuevaFila(), rowKey: `r${i}`, prodId: item.prodId, nombre: item.nombre, variedad: item.variedad, color };
      filas.push(fila);
      if (!choca) porClave.set(clave, fila);
    }
    fila.cantidades[talle] = (fila.cantidades[talle] ?? 0) + item.cant;
    fila.precios[rango] = item.precio;
  });
  return filas.length ? filas : [nuevaFila()];
};
