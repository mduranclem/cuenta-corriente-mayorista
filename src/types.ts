export type PrecioCategoria = 'general' | 'especial';
export type FormaPago = 'Efectivo' | 'Transferencia' | 'Cheque' | 'Tarjeta';

export interface ListaPrecio {
  id: string;
  nombre: string;
}

export interface ProductPrice {
  productoId: string;
  listaId: string;
  precio: number;
}

// ---- Catálogo: Producto x Variedad x Rango de talle ----

export const VARIEDADES = ['Liso', 'Bordado', 'Estampado'] as const;
export type Variedad = (typeof VARIEDADES)[number];

export const RANGOS_TALLE = ['4 AL 10', '12 AL 16', 'S AL XL', 'ESPECIAL'] as const;
export type RangoTalle = (typeof RANGOS_TALLE)[number];

export interface CatalogoProducto {
  id: string;
  nombre: string;
  orden: number;
}

/** Un precio unitario por cada combinación Producto + Variedad + Rango de talle. */
export interface CatalogoPrecio {
  productoId: string;
  variedad: Variedad;
  rangoTalle: RangoTalle;
  precio: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  tel: string;
  email: string;
  cat: string;          // ID de lista de precios ('general', 'especial', o ID custom)
  notas?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  talle: string;
  color: string;
  precio: number;
  precioEsp?: number;
}

export interface FacturaItem {
  prodId: string;
  nombre: string;
  categoria: string;
  talle: string;
  color: string;
  cant: number;
  precio: number;
  // Modelo nuevo. Los ítems anteriores a la migración no los tienen.
  variedad?: Variedad;
  rangoTalle?: RangoTalle;
}

export interface Factura {
  id: string;
  clienteId: string;
  fecha: string;
  items: FacturaItem[];
  total: number;
  descuento?: number;
  notas?: string;
}

export interface Presupuesto {
  id: string;
  clienteId: string;
  fecha: string;
  items: FacturaItem[];
  total: number;
  descuento?: number;
  notas?: string;
  estado: 'presupuesto';
}

export interface Pago {
  id: string;
  clienteId: string;
  fecha: string;
  monto: number;
  forma: FormaPago;
  notas?: string;
}
