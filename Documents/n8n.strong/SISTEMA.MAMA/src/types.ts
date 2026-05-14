export type PrecioCategoria = 'general' | 'especial';
export type FormaPago = 'Efectivo' | 'Transferencia' | 'Cheque' | 'Tarjeta';

export interface Cliente {
  id: string;
  nombre: string;
  tel: string;
  email: string;
  cat: PrecioCategoria;
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
}

export interface Factura {
  id: string;
  clienteId: string;
  fecha: string;
  items: FacturaItem[];
  total: number;
}

export interface Pago {
  id: string;
  clienteId: string;
  fecha: string;
  monto: number;
  forma: FormaPago;
  notas?: string;
}
