import { Fragment, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Cliente, Factura, Pago } from '../types';
import { construirCuentaCorriente } from '../lib/cuentaCorriente';
import { describirItem } from '../lib/talles';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);


interface Props {
  cliente: Cliente;
  facturas: Factura[];
  pagos: Pago[];
  onError?: (mensaje: string) => void;
  /** Si se pasa, aparece el botón "Imprimir" dentro de la factura desplegada. */
  onImprimirFactura?: (factura: Factura) => void;
}

/**
 * Planilla contable de la cuenta corriente de un cliente.
 * Misma vista para el detalle del Inicio y para la ficha del cliente.
 */
export function CuentaCorrientePlanilla({
  cliente,
  facturas,
  pagos,
  onError,
  onImprimirFactura,
}: Props) {
  const cuenta = useMemo(
    () => construirCuentaCorriente(cliente.id, facturas, pagos),
    [cliente.id, facturas, pagos]
  );

  // Factura desplegada dentro de la planilla (null = todas cerradas)
  const [facturaAbierta, setFacturaAbierta] = useState<string | null>(null);

  const filasExport = () =>
    cuenta.movimientos.map(m => ({
      Fecha: m.fecha,
      Comprobante: m.comprobante,
      Detalle: m.detalle,
      Debe: m.debe || 0,
      Haber: m.haber || 0,
      'Saldo acumulado': m.saldo,
    }));

  const nombreArchivo = cliente.nombre.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Cuenta corriente', 14, 20);
    doc.setFontSize(11);
    doc.text(cliente.nombre, 14, 28);
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')}`, 14, 34);

    autoTable(doc, {
      head: [['Fecha', 'Comprobante', 'Detalle', 'Debe', 'Haber', 'Saldo']],
      body: cuenta.movimientos.map(m => [
        m.fecha,
        m.comprobante,
        m.detalle,
        m.debe ? formatMoney(m.debe) : '',
        m.haber ? formatMoney(m.haber) : '',
        formatMoney(m.saldo),
      ]),
      foot: [[
        '',
        '',
        'TOTALES',
        formatMoney(cuenta.totalDebe),
        formatMoney(cuenta.totalHaber),
        formatMoney(cuenta.saldoFinal),
      ]],
      startY: 40,
      styles: { fontSize: 8 },
      columnStyles: {
        2: { cellWidth: 60 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
    });
    doc.save(`cuenta-corriente-${nombreArchivo}.pdf`);
  };

  const exportarExcel = () => {
    const data = filasExport();
    data.push({
      Fecha: '',
      Comprobante: '',
      Detalle: 'TOTALES',
      Debe: cuenta.totalDebe,
      Haber: cuenta.totalHaber,
      'Saldo acumulado': cuenta.saldoFinal,
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cuenta corriente');
    XLSX.writeFile(wb, `cuenta-corriente-${nombreArchivo}.xlsx`);
  };

  const enviarWhatsApp = () => {
    if (!cliente.tel) {
      onError?.('Este cliente no tiene teléfono registrado');
      return;
    }
    const wv = { wave: '\u{1F44B}', box: '\u{1F4E6}', money: '\u{1F4B0}', clipboard: '\u{1F4CB}', hands: '\u{1F64C}' };
    const ultimos = cuenta.movimientos.slice(-3).map(m =>
      `- ${m.fecha} · ${m.comprobante} · ${m.debe ? `debe ${formatMoney(m.debe)}` : `pago ${formatMoney(m.haber)}`}`
    ).join('\n');
    const mensaje =
      `Hola ${cliente.nombre} ${wv.wave}\nTe enviamos el resumen de tu cuenta corriente:\n\n` +
      `${wv.box} Total facturado: ${formatMoney(cuenta.totalDebe)}\n` +
      `${wv.money} Total pagado: ${formatMoney(cuenta.totalHaber)}\n` +
      `${wv.clipboard} Saldo pendiente: ${formatMoney(cuenta.saldoFinal)}\n\n` +
      `Ultimos movimientos:\n${ultimos || '- Sin movimientos'}\n\n` +
      `Cualquier consulta, estamos a disposicion ${wv.hands}`;
    const tel = cliente.tel.replace(/\D/g, '');
    window.open(`https://wa.me/54${tel}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="text-textSecondary">
            Debe <span className="ml-1 font-semibold text-textPrimary">{formatMoney(cuenta.totalDebe)}</span>
          </span>
          <span className="text-textSecondary">
            Haber <span className="ml-1 font-semibold text-green-400">{formatMoney(cuenta.totalHaber)}</span>
          </span>
          <span className="text-textSecondary">
            Saldo{' '}
            <span className={`ml-1 font-semibold ${cuenta.saldoFinal > 0 ? 'text-amber-400' : 'text-green-400'}`}>
              {formatMoney(cuenta.saldoFinal)}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportarPDF}
            className="rounded-3xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-textPrimary transition hover:bg-border"
          >
            Exportar PDF
          </button>
          <button
            type="button"
            onClick={exportarExcel}
            className="rounded-3xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-textPrimary transition hover:bg-border"
          >
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={enviarWhatsApp}
            className="rounded-3xl bg-green-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-700"
          >
            📱 Enviar por WhatsApp
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm min-w-[760px]">
            <thead className="bg-surface text-textSecondary">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Comprobante</th>
                <th className="px-4 py-3 text-left">Detalle</th>
                <th className="px-4 py-3 text-right">Debe</th>
                <th className="px-4 py-3 text-right">Haber</th>
                <th className="px-4 py-3 text-right">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody>
              {cuenta.movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-textSecondary">
                    Este cliente todavía no tiene movimientos.
                  </td>
                </tr>
              ) : (
                cuenta.movimientos.map(mov => {
                  const abierta = facturaAbierta === mov.id;
                  return (
                    <Fragment key={`${mov.tipo}-${mov.id}`}>
                      <tr className="border-t border-border hover:bg-surface">
                        <td className="whitespace-nowrap px-4 py-3 text-textSecondary">{mov.fecha}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              mov.tipo === 'factura'
                                ? 'bg-accent/15 text-accent'
                                : 'bg-green-600/15 text-green-400'
                            }`}
                          >
                            {mov.comprobante}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-textSecondary">
                          {mov.factura ? (
                            <button
                              type="button"
                              onClick={() => setFacturaAbierta(abierta ? null : mov.id)}
                              title="Ver el detalle completo de la factura"
                              className="flex items-start gap-2 text-left transition hover:text-accent"
                            >
                              <span className="mt-0.5 select-none text-xs text-accent">
                                {abierta ? '▼' : '▶'}
                              </span>
                              <span className="underline decoration-dotted underline-offset-2">
                                {mov.detalle}
                              </span>
                            </button>
                          ) : (
                            mov.detalle
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-textPrimary">
                          {mov.debe ? formatMoney(mov.debe) : ''}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-400">
                          {mov.haber ? formatMoney(mov.haber) : ''}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{formatMoney(mov.saldo)}</td>
                      </tr>

                      {abierta && mov.factura && (
                        <tr className="border-t border-border/40 bg-surface/40">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="rounded-2xl border border-border bg-panel p-4">
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-textPrimary">
                                    Factura {mov.comprobante}
                                  </p>
                                  <p className="text-xs text-textSecondary">
                                    {mov.fecha} · {mov.factura.items.length} ítem
                                    {mov.factura.items.length !== 1 ? 's' : ''}
                                    {' · '}
                                    {mov.factura.items.reduce((s, i) => s + i.cant, 0)} unidades
                                  </p>
                                </div>
                                {onImprimirFactura && (
                                  <button
                                    type="button"
                                    onClick={() => onImprimirFactura(mov.factura!)}
                                    className="rounded-3xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-textPrimary transition hover:bg-border"
                                  >
                                    🖨️ Imprimir factura
                                  </button>
                                )}
                              </div>

                              <table className="w-full border-collapse text-xs">
                                <thead>
                                  <tr className="text-textSecondary">
                                    <th className="px-2 py-2 text-left font-medium">Producto</th>
                                    <th className="px-2 py-2 text-left font-medium">Detalle</th>
                                    <th className="px-2 py-2 text-right font-medium">Cant.</th>
                                    <th className="px-2 py-2 text-right font-medium">Precio unit.</th>
                                    <th className="px-2 py-2 text-right font-medium">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {mov.factura.items.map((item, i) => (
                                    <tr key={`${item.prodId}-${i}`} className="border-t border-border/60">
                                      <td className="px-2 py-2 font-medium text-textPrimary">{item.nombre}</td>
                                      <td className="px-2 py-2 text-textSecondary">{describirItem(item)}</td>
                                      <td className="px-2 py-2 text-right">{item.cant}</td>
                                      <td className="px-2 py-2 text-right">{formatMoney(item.precio)}</td>
                                      <td className="px-2 py-2 text-right font-medium">
                                        {formatMoney(item.precio * item.cant)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  {mov.factura.descuento ? (
                                    <>
                                      <tr className="border-t border-border">
                                        <td className="px-2 py-2 text-right text-textSecondary" colSpan={4}>
                                          Subtotal
                                        </td>
                                        <td className="px-2 py-2 text-right text-textSecondary">
                                          {formatMoney(
                                            mov.factura.items.reduce((s, i) => s + i.precio * i.cant, 0)
                                          )}
                                        </td>
                                      </tr>
                                      <tr>
                                        <td className="px-2 py-2 text-right text-textSecondary" colSpan={4}>
                                          Descuento {Math.round(mov.factura.descuento * 100)}%
                                        </td>
                                        <td className="px-2 py-2 text-right text-green-400">
                                          − {formatMoney(
                                            mov.factura.items.reduce((s, i) => s + i.precio * i.cant, 0) -
                                              mov.factura.total
                                          )}
                                        </td>
                                      </tr>
                                    </>
                                  ) : null}
                                  <tr className="border-t border-border font-semibold">
                                    <td className="px-2 py-2 text-right" colSpan={4}>
                                      Total de la factura
                                    </td>
                                    <td className="px-2 py-2 text-right">{formatMoney(mov.factura.total)}</td>
                                  </tr>
                                </tfoot>
                              </table>

                              {mov.factura.notas && (
                                <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-xs text-textSecondary">
                                  <strong className="text-textPrimary">Notas:</strong> {mov.factura.notas}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
            {cuenta.movimientos.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-surface font-semibold">
                  <td className="px-4 py-3 text-textSecondary" colSpan={3}>
                    Totales
                  </td>
                  <td className="px-4 py-3 text-right">{formatMoney(cuenta.totalDebe)}</td>
                  <td className="px-4 py-3 text-right text-green-400">{formatMoney(cuenta.totalHaber)}</td>
                  <td
                    className={`px-4 py-3 text-right ${
                      cuenta.saldoFinal > 0 ? 'text-amber-400' : 'text-green-400'
                    }`}
                  >
                    {formatMoney(cuenta.saldoFinal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
