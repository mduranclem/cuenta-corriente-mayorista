import type { Cliente, Factura, Pago } from '../types';
import { describirItem } from './talles';

/**
 * Una fila de la planilla contable. Cada factura genera un movimiento en el
 * DEBE y cada pago uno en el HABER. El saldo se acumula fila por fila.
 */
export interface MovimientoCuenta {
  id: string;
  tipo: 'factura' | 'pago';
  fecha: string;
  comprobante: string;
  detalle: string;
  debe: number;
  haber: number;
  saldo: number;
  /** Solo en los movimientos de tipo factura: permite desplegar sus ítems. */
  factura?: Factura;
}

export interface CuentaCorriente {
  movimientos: MovimientoCuenta[];
  totalDebe: number;
  totalHaber: number;
  saldoFinal: number;
}

/** Número de comprobante legible a partir del id interno. */
export function numeroComprobante(id: string, prefijo: string): string {
  return `${prefijo}-${id.slice(-8).toUpperCase()}`;
}

function resumirItems(factura: Factura): string {
  const partes = factura.items.map(item => {
    const variante = describirItem(item);
    return `${item.nombre}${variante ? ` (${variante})` : ''} x${item.cant}`;
  });
  if (partes.length === 0) return 'Factura sin ítems';
  if (partes.length <= 3) return partes.join(', ');
  return `${partes.slice(0, 3).join(', ')} y ${partes.length - 3} ítem${partes.length - 3 !== 1 ? 's' : ''} más`;
}

/**
 * Construye la cuenta corriente de un cliente a partir de sus facturas y pagos
 * ya registrados: nada se carga a mano. Orden cronológico, más antiguo primero.
 */
export function construirCuentaCorriente(
  clienteId: string,
  facturas: Factura[],
  pagos: Pago[]
): CuentaCorriente {
  const deFacturas = facturas
    .filter(f => f.clienteId === clienteId)
    .map(f => ({
      id: f.id,
      tipo: 'factura' as const,
      fecha: f.fecha,
      comprobante: numeroComprobante(f.id, 'FAC'),
      detalle: resumirItems(f),
      debe: f.total,
      haber: 0,
      saldo: 0,
      factura: f,
    }));

  const dePagos = pagos
    .filter(p => p.clienteId === clienteId)
    .map(p => ({
      id: p.id,
      tipo: 'pago' as const,
      fecha: p.fecha,
      comprobante: numeroComprobante(p.id, 'REC'),
      detalle: `Pago ${p.forma}${p.notas ? ` — ${p.notas}` : ''}`,
      debe: 0,
      haber: p.monto,
      saldo: 0,
    }));

  // Ante la misma fecha, la factura va antes que el pago: primero se debe,
  // después se cancela.
  const movimientos = [...deFacturas, ...dePagos].sort((a, b) => {
    const porFecha = a.fecha.localeCompare(b.fecha);
    if (porFecha !== 0) return porFecha;
    if (a.tipo !== b.tipo) return a.tipo === 'factura' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  let saldo = 0;
  let totalDebe = 0;
  let totalHaber = 0;
  for (const mov of movimientos) {
    saldo = saldo + mov.debe - mov.haber;
    mov.saldo = saldo;
    totalDebe += mov.debe;
    totalHaber += mov.haber;
  }

  return { movimientos, totalDebe, totalHaber, saldoFinal: saldo };
}

export interface ResumenClienteCuenta {
  cliente: Cliente;
  ultimaFactura: string;
  debe: number;
  haber: number;
  saldo: number;
}

/**
 * Primer nivel: un renglón por cliente con su total facturado, total pagado y
 * saldo. Ordenado de mayor a menor saldo.
 */
export function resumirCuentasPorCliente(
  clientes: Cliente[],
  facturas: Factura[],
  pagos: Pago[],
  soloConDeuda = true
): ResumenClienteCuenta[] {
  return clientes
    .map(cliente => {
      const suyas = facturas.filter(f => f.clienteId === cliente.id);
      const debe = suyas.reduce((s, f) => s + f.total, 0);
      const haber = pagos
        .filter(p => p.clienteId === cliente.id)
        .reduce((s, p) => s + p.monto, 0);
      const ultimaFactura = suyas
        .map(f => f.fecha)
        .sort()
        .reverse()[0] ?? '—';
      return { cliente, ultimaFactura, debe, haber, saldo: debe - haber };
    })
    .filter(x => (soloConDeuda ? x.saldo > 0 : true))
    .sort((a, b) => b.saldo - a.saldo);
}
