import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Modal } from './components/Modal';
import type { Cliente, Factura, FacturaItem, FormaPago, Producto } from './types';
import type { BackupPayload } from './lib/storage';
import {
  exportBackup,
  importBackup,
  loadClientes,
  loadFacturas,
  loadPagos,
  loadProductos,
  saveClientes,
  saveFacturas,
  savePagos,
  saveProductos,
} from './lib/storage';

type Page = 'dashboard' | 'clientes' | 'cuenta' | 'historial' | 'nuevo-cliente' | 'productos' | 'backup';

interface RowFactura extends FacturaItem {
  query: string;
  rowKey: string;
}

const formatMoney = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
const today = new Date().toISOString().slice(0, 10);
const formasPago: FormaPago[] = ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta'];

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [pagos, setPagos] = useState<import('./types').Pago[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [invoiceClient, setInvoiceClient] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [rows, setRows] = useState<RowFactura[]>([
    { rowKey: 'r0', prodId: '', nombre: '', categoria: '', talle: '', color: '', cant: 1, precio: 0, query: '' },
  ]);
  const [productFilter, setProductFilter] = useState('');
  const [productEdit, setProductEdit] = useState<Producto | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentClienteId, setPaymentClienteId] = useState('');
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentForm, setPaymentForm] = useState<FormaPago>('Efectivo');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [newClientNombre, setNewClientNombre] = useState('');
  const [newClientTel, setNewClientTel] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCat, setNewClientCat] = useState<'general' | 'especial'>('general');
  const [newClientNotas, setNewClientNotas] = useState('');
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [newProducto, setNewProducto] = useState({
    nombre: '',
    categoria: '',
    talle: '',
    color: '',
    precio: 0,
    precioEsp: 0,
  });
  const [backupText, setBackupText] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [backupError, setBackupError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const [clientesData, productosData, facturasData, pagosData] = await Promise.all([
        loadClientes(),
        loadProductos(),
        loadFacturas(),
        loadPagos(),
      ]);

      setClientes(clientesData);
      setProductos(productosData);
      setFacturas(facturasData);
      setPagos(pagosData);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!invoiceClient && clientes.length > 0) {
      setInvoiceClient(clientes[0].id);
    }
    if (!selectedClientId && clientes.length > 0) {
      setSelectedClientId(clientes[0].id);
    }
  }, [clientes]);

  useEffect(() => {
    if (!selectedClientId && clientes.length > 0) setSelectedClientId(clientes[0].id);
    if (!invoiceClient && clientes.length > 0) setInvoiceClient(clientes[0].id);
  }, [clientes, selectedClientId, invoiceClient]);

  const clienteActual = useMemo(
    () => clientes.find((cliente) => cliente.id === selectedClientId) ?? clientes[0],
    [clientes, selectedClientId]
  );

  const invoiceClienteActual = useMemo(
    () => clientes.find((cliente) => cliente.id === invoiceClient) ?? clientes[0],
    [clientes, invoiceClient]
  );

  const pagosPorCliente = useMemo(
    () => pagos.filter((p) => p.clienteId === selectedClientId),
    [pagos, selectedClientId]
  );

  const facturasPorCliente = useMemo(
    () => facturas.filter((f) => f.clienteId === selectedClientId).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [facturas, selectedClientId]
  );

  const todosLosPagos = useMemo(() => pagos.filter((p) => p.clienteId === invoiceClient), [pagos, invoiceClient]);

  const totalComprado = useMemo(
    () => facturasPorCliente.reduce((total, factura) => total + factura.total, 0),
    [facturasPorCliente]
  );

  const totalPagado = useMemo(
    () => pagosPorCliente.reduce((total, pago) => total + pago.monto, 0),
    [pagosPorCliente]
  );

  const saldoPendiente = totalComprado - totalPagado;
  const ultimoPago = pagosPorCliente
    .map((p) => p.fecha)
    .sort()
    .reverse()[0] || '—';

  const totalFactura = useMemo(
    () => rows.reduce((total, row) => total + row.precio * row.cant, 0),
    [rows]
  );

  const orderedFacturas = useMemo(
    () => [...facturas].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [facturas]
  );

  const findProductPrice = (product: Producto, categoria: 'general' | 'especial') =>
    categoria === 'especial' && product.precioEsp ? product.precioEsp : product.precio;

  const updateRowProduct = (rowKey: string, product: Producto) => {
    setRows((rows) =>
      rows.map((row) =>
        row.rowKey !== rowKey
          ? row
          : {
              ...row,
              prodId: product.id,
              nombre: product.nombre,
              categoria: product.categoria,
              talle: product.talle,
              color: product.color,
              precio: findProductPrice(product, invoiceClienteActual?.cat ?? 'general'),
              query: product.nombre,
            }
      )
    );
  };

  const updateClientPrices = (clienteId: string) => {
    const client = clientes.find((item) => item.id === clienteId);
    if (!client) return;
    setRows((rows) =>
      rows.map((row) => {
        if (!row.prodId) return row;
        const product = productos.find((item) => item.id === row.prodId);
        if (!product) return row;
        return { ...row, precio: findProductPrice(product, client.cat) };
      })
    );
  };

  const handleInvoiceClientChange = (value: string) => {
    setInvoiceClient(value);
    updateClientPrices(value);
  };

  const filteredProducts = (query: string) => {
    const text = query.toLowerCase().trim();
    return productos.filter((product) =>
      [product.nombre, product.categoria, product.talle, product.color]
        .some((value) => value.toLowerCase().includes(text))
    );
  };

  const handleRowChange = (rowKey: string, field: keyof RowFactura, value: string | number) => {
    setRows((rows) =>
      rows.map((row) =>
        row.rowKey !== rowKey
          ? row
          : {
              ...row,
              [field]: value,
            }
      )
    );
  };

  const addRow = () => {
    setRows((rows) => [
      ...rows,
      { rowKey: `r${Date.now()}`, prodId: '', nombre: '', categoria: '', talle: '', color: '', cant: 1, precio: 0, query: '' },
    ]);
  };

  const removeRow = (rowKey: string) => {
    setRows((rows) => rows.filter((row) => row.rowKey !== rowKey));
  };

  const handleConfirmInvoice = async () => {
    if (!invoiceClienteActual) return;
    const items = rows.filter((row) => row.prodId && row.cant > 0);
    if (!items.length) return;
    const factura: Factura = {
      id: `f${Date.now()}`,
      clienteId: invoiceClienteActual.id,
      fecha: invoiceDate,
      items,
      total: items.reduce((sum, item) => sum + item.precio * item.cant, 0),
    };
    const nextFacturas = [factura, ...facturas];
    setFacturas(nextFacturas);
    await saveFacturas(nextFacturas);
    setRows([
      { rowKey: 'r0', prodId: '', nombre: '', categoria: '', talle: '', color: '', cant: 1, precio: 0, query: '' },
    ]);
    setInvoiceDate(today);
    setPage('historial');
  };

  const handleNewClient = async () => {
    if (!newClientNombre.trim()) return;

    if (editingClient) {
      // Editar cliente existente
      const clienteActualizado = {
        ...editingClient,
        nombre: newClientNombre.trim(),
        tel: newClientTel.trim(),
        email: newClientEmail.trim(),
        cat: newClientCat,
        notas: newClientNotas.trim(),
      };
      const nextClientes = clientes.map(c => c.id === editingClient.id ? clienteActualizado : c);
      setClientes(nextClientes);
      await saveClientes(nextClientes);
      setEditingClient(null);
    } else {
      // Crear nuevo cliente
      const cliente: Cliente = {
        id: `c${Date.now()}`,
        nombre: newClientNombre.trim(),
        tel: newClientTel.trim(),
        email: newClientEmail.trim(),
        cat: newClientCat,
        notas: newClientNotas.trim(),
      };
      const nextClientes = [cliente, ...clientes];
      setClientes(nextClientes);
      await saveClientes(nextClientes);
    }

    setNewClientNombre('');
    setNewClientTel('');
    setNewClientEmail('');
    setNewClientCat('general');
    setNewClientNotas('');
    setPage('clientes');
  };

  const handleEditClient = (client: Cliente) => {
    setEditingClient(client);
    setNewClientNombre(client.nombre);
    setNewClientTel(client.tel);
    setNewClientEmail(client.email);
    setNewClientCat(client.cat);
    setNewClientNotas(client.notas || '');
    setPage('nuevo-cliente');
  };

  const handleDeleteClient = async (clientId: string) => {
    const client = clientes.find(c => c.id === clientId);
    if (!client) return;

    const hasFacturas = facturas.some(f => f.clienteId === clientId);
    const hasPagos = pagos.some(p => p.clienteId === clientId);

    if (hasFacturas || hasPagos) {
      const confirmMessage = `¿Estás seguro de eliminar a "${client.nombre}"?\n\nEste cliente tiene:\n${hasFacturas ? '• Facturas registradas\n' : ''}${hasPagos ? '• Pagos registrados\n' : ''}\nTodos estos datos también se eliminarán.`;

      if (!window.confirm(confirmMessage)) return;

      // Eliminar facturas y pagos del cliente
      const nextFacturas = facturas.filter(f => f.clienteId !== clientId);
      const nextPagos = pagos.filter(p => p.clienteId !== clientId);
      setFacturas(nextFacturas);
      setPagos(nextPagos);
      await saveFacturas(nextFacturas);
      await savePagos(nextPagos);
    } else {
      if (!window.confirm(`¿Estás seguro de eliminar a "${client.nombre}"?`)) return;
    }

    const nextClientes = clientes.filter(c => c.id !== clientId);
    setClientes(nextClientes);
    await saveClientes(nextClientes);

    // Si estaba seleccionado, cambiar a otro cliente
    if (selectedClientId === clientId && nextClientes.length > 0) {
      setSelectedClientId(nextClientes[0].id);
    }
    if (invoiceClient === clientId && nextClientes.length > 0) {
      setInvoiceClient(nextClientes[0].id);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentClienteId || paymentAmount <= 0) return;
    const pago = {
      id: `pay${Date.now()}`,
      clienteId: paymentClienteId,
      fecha: paymentDate,
      monto: paymentAmount,
      forma: paymentForm,
      notas: paymentNotes.trim(),
    };
    const nextPagos = [pago, ...pagos];
    setPagos(nextPagos);
    await savePagos(nextPagos);
    setPaymentModalOpen(false);
    setPaymentAmount(0);
    setPaymentNotes('');
  };

  const handleProductSave = async () => {
    const trimmed = {
      nombre: newProducto.nombre.trim(),
      categoria: newProducto.categoria.trim(),
      talle: newProducto.talle.trim(),
      color: newProducto.color.trim(),
      precio: Number(newProducto.precio),
      precioEsp: Number(newProducto.precioEsp) || undefined,
    };
    if (!trimmed.nombre || !trimmed.categoria || !trimmed.talle || !trimmed.color || !trimmed.precio) return;
    if (productEdit) {
      const nextProductos = productos.map((item) =>
        item.id === productEdit.id ? { ...item, ...trimmed, precioEsp: trimmed.precioEsp } : item
      );
      setProductos(nextProductos);
      await saveProductos(nextProductos);
      setProductEdit(null);
    } else {
      const nuevo: Producto = {
        id: `p${Date.now()}`,
        ...trimmed,
      };
      const nextProductos = [nuevo, ...productos];
      setProductos(nextProductos);
      await saveProductos(nextProductos);
    }
    setNewProducto({ nombre: '', categoria: '', talle: '', color: '', precio: 0, precioEsp: 0 });
  };

  const handleProductEdit = (item: Producto) => {
    setProductEdit(item);
    setNewProducto({
      nombre: item.nombre,
      categoria: item.categoria,
      talle: item.talle,
      color: item.color,
      precio: item.precio,
      precioEsp: item.precioEsp ?? 0,
    });
    setPage('productos');
  };

  const handleProductDelete = async (id: string) => {
    const next = productos.filter((item) => item.id !== id);
    setProductos(next);
    await saveProductos(next);
  };

  const handleBackupDownload = async () => {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cuenta-corriente-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleBackupRestore = async (rawText: string) => {
    setBackupError('');
    setBackupMessage('');
    try {
      const parsed = JSON.parse(rawText) as BackupPayload;
      if (
        !Array.isArray(parsed.clientes) ||
        !Array.isArray(parsed.productos) ||
        !Array.isArray(parsed.facturas) ||
        !Array.isArray(parsed.pagos)
      ) {
        throw new Error('Formato de backup inválido');
      }
      await importBackup(parsed);
      setClientes(parsed.clientes);
      setProductos(parsed.productos);
      setFacturas(parsed.facturas);
      setPagos(parsed.pagos);
      setBackupMessage('Datos restaurados correctamente');
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'No se pudo restaurar el backup');
    }
  };

  const handleBackupFile = (file: File) => {
    setBackupError('');
    setBackupMessage('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleBackupRestore(reader.result);
      }
    };
    reader.onerror = () => {
      setBackupError('No se pudo leer el archivo');
    };
    reader.readAsText(file);
  };

  const productList = productos.filter((item) =>
    [item.nombre, item.categoria, item.talle, item.color].some((value) =>
      value.toLowerCase().includes(productFilter.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-surface text-textPrimary">
      <div className="lg:flex">
        <Sidebar active={page} onSelect={setPage} />
        <main className="flex-1 px-4 py-6 lg:px-10">
          <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_300px] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-textSecondary">Portal</p>
              <h2 className="mt-3 text-3xl font-semibold">Cuenta corriente mayorista</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setPage('dashboard')}
                className="rounded-3xl bg-white px-4 py-3 text-sm font-medium text-textPrimary shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                Nueva factura
              </button>
              <button
                type="button"
                onClick={() => setPage('clientes')}
                className="rounded-3xl bg-white px-4 py-3 text-sm font-medium text-textPrimary shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                Clientes
              </button>
            </div>
          </div>

          {page === 'dashboard' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm text-textSecondary">Factura nueva</p>
                    <h3 className="mt-1 text-2xl font-semibold">Completa la venta y actualiza la cuenta</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-textSecondary">
                      Cliente
                      <select
                        value={invoiceClient}
                        onChange={(e) => handleInvoiceClientChange(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      >
                        {clientes.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm text-textSecondary">
                      Fecha
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-6 overflow-hidden rounded-3xl border border-border">
                  <div className="grid grid-cols-[2fr_80px_120px_120px_80px] gap-4 bg-slate-50 px-5 py-4 text-sm uppercase tracking-[0.12em] text-textSecondary">
                    <span>Producto</span>
                    <span>Cant.</span>
                    <span>Precio</span>
                    <span>Subtotal</span>
                    <span></span>
                  </div>
                  <div className="divide-y divide-slate-200 bg-white">
                    {rows.map((row) => {
                      const matches = row.query ? filteredProducts(row.query) : [];
                      return (
                        <div key={row.rowKey} className="grid grid-cols-[2fr_80px_120px_120px_80px] gap-4 px-5 py-4 items-start">
                          <div className="relative">
                            <input
                              value={row.query}
                              onChange={(event) => handleRowChange(row.rowKey, 'query', event.target.value)}
                              placeholder="Buscar producto..."
                              className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-accent"
                            />
                            {row.query && matches.length > 0 && (
                              <div className="absolute left-0 top-full z-20 mt-2 max-h-60 w-full overflow-auto rounded-3xl border border-border bg-white shadow-xl">
                                {matches.slice(0, 6).map((product) => (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => updateRowProduct(row.rowKey, product)}
                                    className="w-full px-4 py-3 text-left text-sm text-textPrimary transition hover:bg-slate-50"
                                  >
                                    <span className="font-semibold">{product.nombre}</span>
                                    <span className="ml-2 text-textSecondary">{product.talle} • {product.color}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {row.prodId && (
                              <p className="mt-2 text-sm text-textSecondary">
                                {row.categoria} • {row.talle} • {row.color}
                              </p>
                            )}
                          </div>
                          <label className="space-y-2 text-sm text-textSecondary">
                            <input
                              type="number"
                              min={1}
                              value={row.cant}
                              onChange={(event) => handleRowChange(row.rowKey, 'cant', Number(event.target.value))}
                              className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                            />
                          </label>
                          <div>
                            <input
                              value={row.precio}
                              onChange={(event) => handleRowChange(row.rowKey, 'precio', Number(event.target.value))}
                              type="number"
                              min={0}
                              className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                            />
                          </div>
                          <div className="flex items-center text-sm text-textPrimary">
                            {formatMoney(row.precio * row.cant)}
                          </div>
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => removeRow(row.rowKey)}
                              className="rounded-full px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-4 rounded-3xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center justify-center rounded-3xl bg-white px-5 py-3 text-sm font-medium text-textPrimary shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    Añadir
                  </button>
                  <div className="text-right">
                    <p className="text-sm text-textSecondary">Total general</p>
                    <p className="mt-1 text-3xl font-semibold">{formatMoney(totalFactura)}</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <p className="text-sm text-textSecondary">El total se guarda como factura y actualiza el saldo del cliente.</p>
                  <button
                    type="button"
                    onClick={handleConfirmInvoice}
                    className="rounded-3xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50"
                    disabled={!invoiceClienteActual || rows.every((row) => !row.prodId)}
                  >
                    Confirmar factura
                  </button>
                </div>
              </div>
            </section>
          )}

          {page === 'clientes' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">Clientes</h3>
                    <p className="mt-1 text-sm text-textSecondary">Revisa rápidamente el saldo, categoría y último pago.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPage('nuevo-cliente');
                    }}
                    className="rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                  >
                    Nuevo cliente
                  </button>
                </div>
                <div className="mt-6 overflow-hidden rounded-3xl border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-textSecondary">
                      <tr>
                        <th className="px-5 py-4 text-left">Nombre</th>
                        <th className="px-5 py-4 text-left">Categoría</th>
                        <th className="px-5 py-4 text-left">Teléfono</th>
                        <th className="px-5 py-4 text-left">Saldo</th>
                        <th className="px-5 py-4 text-left">Último pago</th>
                        <th className="px-5 py-4 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map((cliente) => {
                        const clienteFacturas = facturas.filter((factura) => factura.clienteId === cliente.id);
                        const clientePagos = pagos.filter((p) => p.clienteId === cliente.id);
                        const total = clienteFacturas.reduce((sum, factura) => sum + factura.total, 0) - clientePagos.reduce((sum, pago) => sum + pago.monto, 0);
                        const lastPago = clientePagos.map((p) => p.fecha).sort().reverse()[0] || '—';
                        return (
                          <tr key={cliente.id} className="border-t border-slate-200 hover:bg-slate-50">
                            <td
                              className="cursor-pointer px-5 py-4"
                              onClick={() => {
                                setSelectedClientId(cliente.id);
                                setPage('cuenta');
                              }}
                            >
                              <div className="font-medium">{cliente.nombre}</div>
                              <div className="mt-1 text-xs text-textSecondary">{cliente.email}</div>
                            </td>
                            <td className="px-5 py-4 capitalize text-textSecondary">{cliente.cat}</td>
                            <td className="px-5 py-4 text-textSecondary">{cliente.tel}</td>
                            <td className="px-5 py-4 font-semibold">{formatMoney(total)}</td>
                            <td className="px-5 py-4 text-textSecondary">{lastPago}</td>
                            <td className="px-5 py-4">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPaymentClienteId(cliente.id);
                                    setPaymentModalOpen(true);
                                  }}
                                  className="rounded-3xl bg-blue-100 px-3 py-2 text-xs text-blue-700 transition hover:bg-blue-200"
                                >
                                  Pago
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditClient(cliente)}
                                  className="rounded-3xl bg-amber-100 px-3 py-2 text-xs text-amber-700 transition hover:bg-amber-200"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClient(cliente.id)}
                                  className="rounded-3xl bg-red-100 px-3 py-2 text-xs text-red-700 transition hover:bg-red-200"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {page === 'cuenta' && clienteActual && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">{clienteActual.nombre}</h3>
                    <p className="mt-1 text-sm text-textSecondary">Categoría: {clienteActual.cat}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentClienteId(clienteActual.id);
                      setPaymentModalOpen(true);
                    }}
                    className="rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                  >
                    Registrar pago
                  </button>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-border bg-slate-50 p-5">
                    <p className="text-sm text-textSecondary">Saldo pendiente</p>
                    <p className="mt-2 text-3xl font-semibold">{formatMoney(saldoPendiente)}</p>
                  </div>
                  <div className="rounded-3xl border border-border bg-slate-50 p-5">
                    <p className="text-sm text-textSecondary">Total comprado</p>
                    <p className="mt-2 text-3xl font-semibold">{formatMoney(totalComprado)}</p>
                  </div>
                  <div className="rounded-3xl border border-border bg-slate-50 p-5">
                    <p className="text-sm text-textSecondary">Total pagado</p>
                    <p className="mt-2 text-3xl font-semibold">{formatMoney(totalPagado)}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl bg-white p-6 shadow-panel">
                  <h4 className="text-xl font-semibold">Compras</h4>
                  <div className="mt-5 overflow-hidden rounded-3xl border border-border">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-slate-50 text-textSecondary">
                        <tr>
                          <th className="px-5 py-4 text-left">Fecha</th>
                          <th className="px-5 py-4 text-left">Productos</th>
                          <th className="px-5 py-4 text-left">Total</th>
                          <th className="px-5 py-4 text-left">Saldo acumulado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facturasPorCliente.map((factura, index) => {
                          const acumulado = facturasPorCliente.slice(0, index + 1).reduce((sum, item) => sum + item.total, 0);
                          return (
                            <tr key={factura.id} className="border-t border-slate-200 hover:bg-slate-50">
                              <td className="px-5 py-4 text-textSecondary">{factura.fecha}</td>
                              <td className="px-5 py-4">
                                <div className="max-w-xs text-sm text-textSecondary">
                                  {factura.items.map((item) => (
                                    <div key={item.prodId}>
                                      {item.nombre} × {item.cant}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-5 py-4 font-medium">{formatMoney(factura.total)}</td>
                              <td className="px-5 py-4 text-textSecondary">{formatMoney(acumulado)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-panel">
                  <h4 className="text-xl font-semibold">Pagos</h4>
                  <div className="mt-5 space-y-4">
                    {pagosPorCliente.length === 0 ? (
                      <p className="text-sm text-textSecondary">No hay pagos registrados aún.</p>
                    ) : (
                      pagosPorCliente.map((pago) => (
                        <div key={pago.id} className="rounded-3xl border border-border bg-slate-50 p-4">
                          <p className="text-sm text-textSecondary">{pago.fecha} • {pago.forma}</p>
                          <p className="mt-2 text-xl font-semibold">{formatMoney(pago.monto)}</p>
                          {pago.notas && <p className="mt-2 text-sm text-textSecondary">{pago.notas}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {page === 'historial' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-panel">
                <h3 className="text-2xl font-semibold">Historial de facturas</h3>
                <p className="mt-1 text-sm text-textSecondary">Todas las facturas generadas, ordenadas por fecha.</p>
                <div className="mt-6 overflow-hidden rounded-3xl border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-textSecondary">
                      <tr>
                        <th className="px-5 py-4 text-left">N°</th>
                        <th className="px-5 py-4 text-left">Fecha</th>
                        <th className="px-5 py-4 text-left">Cliente</th>
                        <th className="px-5 py-4 text-left">Ítems</th>
                        <th className="px-5 py-4 text-left">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedFacturas.map((factura, index) => {
                        const cliente = clientes.find((item) => item.id === factura.clienteId);
                        return (
                          <tr key={factura.id} className="border-t border-slate-200 hover:bg-slate-50">
                            <td className="px-5 py-4 text-textSecondary">{index + 1}</td>
                            <td className="px-5 py-4 text-textSecondary">{factura.fecha}</td>
                            <td className="px-5 py-4">{cliente?.nombre ?? 'Cliente eliminado'}</td>
                            <td className="px-5 py-4 text-textSecondary">
                              {factura.items.map((item) => `${item.nombre} ×${item.cant}`).join(', ')}
                            </td>
                            <td className="px-5 py-4 font-semibold">{formatMoney(factura.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {page === 'nuevo-cliente' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-panel sm:p-8">
                <h3 className="text-2xl font-semibold">{editingClient ? 'Editar cliente' : 'Nuevo cliente'}</h3>
                <p className="mt-1 text-sm text-textSecondary">
                  {editingClient ? 'Modifica los datos del cliente seleccionado.' : 'Registra un cliente nuevo para que aparezca en la gestión.'}
                </p>
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <label className="space-y-2 text-sm text-textSecondary">
                    Nombre / Razón social
                    <input
                      value={newClientNombre}
                      onChange={(e) => setNewClientNombre(e.target.value)}
                      className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-textSecondary">
                    Teléfono
                    <input
                      value={newClientTel}
                      onChange={(e) => setNewClientTel(e.target.value)}
                      className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-textSecondary">
                    Email
                    <input
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-textSecondary">
                    Categoría de precios
                    <select
                      value={newClientCat}
                      onChange={(e) => setNewClientCat(e.target.value as 'general' | 'especial')}
                      className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    >
                      <option value="general">General</option>
                      <option value="especial">Especial</option>
                    </select>
                  </label>
                  <label className="lg:col-span-2 space-y-2 text-sm text-textSecondary">
                    Notas
                    <textarea
                      value={newClientNotas}
                      onChange={(e) => setNewClientNotas(e.target.value)}
                      rows={4}
                      className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                  </label>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  {editingClient && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClient(null);
                        setNewClientNombre('');
                        setNewClientTel('');
                        setNewClientEmail('');
                        setNewClientCat('general');
                        setNewClientNotas('');
                        setPage('clientes');
                      }}
                      className="rounded-3xl bg-white px-6 py-3 text-sm font-semibold text-textPrimary shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNewClient}
                    className="rounded-3xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                  >
                    {editingClient ? 'Actualizar cliente' : 'Guardar cliente'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {page === 'productos' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">Productos</h3>
                    <p className="mt-1 text-sm text-textSecondary">Administra prendas, talles y precios con filtros claros.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      placeholder="Buscar producto"
                      className="rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProductEdit(null);
                        setNewProducto({ nombre: '', categoria: '', talle: '', color: '', precio: 0, precioEsp: 0 });
                      }}
                      className="rounded-3xl bg-slate-100 px-5 py-3 text-sm font-semibold text-textPrimary transition hover:bg-slate-200"
                    >
                      Nuevo producto
                    </button>
                  </div>
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
                  <div className="overflow-hidden rounded-3xl border border-border">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-slate-50 text-textSecondary">
                        <tr>
                          <th className="px-5 py-4 text-left">Nombre</th>
                          <th className="px-5 py-4 text-left">Categoría</th>
                          <th className="px-5 py-4 text-left">Talle</th>
                          <th className="px-5 py-4 text-left">Color</th>
                          <th className="px-5 py-4 text-left">Precios</th>
                          <th className="px-5 py-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {productList.map((item) => (
                          <tr key={item.id} className="border-t border-slate-200 hover:bg-slate-50">
                            <td className="px-5 py-4">{item.nombre}</td>
                            <td className="px-5 py-4 text-textSecondary capitalize">{item.categoria}</td>
                            <td className="px-5 py-4 text-textSecondary">{item.talle}</td>
                            <td className="px-5 py-4 text-textSecondary">{item.color}</td>
                            <td className="px-5 py-4 text-textSecondary">
                              {formatMoney(item.precio)}{item.precioEsp ? ` / ${formatMoney(item.precioEsp)}` : ''}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleProductEdit(item)}
                                className="mr-2 rounded-3xl bg-slate-100 px-3 py-2 text-xs text-textPrimary transition hover:bg-slate-200"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleProductDelete(item.id)}
                                className="rounded-3xl bg-red-50 px-3 py-2 text-xs text-red-600 transition hover:bg-red-100"
                              >
                                Borrar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-3xl border border-border bg-slate-50 p-6">
                    <h4 className="text-xl font-semibold">{productEdit ? 'Editar producto' : 'Agregar producto'}</h4>
                    <div className="mt-6 space-y-4">
                      <label className="space-y-2 text-sm text-textSecondary">
                        Nombre
                        <input
                          value={newProducto.nombre}
                          onChange={(e) => setNewProducto((prev) => ({ ...prev, nombre: e.target.value }))}
                          className="w-full rounded-3xl border border-border bg-white px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-textSecondary">
                        Categoría
                        <input
                          value={newProducto.categoria}
                          onChange={(e) => setNewProducto((prev) => ({ ...prev, categoria: e.target.value }))}
                          className="w-full rounded-3xl border border-border bg-white px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-textSecondary">
                        Talle
                        <input
                          value={newProducto.talle}
                          onChange={(e) => setNewProducto((prev) => ({ ...prev, talle: e.target.value }))}
                          className="w-full rounded-3xl border border-border bg-white px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-textSecondary">
                        Color
                        <input
                          value={newProducto.color}
                          onChange={(e) => setNewProducto((prev) => ({ ...prev, color: e.target.value }))}
                          className="w-full rounded-3xl border border-border bg-white px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-textSecondary">
                        Precio general
                        <input
                          type="number"
                          value={newProducto.precio}
                          onChange={(e) => setNewProducto((prev) => ({ ...prev, precio: Number(e.target.value) }))}
                          className="w-full rounded-3xl border border-border bg-white px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-textSecondary">
                        Precio especial
                        <input
                          type="number"
                          value={newProducto.precioEsp}
                          onChange={(e) => setNewProducto((prev) => ({ ...prev, precioEsp: Number(e.target.value) }))}
                          className="w-full rounded-3xl border border-border bg-white px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                        />
                      </label>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                      {productEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductEdit(null);
                            setNewProducto({ nombre: '', categoria: '', talle: '', color: '', precio: 0, precioEsp: 0 });
                          }}
                          className="rounded-3xl bg-white px-5 py-3 text-sm font-semibold text-textPrimary shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleProductSave}
                        className="rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                      >
                        Guardar producto
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {page === 'backup' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">Respaldo de datos</h3>
                    <p className="mt-1 text-sm text-textSecondary">Exporta e importa tu información para mantenerla segura.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackupDownload}
                    className="rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                  >
                    Descargar backup
                  </button>
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="rounded-3xl border border-border bg-slate-50 p-6">
                    <h4 className="text-lg font-semibold">Exportar</h4>
                    <p className="mt-2 text-sm text-textSecondary">Guarda un archivo JSON con todos los clientes, productos, facturas y pagos.</p>
                    <div className="mt-4 rounded-3xl bg-white p-4 border border-border">
                      <p className="text-sm text-textSecondary">Haz clic en "Descargar backup" y luego guarda el archivo en tu computadora.</p>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-border bg-slate-50 p-6">
                    <h4 className="text-lg font-semibold">Importar</h4>
                    <p className="mt-2 text-sm text-textSecondary">Carga un backup JSON para restaurar los datos en este navegador.</p>
                    <input
                      type="file"
                      accept="application/json"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleBackupFile(file);
                      }}
                      className="mt-4 w-full rounded-3xl border border-border bg-white px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                    <textarea
                      value={backupText}
                      onChange={(event) => setBackupText(event.target.value)}
                      placeholder="O pega aquí el contenido JSON del backup"
                      rows={8}
                      className="mt-4 w-full rounded-3xl border border-border bg-white px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => handleBackupRestore(backupText)}
                      className="mt-4 rounded-3xl bg-white px-5 py-3 text-sm font-semibold text-textPrimary shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                    >
                      Restaurar desde JSON
                    </button>
                    {backupMessage && <p className="mt-3 text-sm text-emerald-600">{backupMessage}</p>}
                    {backupError && <p className="mt-3 text-sm text-red-600">{backupError}</p>}
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      <Modal title="Registrar pago" open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)}>
        <div className="space-y-4">
          <label className="space-y-2 text-sm text-textSecondary">
            Cliente
            <select
              value={paymentClienteId}
              onChange={(e) => setPaymentClienteId(e.target.value)}
              className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
            >
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-textSecondary">
              Fecha
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
              />
            </label>
            <label className="space-y-2 text-sm text-textSecondary">
              Monto
              <input
                type="number"
                min={0}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
              />
            </label>
          </div>
          <label className="space-y-2 text-sm text-textSecondary">
            Forma de pago
            <select
              value={paymentForm}
              onChange={(e) => setPaymentForm(e.target.value as FormaPago)}
              className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
            >
              {formasPago.map((forma) => (
                <option key={forma} value={forma}>
                  {forma}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-textSecondary">
            Notas
            <textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              rows={4}
              className="w-full rounded-3xl border border-border bg-slate-50 px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
            />
          </label>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="rounded-3xl bg-white px-5 py-3 text-sm font-semibold text-textPrimary shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePaymentSubmit}
              className="rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
            >
              Guardar pago
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;
