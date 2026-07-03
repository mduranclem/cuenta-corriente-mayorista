import { Fragment, useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Modal } from './components/Modal';
import { Toast } from './components/Toast';
import { useToast } from './hooks/useToast';
import type { Cliente, Factura, FacturaItem, FormaPago, ListaPrecio, Pago, ProductPrice, Producto, Presupuesto } from './types';
import type { BackupPayload } from './lib/storage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  exportBackup,
  importBackup,
  loadClientes,
  loadFacturas,
  loadListasPrecios,
  saveListaPrecio,
  deleteListaPrecio,
  loadPagos,
  loadProductos,
  loadProductPrices,
  upsertProductPrice,
  saveClientes,
  saveCliente,
  deleteCliente,
  saveFactura,
  deleteFactura,
  saveFacturas,
  savePago,
  deletePago,
  savePagos,
  saveProductos,
  saveProducto,
  deleteProducto,
  logAudit,
  obtenerAuditoria,
  obtenerAuditoriaRecuperacionPagos,
  verificarPrimerAdmin,
  crearPrimerAdmin,
  registrarUsuario,
  autenticarUsuario,
  obtenerUsuariosPendientes,
  aprobarUsuario,
  rechazarUsuario,
  loadPresupuestos,
  savePresupuesto,
  deletePresupuesto,
} from './lib/storage';

type Page = 'inicio' | 'dashboard' | 'clientes' | 'cuenta' | 'historial' | 'nuevo-cliente' | 'productos' | 'backup' | 'login' | 'admin' | 'listas-precios' | 'auditoria' | 'presupuestos' | 'reportes';

interface RowFactura extends FacturaItem {
  query: string;
  rowKey: string;
}

const formatMoney = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
const today = new Date().toISOString().slice(0, 10);
const formasPago: FormaPago[] = ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta'];

// Helper para campos numéricos sin mostrar 0
const formatNumberInput = (value: number) => value === 0 ? '' : value.toString();

// Función para imprimir factura
const printInvoice = (factura: Factura, cliente: Cliente, sena?: number) => {
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Factura ${factura.id}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: white; color: black; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { display: block; max-width: 200px; height: auto; margin: 0 auto 16px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; }
        .company-name { font-size: 22px; font-weight: bold; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .client-info, .invoice-info { width: 48%; }
        .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; color: #333; }
        .info-line { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .text-right { text-align: right; }
        .total-row { font-weight: bold; background-color: #f9f9f9; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
          .logo { max-width: 200px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="https://i.imgur.com/M4GONM5.png" alt="Logo" class="logo" />
        <div class="company-name">Comprobante de venta</div>
      </div>

      <div class="invoice-details">
        <div class="client-info">
          <div class="section-title">DATOS DEL CLIENTE</div>
          <div class="info-line"><strong>Nombre:</strong> ${cliente.nombre}</div>
          <div class="info-line"><strong>Email:</strong> ${cliente.email || 'No especificado'}</div>
          <div class="info-line"><strong>Teléfono:</strong> ${cliente.tel || 'No especificado'}</div>
          <div class="info-line"><strong>Categoría:</strong> ${cliente.cat === 'especial' ? 'Especial' : 'General'}</div>
        </div>

        <div class="invoice-info">
          <div class="section-title">DATOS DE LA FACTURA</div>
          <div class="info-line"><strong>Número:</strong> #${factura.id.slice(-8).toUpperCase()}</div>
          <div class="info-line"><strong>Fecha:</strong> ${factura.fecha}</div>
          <div class="info-line"><strong>Total:</strong> ${formatMoney(factura.total)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Descripción</th>
            <th class="text-right">Cantidad</th>
            <th class="text-right">Precio Unit.</th>
            <th class="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${factura.items.map(item => {
            const precioUnit = factura.descuento
              ? `<span style="text-decoration:line-through;color:#999;">${formatMoney(item.precio)}</span> <strong>${formatMoney(item.precio * (1 - factura.descuento))}</strong>`
              : formatMoney(item.precio);
            const subtotalItem = factura.descuento
              ? formatMoney(item.cant * item.precio * (1 - factura.descuento))
              : formatMoney(item.cant * item.precio);
            return `
            <tr>
              <td><strong>${item.nombre}</strong></td>
              <td>${item.categoria} • ${item.talle} • ${item.color}</td>
              <td class="text-right">${item.cant}</td>
              <td class="text-right">${precioUnit}</td>
              <td class="text-right">${subtotalItem}</td>
            </tr>`;
          }).join('')}
          ${factura.descuento ? `
          <tr>
            <td colspan="4" class="text-right">Subtotal</td>
            <td class="text-right" style="text-decoration:line-through;color:#999;">${formatMoney(factura.total / (1 - factura.descuento))}</td>
          </tr>
          <tr>
            <td colspan="4" class="text-right">Descuento ${Math.round(factura.descuento * 100)}%</td>
            <td class="text-right" style="color:green;">- ${formatMoney(factura.total / (1 - factura.descuento) * factura.descuento)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td colspan="4" class="text-right"><strong>TOTAL GENERAL</strong></td>
            <td class="text-right"><strong>${formatMoney(factura.total)}</strong></td>
          </tr>
          ${sena && sena > 0 ? `
          <tr>
            <td colspan="4" class="text-right">Seña recibida</td>
            <td class="text-right" style="color: green;">- ${formatMoney(sena)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="4" class="text-right"><strong>SALDO PENDIENTE</strong></td>
            <td class="text-right" style="color: red;"><strong>${formatMoney(factura.total - sena)}</strong></td>
          </tr>` : ''}
        </tbody>
      </table>

      ${factura.notas ? `<div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;"><strong>Notas:</strong> ${factura.notas}</div>` : ''}

      <div class="footer">
        <p>Comprobante generado el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR')}</p>
        <p>Sistema de Cuenta Corriente Mayorista</p>
      </div>

      <div class="no-print" style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #6366F1; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimir</button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Cerrar</button>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
  }
};

function App() {
  const { toasts, removeToast, success, error } = useToast();
  const [page, setPage] = useState<Page>('inicio');
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [productEdit, setProductEdit] = useState<Producto | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentClienteId, setPaymentClienteId] = useState('');
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentForm, setPaymentForm] = useState<FormaPago>('Efectivo');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [newClientNombre, setNewClientNombre] = useState('');
  const [newClientTel, setNewClientTel] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCat, setNewClientCat] = useState<string>('general');
  const [newClientNotas, setNewClientNotas] = useState('');
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [newProducto, setNewProducto] = useState({
    nombre: '',
    categoria: '',
    talle: '',
    color: '',
  });
  const [backupText, setBackupText] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [backupError, setBackupError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [editingFactura, setEditingFactura] = useState<Factura | null>(null);
  const [editingPresupuesto, setEditingPresupuesto] = useState<Presupuesto | null>(null);
  const [listasPrecios, setListasPrecios] = useState<ListaPrecio[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  const [priceMatrixGroup, setPriceMatrixGroup] = useState<string | null>(null);
  const [editingPriceMap, setEditingPriceMap] = useState<Record<string, Record<string, string>>>({});
  const [invoiceClientSearch, setInvoiceClientSearch] = useState('');
  const [invoiceClientDropdownOpen, setInvoiceClientDropdownOpen] = useState(false);
  const [newListaNombre, setNewListaNombre] = useState('');
  const [editingLista, setEditingLista] = useState<ListaPrecio | null>(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'first-admin'>('login');
  const [usuariosPendientes, setUsuariosPendientes] = useState<any[]>([]);
  const [needsFirstAdmin, setNeedsFirstAdmin] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [auditData, setAuditData] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilterUsuario, setAuditFilterUsuario] = useState('');
  const [auditFilterEntidad, setAuditFilterEntidad] = useState('');
  const [auditFilterDesde, setAuditFilterDesde] = useState('');
  const [auditFilterHasta, setAuditFilterHasta] = useState('');
  const [auditExpandedId, setAuditExpandedId] = useState<string | null>(null);
  const [resumenDeudaOpen, setResumenDeudaOpen] = useState(false);
  const [resumenPagoDetalle, setResumenPagoDetalle] = useState<Pago | null>(null);
  const [invoiceNotas, setInvoiceNotas] = useState('');
  const [invoiceSena, setInvoiceSena] = useState(0);
  const [invoiceSenaForma, setInvoiceSenaForma] = useState<FormaPago>('Efectivo');
  const [descuentoAplicado, setDescuentoAplicado] = useState(false);
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [exportDeudoresModalOpen, setExportDeudoresModalOpen] = useState(false);
  const [exportPreciosModalOpen, setExportPreciosModalOpen] = useState(false);
  const [exportPreciosLista, setExportPreciosLista] = useState('');
  const [reporteDesde, setReporteDesde] = useState('');
  const [reporteHasta, setReporteHasta] = useState('');
  const [reporteDesdeAplicado, setReporteDesdeAplicado] = useState('');
  const [reporteHastaAplicado, setReporteHastaAplicado] = useState('');
  const [rankingTab, setRankingTab] = useState<'volumen' | 'deuda'>('volumen');
  const [recoveryPagos, setRecoveryPagos] = useState<Pago[]>([]);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryDone, setRecoveryDone] = useState(false);

  // Verificar primer admin al cargar
  useEffect(() => {
    const checkFirstAdmin = async () => {
      try {
        console.log('🔍 Verificando configuración inicial del sistema...');
        const needsAdmin = await verificarPrimerAdmin();
        console.log('📊 ¿Necesita primer admin?:', needsAdmin);

        setNeedsFirstAdmin(needsAdmin);
        if (needsAdmin) {
          setAuthMode('first-admin');
          setPage('login');
        }
      } catch (err: any) {
        console.error('❌ Error verificando primer admin:', err);

        // Si hay error de conexión, mostrar mensaje específico
        if (err.message?.includes('relation "usuarios" does not exist')) {
          error('❌ ERROR: La tabla usuarios no existe. Ejecuta el script SETUP_USUARIOS_SUPABASE.sql en Supabase Dashboard.');
        } else if (err.message?.includes('fetch')) {
          error('❌ ERROR: No se puede conectar con Supabase. Verifica tu configuración de red.');
        }
      }
    };
    checkFirstAdmin();
  }, []);

  // Verificar usuario logueado al cargar
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && !needsFirstAdmin) {
      try {
        const userData = JSON.parse(savedUser);
        setCurrentUser(userData.username);
        setCurrentUserData(userData);
        setPage('inicio');
      } catch (error) {
        localStorage.removeItem('currentUser');
        setPage('login');
      }
    } else if (!needsFirstAdmin) {
      setPage('login');
    }
  }, [needsFirstAdmin]);

  // Cargar usuarios pendientes si es admin
  useEffect(() => {
    if (currentUserData?.rol === 'admin') {
      loadUsuariosPendientes();
    }
  }, [currentUserData]);

  const loadUsuariosPendientes = async () => {
    try {
      const usuarios = await obtenerUsuariosPendientes();
      setUsuariosPendientes(usuarios);
    } catch (error) {
      console.error('Error cargando usuarios pendientes:', error);
    }
  };

  const loadAuditData = async () => {
    setAuditLoading(true);
    try {
      const data = await obtenerAuditoria({
        usuario: auditFilterUsuario || undefined,
        entidad: auditFilterEntidad || undefined,
        desde: auditFilterDesde || undefined,
        hasta: auditFilterHasta || undefined,
      });
      setAuditData(data);
    } catch (err) {
      console.error('Error cargando auditoría:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (page === 'auditoria' && currentUserData?.rol === 'admin') {
      loadAuditData();
    }
  }, [page]);

  useEffect(() => {
    // Solo cargar datos si hay un usuario logueado
    if (!currentUser) return;

    const loadData = async () => {
      const [clientesData, productosData, facturasData, pagosData, listasData, pricesData, presupuestosData] = await Promise.all([
        loadClientes(),
        loadProductos(),
        loadFacturas(),
        loadPagos(),
        loadListasPrecios(),
        loadProductPrices(),
        loadPresupuestos(),
      ]);

      setClientes(clientesData);
      setProductos(productosData);
      setFacturas(facturasData);
      setPagos(pagosData);
      setListasPrecios(listasData);
      setProductPrices(pricesData);
      setPresupuestos(presupuestosData);
    };

    loadData();
  }, [currentUser]);

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

  const montoDescuento = useMemo(
    () => descuentoAplicado ? totalFactura * 0.1 : 0,
    [descuentoAplicado, totalFactura]
  );

  const totalConDescuento = useMemo(
    () => totalFactura - montoDescuento,
    [totalFactura, montoDescuento]
  );

  const orderedFacturas = useMemo(
    () => [...facturas].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [facturas]
  );

  const resumen = useMemo(() => {
    const saldosPorCliente = clientes.map((c) => {
      const totalF = facturas.filter(f => f.clienteId === c.id).reduce((s, f) => s + f.total, 0);
      const totalP = pagos.filter(p => p.clienteId === c.id).reduce((s, p) => s + p.monto, 0);
      return { cliente: c, saldo: totalF - totalP };
    });
    const deudaTotal = saldosPorCliente.reduce((s, x) => s + Math.max(0, x.saldo), 0);
    const clientesConDeuda = saldosPorCliente.filter(x => x.saldo > 0).length;
    const ultimas5Facturas = orderedFacturas.slice(0, 5);
    const ultimos3Pagos = [...pagos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 3);
    return { deudaTotal, clientesConDeuda, ultimas5Facturas, ultimos3Pagos };
  }, [clientes, facturas, pagos, orderedFacturas]);

  const clientesConDeudaDetalle = useMemo(() =>
    clientes
      .map(c => {
        const totalF = facturas.filter(f => f.clienteId === c.id).reduce((s, f) => s + f.total, 0);
        const totalP = pagos.filter(p => p.clienteId === c.id).reduce((s, p) => s + p.monto, 0);
        return { cliente: c, saldo: totalF - totalP };
      })
      .filter(x => x.saldo > 0)
      .sort((a, b) => b.saldo - a.saldo),
    [clientes, facturas, pagos]
  );

  const getListaById = (id: string): ListaPrecio =>
    listasPrecios.find(l => l.id === id) ?? { id: 'general', nombre: 'General' };

  const findProductPrice = (productoId: string, listaId: string): number => {
    const pp = productPrices.find(p => p.productoId === productoId && p.listaId === listaId);
    return pp?.precio ?? 0;
  };

  const updateRowProduct = (rowKey: string, product: Producto) => {
    const listaId = invoiceClienteActual?.cat ?? 'general';
    const precio = findProductPrice(product.id, listaId);
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
              precio,
              query: '',
            }
      )
    );
    setTimeout(() => setRows((prevRows) => [...prevRows]), 10);
  };

  const updateClientPrices = (clienteId: string) => {
    const client = clientes.find((item) => item.id === clienteId);
    if (!client) return;
    const listaId = client.cat;
    setRows((rows) =>
      rows.map((row) => {
        if (!row.prodId) return row;
        return { ...row, precio: findProductPrice(row.prodId, listaId) };
      })
    );
  };

  const handleInvoiceClientChange = (value: string) => {
    setInvoiceClient(value);
    setInvoiceClientSearch('');
    setInvoiceClientDropdownOpen(false);
    updateClientPrices(value);
  };

  const filteredProducts = (query: string) => {
    const text = query.toLowerCase().trim();
    if (!text || text.length === 0) return []; // No mostrar productos si no hay búsqueda
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
    const subtotal = items.reduce((sum, item) => sum + item.precio * item.cant, 0);
    const factura: Factura = {
      id: editingFactura ? editingFactura.id : `f${Date.now()}`,
      clienteId: invoiceClienteActual.id,
      fecha: invoiceDate,
      items,
      total: descuentoAplicado ? subtotal * 0.9 : subtotal,
      descuento: descuentoAplicado ? 0.1 : undefined,
      notas: invoiceNotas.trim() || undefined,
    };
    const nextFacturas = editingFactura
      ? facturas.map(f => f.id === factura.id ? factura : f)
      : [factura, ...facturas];
    setFacturas(nextFacturas);
    await saveFactura(factura);

    // Registrar seña si hay monto
    if (invoiceSena > 0 && !editingFactura) {
      const pago: import('./types').Pago = {
        id: `p${Date.now()}`,
        clienteId: invoiceClienteActual.id,
        fecha: invoiceDate,
        monto: invoiceSena,
        forma: invoiceSenaForma,
        notas: `Seña factura #${factura.id.slice(-8).toUpperCase()}`,
      };
      setPagos(prev => [pago, ...prev]);
      await savePago(pago);
      if (currentUser) {
        const despues = { clienteId: pago.clienteId, clienteNombre: invoiceClienteActual?.nombre, fecha: pago.fecha, monto: pago.monto, forma: pago.forma, notas: pago.notas };
        await logAudit(currentUser, 'PAGO_CREADO', 'pago', pago.id, null, despues);
      }
    }

    if (currentUser) {
      const accion = editingFactura ? 'FACTURA_EDITADA' : 'FACTURA_CREADA';
      const antes = editingFactura
        ? { clienteId: editingFactura.clienteId, fecha: editingFactura.fecha, total: editingFactura.total, items: editingFactura.items }
        : null;
      const despues = { clienteId: factura.clienteId, clienteNombre: invoiceClienteActual?.nombre, fecha: factura.fecha, total: factura.total, items: factura.items };
      await logAudit(currentUser, accion, 'factura', factura.id, antes, despues);
    }

    setRows([
      { rowKey: 'r0', prodId: '', nombre: '', categoria: '', talle: '', color: '', cant: 1, precio: 0, query: '' },
    ]);
    setInvoiceDate(today);
    setInvoiceNotas('');
    setInvoiceSena(0);
    setInvoiceSenaForma('Efectivo');
    setDescuentoAplicado(false);
    setEditingFactura(null);
    success(editingFactura ? 'Factura actualizada exitosamente' : 'Factura creada exitosamente');
    setPage('historial');
  };

  const handleGuardarPresupuesto = async () => {
    if (!invoiceClienteActual) return;
    const items = rows.filter((row) => row.prodId && row.cant > 0);
    if (!items.length) { error('Agregá al menos un producto'); return; }
    const presupuesto: Presupuesto = {
      id: editingPresupuesto ? editingPresupuesto.id : `pres${Date.now()}`,
      clienteId: invoiceClienteActual.id,
      fecha: invoiceDate,
      items,
      total: items.reduce((sum, item) => sum + item.precio * item.cant, 0),
      notas: invoiceNotas.trim() || undefined,
      estado: 'presupuesto',
    };
    try {
      await savePresupuesto(presupuesto);
    } catch (err: any) {
      error(`Error guardando presupuesto: ${err?.message || 'Verificá que ejecutaste el SQL en Supabase'}`);
      return;
    }
    setPresupuestos(prev =>
      editingPresupuesto
        ? prev.map(p => p.id === presupuesto.id ? presupuesto : p)
        : [presupuesto, ...prev]
    );
    setRows([{ rowKey: 'r0', prodId: '', nombre: '', categoria: '', talle: '', color: '', cant: 1, precio: 0, query: '' }]);
    setInvoiceDate(today);
    setInvoiceNotas('');
    setInvoiceSena(0);
    setEditingPresupuesto(null);
    success(editingPresupuesto ? 'Presupuesto actualizado' : 'Presupuesto guardado');
    setPage('presupuestos');
  };

  const handleEditarPresupuesto = (pres: Presupuesto) => {
    setEditingPresupuesto(pres);
    setInvoiceClient(pres.clienteId);
    setInvoiceDate(pres.fecha);
    setInvoiceNotas(pres.notas || '');
    setInvoiceSena(0);
    setRows(pres.items.map((item, i) => ({ ...item, rowKey: `r${i}`, query: '' })));
    setPage('dashboard');
  };

  const handleConvertirPresupuesto = async (pres: Presupuesto) => {
    const factura: Factura = {
      id: `f${Date.now()}`,
      clienteId: pres.clienteId,
      fecha: pres.fecha,
      items: pres.items,
      total: pres.total,
      notas: pres.notas,
    };
    const nextFacturas = [factura, ...facturas];
    setFacturas(nextFacturas);
    await saveFactura(factura);
    await deletePresupuesto(pres.id);
    setPresupuestos(prev => prev.filter(p => p.id !== pres.id));
    success('Presupuesto convertido en factura');
  };

  const enviarWhatsAppResumen = (cliente: Cliente) => {
    if (!cliente.tel) {
      error('Este cliente no tiene teléfono registrado');
      return;
    }
    const clienteFacts = facturas.filter(f => f.clienteId === cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const clientePagos = pagos.filter(p => p.clienteId === cliente.id);
    const totalCompradoC = clienteFacts.reduce((s, f) => s + f.total, 0);
    const totalPagadoC = clientePagos.reduce((s, p) => s + p.monto, 0);
    const saldoC = totalCompradoC - totalPagadoC;
    const ultimas = clienteFacts.slice(0, 3);
    const lineasFacturas = ultimas.map(f => `- ${f.fecha} · ${f.items.length} item${f.items.length !== 1 ? 's' : ''} · ${formatMoney(f.total)}`).join('\n');
    const wv = { wave: '\u{1F44B}', box: '\u{1F4E6}', money: '\u{1F4B0}', clipboard: '\u{1F4CB}', hands: '\u{1F64C}' };
    const mensaje = `Hola ${cliente.nombre} ${wv.wave}\nTe enviamos un resumen de tu cuenta corriente:\n\n${wv.box} Total comprado: ${formatMoney(totalCompradoC)}\n${wv.money} Total pagado: ${formatMoney(totalPagadoC)}\n${wv.clipboard} Saldo pendiente: ${formatMoney(saldoC)}\n\nUltimas facturas:\n${lineasFacturas || '- Sin facturas'}\n\nCualquier consulta, estamos a disposicion ${wv.hands}`;
    const tel = cliente.tel.replace(/\D/g, '');
    const url = `https://wa.me/54${tel}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const enviarWhatsAppPresupuesto = (pres: Presupuesto) => {
    const cliente = clientes.find(c => c.id === pres.clienteId);
    if (!cliente) return;
    if (!cliente.tel) { error('Este cliente no tiene teléfono registrado'); return; }
    const wv = { wave: '\u{1F44B}', bag: '\u{1F6CD}', money: '\u{1F4B0}', hands: '\u{1F64C}' };
    const lineas = pres.items.map(item => `- ${item.nombre} · ${item.talle} · ${formatMoney(item.precio)}`).join('\n');
    const mensaje = `Hola ${cliente.nombre} ${wv.wave}\nTe enviamos un presupuesto:\n\n${wv.bag} Productos:\n${lineas}\n\n${wv.money} Total: ${formatMoney(pres.total)}\n\nConfirmanos si esta todo bien y lo procesamos ${wv.hands}`;
    const tel = cliente.tel.replace(/\D/g, '');
    const url = `https://wa.me/54${tel}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const exportDeudoresPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Lista de Deudores', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')}`, 14, 28);
    const rowsData = clientesConDeudaDetalle.map(x => {
      const ultimaFactura = facturas.filter(f => f.clienteId === x.cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      const ultimoPagoCliente = pagos.filter(p => p.clienteId === x.cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      return [
        x.cliente.nombre,
        x.cliente.tel || '—',
        formatMoney(x.saldo),
        ultimaFactura?.fecha || '—',
        ultimoPagoCliente?.fecha || '—',
      ];
    });
    autoTable(doc, {
      head: [['Cliente', 'Teléfono', 'Saldo pendiente', 'Última factura', 'Último pago']],
      body: rowsData,
      startY: 35,
    });
    doc.save('deudores.pdf');
  };

  const exportDeudoresExcel = () => {
    const data = clientesConDeudaDetalle.map(x => {
      const ultimaFactura = facturas.filter(f => f.clienteId === x.cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      const ultimoPagoCliente = pagos.filter(p => p.clienteId === x.cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      return {
        'Cliente': x.cliente.nombre,
        'Teléfono': x.cliente.tel || '',
        'Saldo pendiente': x.saldo,
        'Última factura': ultimaFactura?.fecha || '',
        'Último pago': ultimoPagoCliente?.fecha || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Deudores');
    XLSX.writeFile(wb, 'deudores.xlsx');
  };

  const exportPreciosPDF = (listaId: string) => {
    const lista = listasPrecios.find(l => l.id === listaId);
    if (!lista) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Lista de Precios: ${lista.nombre}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')}`, 14, 28);
    const filteredProductos = productos.filter(p => {
      const pp = productPrices.find(x => x.productoId === p.id && x.listaId === listaId);
      return pp && pp.precio > 0;
    });
    const rowsData = filteredProductos.map(p => {
      const pp = productPrices.find(x => x.productoId === p.id && x.listaId === listaId);
      return [p.nombre, p.categoria, p.talle, p.color || '—', formatMoney(pp?.precio ?? 0)];
    });
    autoTable(doc, {
      head: [['Producto', 'Categoría', 'Talle', 'Color', 'Precio']],
      body: rowsData,
      startY: 35,
    });
    doc.save(`lista-precios-${lista.nombre.toLowerCase()}.pdf`);
  };

  const exportPreciosExcel = (listaId: string) => {
    const lista = listasPrecios.find(l => l.id === listaId);
    if (!lista) return;
    const filteredProductos = productos.filter(p => {
      const pp = productPrices.find(x => x.productoId === p.id && x.listaId === listaId);
      return pp && pp.precio > 0;
    });
    const data = filteredProductos.map(p => {
      const pp = productPrices.find(x => x.productoId === p.id && x.listaId === listaId);
      return {
        'Producto': p.nombre,
        'Categoría': p.categoria,
        'Talle': p.talle,
        'Color': p.color || '',
        'Precio': pp?.precio ?? 0,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, lista.nombre);
    XLSX.writeFile(wb, `lista-precios-${lista.nombre.toLowerCase()}.xlsx`);
  };

  const handleNewClient = async () => {
    if (!newClientNombre.trim()) {
      error('❌ ERROR: El nombre del cliente es obligatorio');
      return;
    }

    try {
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
        await saveCliente(clienteActualizado);

        if (currentUser) {
          const antes = { nombre: editingClient.nombre, tel: editingClient.tel, email: editingClient.email, cat: editingClient.cat };
          const despues = { nombre: clienteActualizado.nombre, tel: clienteActualizado.tel, email: clienteActualizado.email, cat: clienteActualizado.cat };
          await logAudit(currentUser, 'CLIENTE_EDITADO', 'cliente', clienteActualizado.id, antes, despues);
        }

        setEditingClient(null);
        success(`✅ CLIENTE ACTUALIZADO: ${clienteActualizado.nombre} se actualizó correctamente`);
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
        await saveCliente(cliente);

        if (currentUser) {
          const despues = { nombre: cliente.nombre, tel: cliente.tel, email: cliente.email, cat: cliente.cat };
          await logAudit(currentUser, 'CLIENTE_CREADO', 'cliente', cliente.id, null, despues);
        }

        success(`✅ CLIENTE AGREGADO: ${cliente.nombre} se agregó correctamente al sistema`);
      }

      // Limpiar formulario
      setNewClientNombre('');
      setNewClientTel('');
      setNewClientEmail('');
      setNewClientCat('general');
      setNewClientNotas('');
      setPage('clientes');
    } catch (err: any) {
      console.error('❌ Error manejando cliente:', err);
      error(`❌ ERROR: No se pudo ${editingClient ? 'actualizar' : 'agregar'} el cliente. ${err.message || 'Intenta nuevamente.'}`);
    }
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
      const facturasDelCliente = facturas.filter(f => f.clienteId === clientId);
      const pagosDelCliente = pagos.filter(p => p.clienteId === clientId);
      setFacturas(prev => prev.filter(f => f.clienteId !== clientId));
      setPagos(prev => prev.filter(p => p.clienteId !== clientId));
      await Promise.all(facturasDelCliente.map(f => deleteFactura(f.id)));
      await Promise.all(pagosDelCliente.map(p => deletePago(p.id)));
    } else {
      if (!window.confirm(`¿Estás seguro de eliminar a "${client.nombre}"?`)) return;
    }

    const nextClientes = clientes.filter(c => c.id !== clientId);
    setClientes(nextClientes);
    await deleteCliente(clientId);

    if (currentUser) {
      const facturasEliminadas = facturas.filter(f => f.clienteId === clientId).length;
      const pagosEliminados = pagos.filter(p => p.clienteId === clientId).length;
      const antes = { nombre: client.nombre, tel: client.tel, email: client.email, cat: client.cat, facturasEliminadas, pagosEliminados };
      await logAudit(currentUser, 'CLIENTE_ELIMINADO', 'cliente', clientId, antes, null);
    }

    success(`✅ CLIENTE ELIMINADO: ${client.nombre} se eliminó correctamente del sistema`);

    // Si estaba seleccionado, cambiar a otro cliente
    if (selectedClientId === clientId && nextClientes.length > 0) {
      setSelectedClientId(nextClientes[0].id);
    }
    if (invoiceClient === clientId && nextClientes.length > 0) {
      setInvoiceClient(nextClientes[0].id);
    }
  };

  const handleDeleteFactura = async (facturaId: string) => {
    const factura = facturas.find(f => f.id === facturaId);
    if (!factura) return;
    const cliente = clientes.find(c => c.id === factura.clienteId);
    if (!window.confirm(`¿Eliminar esta factura de ${cliente?.nombre ?? 'cliente eliminado'} por ${formatMoney(factura.total)}?`)) return;

    const nextFacturas = facturas.filter(f => f.id !== facturaId);
    setFacturas(nextFacturas);
    await deleteFactura(facturaId);

    if (currentUser) {
      const antes = { clienteId: factura.clienteId, clienteNombre: cliente?.nombre, fecha: factura.fecha, total: factura.total, items: factura.items };
      await logAudit(currentUser, 'FACTURA_ELIMINADA', 'factura', facturaId, antes, null);
    }
    success('Factura eliminada correctamente');
  };

  const handleEditFactura = (factura: Factura) => {
    setEditingFactura(factura);
    const cliente = clientes.find(c => c.id === factura.clienteId);
    if (cliente) setInvoiceClient(factura.clienteId);
    setInvoiceDate(factura.fecha);
    setRows(factura.items.map((item, i) => ({ ...item, rowKey: `r${i}`, query: '' })));
    setDescuentoAplicado(factura.descuento != null && factura.descuento > 0);
    setPage('dashboard');
  };

  const handlePaymentSubmit = async () => {
    if (!paymentClienteId || paymentAmount <= 0) {
      error('❌ ERROR: Selecciona un cliente e ingresa un monto válido');
      return;
    }

    try {
      const cliente = clientes.find(c => c.id === paymentClienteId);
      const pago = {
        id: `pay${Date.now()}`,
        clienteId: paymentClienteId,
        fecha: paymentDate,
        monto: paymentAmount,
        forma: paymentForm,
        notas: paymentNotes.trim(),
      };
      setPagos(prev => [pago, ...prev]);
      await savePago(pago);

      if (currentUser) {
        const despues = { clienteId: pago.clienteId, clienteNombre: cliente?.nombre, fecha: pago.fecha, monto: pago.monto, forma: pago.forma, notas: pago.notas };
        await logAudit(currentUser, 'PAGO_CREADO', 'pago', pago.id, null, despues);
      }

      setPaymentModalOpen(false);
      setPaymentAmount(0);
      setPaymentNotes('');
      success(`✅ PAGO REGISTRADO: ${formatMoney(paymentAmount)} para ${cliente?.nombre || 'Cliente'} (${paymentForm})`);
    } catch (err: any) {
      console.error('❌ Error registrando pago:', err);
      error(`❌ ERROR: No se pudo registrar el pago. ${err.message || 'Intenta nuevamente.'}`);
    }
  };

  const handleProductSave = async () => {
    const trimmed = {
      nombre: newProducto.nombre.trim(),
      categoria: newProducto.categoria.trim(),
      talle: newProducto.talle.trim(),
      color: newProducto.color.trim(),
    };

    if (!trimmed.nombre) { error('❌ ERROR: El nombre del producto es obligatorio'); return; }
    if (!trimmed.categoria) { error('❌ ERROR: La categoría del producto es obligatoria'); return; }
    if (!trimmed.talle) { error('❌ ERROR: El talle del producto es obligatorio'); return; }
    if (!trimmed.color) { error('❌ ERROR: El color del producto es obligatorio'); return; }

    try {
      if (productEdit) {
        const productoActualizado = { ...productEdit, ...trimmed };
        const nextProductos = productos.map((item) =>
          item.id === productEdit.id ? productoActualizado : item
        );
        setProductos(nextProductos);
        await saveProducto(productoActualizado);

        if (currentUser) {
          const antes = { nombre: productEdit.nombre, categoria: productEdit.categoria, talle: productEdit.talle, color: productEdit.color };
          const despues = { nombre: trimmed.nombre, categoria: trimmed.categoria, talle: trimmed.talle, color: trimmed.color };
          await logAudit(currentUser, 'PRODUCTO_EDITADO', 'producto', productEdit.id, antes, despues);
        }

        setProductEdit(null);
        success(`✅ PRODUCTO ACTUALIZADO: ${trimmed.nombre} se actualizó correctamente`);
      } else {
        const nuevo: Producto = {
          id: `p${Date.now()}`,
          ...trimmed,
          precio: 0,
        };
        const nextProductos = [nuevo, ...productos];
        setProductos(nextProductos);
        await saveProducto(nuevo);

        if (currentUser) {
          const despues = { nombre: nuevo.nombre, categoria: nuevo.categoria, talle: nuevo.talle, color: nuevo.color };
          await logAudit(currentUser, 'PRODUCTO_CREADO', 'producto', nuevo.id, null, despues);
        }

        success(`✅ PRODUCTO AGREGADO: ${trimmed.nombre} — ahora configura sus precios en la tabla de precios`);
      }

      setNewProducto({ nombre: '', categoria: '', talle: '', color: '' });
      setProductModalOpen(false);
    } catch (err: any) {
      console.error('❌ Error manejando producto:', err);
      error(`❌ ERROR: No se pudo ${productEdit ? 'actualizar' : 'agregar'} el producto. ${err.message || 'Intenta nuevamente.'}`);
    }
  };

  const handleProductEdit = (item: Producto) => {
    setProductEdit(item);
    setProductModalOpen(true);
    setNewProducto({
      nombre: item.nombre,
      categoria: item.categoria,
      talle: item.talle,
      color: item.color,
    });
  };

  const handleProductDelete = async (id: string) => {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    if (!window.confirm(`¿Estás seguro de eliminar "${producto.nombre}" (${producto.talle})?`)) return;

    const next = productos.filter((item) => item.id !== id);
    setProductos(next);
    setProductPrices(prev => prev.filter(pp => pp.productoId !== id));
    await deleteProducto(id);

    if (currentUser) {
      const antes = { nombre: producto.nombre, categoria: producto.categoria, talle: producto.talle, color: producto.color };
      await logAudit(currentUser, 'PRODUCTO_ELIMINADO', 'producto', id, antes, null);
    }

    success('Producto eliminado exitosamente');
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
    success('Backup descargado exitosamente');
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
      success('Backup restaurado exitosamente');
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

  // Funciones de autenticación
  const handleLogin = async () => {
    if (loggingIn) return;
    setLoginError('');

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Completá todos los campos');
      return;
    }

    setLoggingIn(true);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
      );
      const userData = await Promise.race([autenticarUsuario(loginUsername, loginPassword), timeout]);
      setCurrentUser(userData.username);
      setCurrentUserData(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      setPage('inicio');
      setLoginUsername('');
      setLoginPassword('');
      setLoginError('');
      try {
        await logAudit(userData.username, 'INICIO_SESION', 'cliente', userData.id, null, { username: userData.username, rol: userData.rol, email: userData.email });
      } catch { /* no fallar por auditoría */ }
    } catch (err: any) {
      const msg: string = err.message || '';
      let loginMsg = 'Ocurrió un error al iniciar sesión. Intentá de nuevo.';
      if (msg === 'timeout') {
        loginMsg = 'La conexión tardó demasiado. El servidor puede estar iniciando — esperá unos segundos e intentá de nuevo.';
      } else if (msg.includes('Usuario o contraseña incorrectos')) {
        loginMsg = 'Usuario o contraseña incorrectos. Verificá tus datos e intentá de nuevo.';
      } else if (msg.includes('pendiente')) {
        loginMsg = 'Tu cuenta está pendiente de aprobación. Contactá al administrador.';
      } else if (msg.includes('rechazado')) {
        loginMsg = 'Tu cuenta fue rechazada. Contactá al administrador.';
      } else if (msg.includes('connection') || msg.includes('fetch')) {
        loginMsg = 'No se puede conectar con el servidor. Verificá tu conexión.';
      }
      setLoginError(loginMsg);
      error(loginMsg);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleFirstAdminCreate = async () => {
    console.log('🔧 Iniciando creación de primer administrador...');

    // Evitar múltiples clicks
    if (creatingAdmin) {
      console.log('⚠️ Ya se está creando un administrador...');
      return;
    }

    setCreatingAdmin(true);

    try {
      // Validaciones
      if (!registerUsername.trim()) {
        error('El nombre de usuario es obligatorio');
        return;
      }
      if (registerPassword !== registerConfirmPassword) {
        error('Las contraseñas no coinciden');
        return;
      }
      if (registerPassword.length < 6) {
        error('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (!registerEmail.includes('@')) {
        error('Ingresa un email válido');
        return;
      }

      console.log('✅ Validaciones pasadas, creando admin con:', {
        username: registerUsername,
        email: registerEmail
      });

      const userData = await crearPrimerAdmin(registerUsername, registerEmail, registerPassword);
      console.log('✅ Admin creado exitosamente:', userData);

      setCurrentUser(userData.username);
      setCurrentUserData(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      setNeedsFirstAdmin(false);
      setPage('inicio');
      setRegisterUsername('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      success(`Administrador creado exitosamente. Bienvenido ${userData.username}!`);

      try {
        await logAudit(userData.username, 'PRIMER_ADMIN_CREADO', 'cliente', userData.id, null, { username: userData.username, rol: userData.rol, email: userData.email });
      } catch (auditError) {
        console.warn('⚠️ Error registrando auditoría:', auditError);
      }
    } catch (err: any) {
      console.error('❌ Error creando administrador:', err);

      // Mensajes de error más específicos
      if (err.message?.includes('relation "usuarios" does not exist')) {
        error('❌ ERROR: La tabla usuarios no existe en Supabase. Debes ejecutar el script SETUP_USUARIOS_SUPABASE.sql primero.');
      } else if (err.message?.includes('violates unique constraint')) {
        error('❌ ERROR: Ya existe un usuario con ese nombre o email.');
      } else if (err.message?.includes('connection')) {
        error('❌ ERROR: Problema de conexión con Supabase. Verifica tu configuración.');
      } else {
        error(`❌ ERROR: ${err.message || 'Error desconocido creando administrador'}`);
      }
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleRegister = async () => {
    if (registering) return;
    setRegisterError('');
    setRegisterSuccess('');

    if (!registerUsername.trim() || !registerEmail.trim() || !registerPassword.trim() || !registerConfirmPassword.trim()) {
      setRegisterError('Completá todos los campos');
      return;
    }
    if (registerUsername.trim().length < 3) {
      setRegisterError('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }
    if (!registerEmail.includes('@') || !registerEmail.includes('.')) {
      setRegisterError('Ingresá un email válido (ejemplo@dominio.com)');
      return;
    }
    if (registerPassword.length < 6) {
      setRegisterError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('Las contraseñas no coinciden');
      return;
    }

    setRegistering(true);
    try {
      await registrarUsuario(registerUsername, registerEmail, registerPassword);
      try {
        await logAudit(registerUsername, 'USUARIO_REGISTRADO', 'cliente', undefined, null, { username: registerUsername, email: registerEmail, estado: 'pendiente' });
      } catch { /* no fallar por auditoría */ }

      setRegisterUsername('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setRegisterSuccess('Cuenta creada correctamente. Tu acceso queda pendiente de aprobación por el administrador.');
    } catch (err: any) {
      const msg: string = err.message || '';
      let registerMsg = msg || 'Ocurrió un error al crear la cuenta. Intentá de nuevo.';
      if (msg.includes('El nombre de usuario ya existe')) {
        registerMsg = 'Ese nombre de usuario ya está en uso. Probá con otro.';
      } else if (msg.includes('duplicate key') || msg.includes('ya existe')) {
        registerMsg = 'Ese email ya tiene una cuenta. ¿Querés iniciar sesión?';
      } else if (msg.includes('connection') || msg.includes('fetch')) {
        registerMsg = 'No se puede conectar con el servidor. Verificá tu conexión.';
      }
      setRegisterError(registerMsg);
      error(registerMsg);
    } finally {
      setRegistering(false);
    }
  };

  const handleAprobarUsuario = async (username: string) => {
    try {
      const usuarioPendiente = usuariosPendientes.find(u => u.username === username);
      await aprobarUsuario(username, currentUserData.username ?? currentUserData.id);
      await loadUsuariosPendientes();

      if (currentUserData && usuarioPendiente) {
        const antes = { username: usuarioPendiente.username, email: usuarioPendiente.email, estado: 'pendiente' };
        const despues = { username: usuarioPendiente.username, email: usuarioPendiente.email, estado: 'aprobado', aprobadoPor: currentUserData.username };
        await logAudit(currentUserData.username, 'USUARIO_APROBADO', 'cliente', undefined, antes, despues);
      }

      success(`Usuario ${username} aprobado. Ya puede acceder al sistema.`);
    } catch (err: any) {
      error(`No se pudo aprobar el usuario: ${err.message || 'Intenta nuevamente.'}`);
    }
  };

  const handleRechazarUsuario = async (username: string) => {
    try {
      const usuarioPendiente = usuariosPendientes.find(u => u.username === username);
      if (!window.confirm(`¿Rechazar el registro de "${username}"?\n\nEsta acción no se puede deshacer.`)) {
        return;
      }

      await rechazarUsuario(username, currentUserData.username ?? currentUserData.id);
      await loadUsuariosPendientes();

      if (currentUserData && usuarioPendiente) {
        const antes = { username: usuarioPendiente.username, email: usuarioPendiente.email, estado: 'pendiente' };
        const despues = { username: usuarioPendiente.username, email: usuarioPendiente.email, estado: 'rechazado', rechazadoPor: currentUserData.username };
        await logAudit(currentUserData.username, 'USUARIO_RECHAZADO', 'cliente', undefined, antes, despues);
      }

      success(`Registro de ${username} rechazado.`);
    } catch (err: any) {
      error(`No se pudo rechazar el usuario: ${err.message || 'Intenta nuevamente.'}`);
    }
  };

  const handleLogout = async () => {
    const usuarioSaliente = currentUser;
    const datosUsuario = currentUserData;

    if (usuarioSaliente && datosUsuario) {
      try {
        await logAudit(usuarioSaliente, 'CIERRE_SESION', 'cliente', datosUsuario.id, { username: usuarioSaliente, rol: datosUsuario.rol }, null);
      } catch (auditError) {
        console.warn('⚠️ Error registrando auditoría de logout:', auditError);
      }
    }

    setCurrentUser(null);
    setCurrentUserData(null);
    localStorage.removeItem('currentUser');
    setPage('login');
    setAuthMode('login');
    success('Sesión cerrada correctamente');
  };

  const handleSaveLista = async () => {
    if (!newListaNombre.trim()) { error('El nombre de la lista es obligatorio'); return; }
    const lista: ListaPrecio = editingLista
      ? { id: editingLista.id, nombre: newListaNombre.trim() }
      : { id: `lp${Date.now()}`, nombre: newListaNombre.trim() };
    try {
      await saveListaPrecio(lista);
      setListasPrecios(prev =>
        editingLista ? prev.map(l => l.id === lista.id ? lista : l) : [...prev, lista]
      );
      setEditingLista(null);
      setNewListaNombre('');
      success(editingLista ? 'Lista actualizada' : 'Lista creada correctamente');
    } catch (err: any) {
      error(`No se pudo guardar la lista: ${err.message}`);
    }
  };

  const handleDeleteLista = async (id: string) => {
    const lista = listasPrecios.find(l => l.id === id);
    if (!lista) return;
    const enUso = clientes.some(c => c.cat === id);
    if (enUso) { error(`La lista "${lista.nombre}" está en uso por uno o más clientes`); return; }
    if (!window.confirm(`¿Eliminar la lista "${lista.nombre}"?`)) return;
    try {
      await deleteListaPrecio(id);
      setListasPrecios(prev => prev.filter(l => l.id !== id));
      success('Lista eliminada');
    } catch (err: any) {
      error(`No se pudo eliminar la lista: ${err.message}`);
    }
  };

  const handleRecuperarPagosDeAuditoria = async () => {
    setRecoveryLoading(true);
    setRecoveryPagos([]);
    setRecoveryDone(false);
    try {
      const auditEntries = await obtenerAuditoriaRecuperacionPagos();
      const existingIds = new Set(pagos.map(p => p.id));
      const clienteIds = new Set(clientes.map(c => c.id));

      const recuperados: Pago[] = [];
      const seenIds = new Set<string>();

      for (const entry of auditEntries) {
        if (entry.accion !== 'PAGO_CREADO') continue;
        const id = entry.entidad_id;
        if (!id || existingIds.has(id) || seenIds.has(id)) continue;
        seenIds.add(id);

        let despues: any = null;
        try {
          const parsed = JSON.parse(entry.detalles || '{}');
          despues = parsed.despues ?? null;
        } catch { continue; }

        if (!despues?.clienteId || !clienteIds.has(despues.clienteId)) continue;

        recuperados.push({
          id,
          clienteId: despues.clienteId,
          fecha: despues.fecha ?? entry.fecha?.slice(0, 10) ?? '',
          monto: Number(despues.monto) || 0,
          forma: despues.forma ?? 'Efectivo',
          notas: despues.notas ?? '',
        });
      }

      setRecoveryPagos(recuperados);
      setRecoveryDone(true);
    } catch (err: any) {
      error(`Error al leer auditoría: ${err.message}`);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleRestaurarPagos = async () => {
    if (!recoveryPagos.length) return;
    if (!window.confirm(`¿Restaurar ${recoveryPagos.length} pago(s) desde la auditoría?`)) return;
    try {
      await Promise.all(recoveryPagos.map(p => savePago(p)));
      setPagos(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const nuevos = recoveryPagos.filter(p => !existingIds.has(p.id));
        return [...nuevos, ...prev];
      });
      success(`✅ ${recoveryPagos.length} pago(s) restaurados correctamente`);
      setRecoveryPagos([]);
      setRecoveryDone(false);
    } catch (err: any) {
      error(`Error restaurando pagos: ${err.message}`);
    }
  };

  const clienteList = clientes.filter((c) =>
    clienteSearch === '' || c.nombre.toLowerCase().includes(clienteSearch.toLowerCase())
  );

  const productGroups = useMemo(() => {
    const words = productFilter.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = productos.filter(item => {
      if (words.length === 0) return true;
      const fields = [item.nombre, item.categoria, item.talle, item.color].map(v => v.toLowerCase());
      return words.every(word => fields.some(f => f.includes(word)));
    });
    const map = new Map<string, Producto[]>();
    for (const p of filtered) {
      const key = `${p.nombre}||${p.categoria}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries()).map(([key, variants]) => ({
      key,
      nombre: variants[0].nombre,
      categoria: variants[0].categoria,
      variants,
    }));
  }, [productos, productFilter]);

  const facturasFiltradas = useMemo(() => {
    return facturas.filter(f => {
      if (reporteDesdeAplicado && f.fecha < reporteDesdeAplicado) return false;
      if (reporteHastaAplicado && f.fecha > reporteHastaAplicado) return false;
      return true;
    });
  }, [facturas, reporteDesdeAplicado, reporteHastaAplicado]);

  const reporteVentasPorMes = useMemo(() => {
    const map: Record<string, number> = {};
    facturasFiltradas.forEach(f => {
      const mes = f.fecha.slice(0, 7);
      map[mes] = (map[mes] || 0) + f.total;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([mes, total]) => ({ mes, total }));
  }, [facturasFiltradas]);

  const reporteTopProductos = useMemo(() => {
    const map: Record<string, { nombre: string; talle: string; unidades: number; total: number }> = {};
    facturasFiltradas.forEach(f => {
      f.items.forEach(item => {
        const key = `${item.nombre}||${item.talle}`;
        if (!map[key]) map[key] = { nombre: item.nombre, talle: item.talle, unidades: 0, total: 0 };
        map[key].unidades += item.cant;
        map[key].total += item.cant * item.precio;
      });
    });
    return Object.values(map).sort((a, b) => b.unidades - a.unidades).slice(0, 10);
  }, [facturasFiltradas]);

  const reporteTopClientes = useMemo(() => {
    const map: Record<string, { cliente: Cliente; cantFacturas: number; totalComprado: number }> = {};
    facturasFiltradas.forEach(f => {
      const cliente = clientes.find(c => c.id === f.clienteId);
      if (!cliente) return;
      if (!map[f.clienteId]) map[f.clienteId] = { cliente, cantFacturas: 0, totalComprado: 0 };
      map[f.clienteId].cantFacturas++;
      map[f.clienteId].totalComprado += f.total;
    });
    return Object.values(map).sort((a, b) => b.totalComprado - a.totalComprado).slice(0, 10);
  }, [facturasFiltradas, clientes]);

  return (
    <>
      {page === 'login' && (
        <div className="min-h-screen bg-surface text-textPrimary flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="rounded-3xl bg-panel p-8 shadow-panel">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-textPrimary">Cuenta Corriente</h1>
                <p className="mt-2 text-textSecondary">Sistema Mayorista</p>
              </div>

              {authMode === 'first-admin' && (
                <div className="space-y-4">
                  <div className="rounded-3xl bg-blue-900/20 border border-blue-600/30 p-4">
                    <h3 className="font-semibold text-blue-300 mb-2">🔧 Configuración inicial</h3>
                    <p className="text-sm text-blue-200">Crea el primer administrador del sistema</p>
                  </div>

                  <label className="space-y-2 text-sm text-textSecondary">
                    Nombre de usuario
                    <input
                      type="text"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      placeholder="admin"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-textSecondary">
                    Email
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      placeholder="admin@empresa.com"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-textSecondary">
                    Contraseña
                    <input
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-textSecondary">
                    Confirmar contraseña
                    <input
                      type="password"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFirstAdminCreate()}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      placeholder="Repetir contraseña"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleFirstAdminCreate}
                    disabled={creatingAdmin}
                    className={`w-full rounded-3xl px-4 py-3 text-sm font-semibold text-white transition ${
                      creatingAdmin
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-accent hover:bg-indigo-600'
                    }`}
                  >
                    {creatingAdmin ? '⏳ Creando administrador...' : 'Crear administrador'}
                  </button>
                </div>
              )}

              {authMode === 'login' && !needsFirstAdmin && (
                <div className="space-y-4">
                  <label className="space-y-2 text-sm text-textSecondary">
                    Usuario o Email
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => { setLoginUsername(e.target.value); setLoginError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      className={`w-full rounded-3xl border px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent bg-surface ${loginError ? 'border-red-500' : 'border-border'}`}
                      placeholder="Usuario o email"
                      autoComplete="username"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-textSecondary">
                    Contraseña
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      className={`w-full rounded-3xl border px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent bg-surface ${loginError ? 'border-red-500' : 'border-border'}`}
                      placeholder="Contraseña"
                      autoComplete="current-password"
                    />
                  </label>

                  {loginError && (
                    <div className="rounded-2xl bg-red-900/30 border border-red-600/40 px-4 py-3 text-sm text-red-300">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={loggingIn}
                    className={`w-full rounded-3xl px-4 py-3 text-sm font-semibold text-white transition ${
                      loggingIn ? 'bg-gray-500 cursor-not-allowed' : 'bg-accent hover:bg-indigo-600'
                    }`}
                  >
                    {loggingIn ? 'Verificando...' : 'Iniciar sesión'}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('register'); setLoginError(''); }}
                      className="text-sm text-accent hover:text-indigo-400 transition"
                    >
                      ¿No tenés cuenta? Registrate
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'register' && !needsFirstAdmin && (
                <div className="space-y-4">
                  <div className="rounded-3xl bg-yellow-900/20 border border-yellow-600/30 p-4">
                    <h3 className="font-semibold text-yellow-300 mb-2">Registro de usuario</h3>
                    <p className="text-sm text-yellow-200">Tu cuenta quedará pendiente de aprobación</p>
                  </div>

                  <label className="space-y-2 text-sm text-textSecondary">
                    Nombre de usuario
                    <input
                      type="text"
                      value={registerUsername}
                      onChange={(e) => { setRegisterUsername(e.target.value); setRegisterError(''); setRegisterSuccess(''); }}
                      className={`w-full rounded-3xl border px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent bg-surface ${registerError ? 'border-red-500' : 'border-border'}`}
                      placeholder="usuario123"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-textSecondary">
                    Email
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => { setRegisterEmail(e.target.value); setRegisterError(''); setRegisterSuccess(''); }}
                      className={`w-full rounded-3xl border px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent bg-surface ${registerError ? 'border-red-500' : 'border-border'}`}
                      placeholder="usuario@email.com"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-textSecondary">
                    Contraseña
                    <input
                      type="password"
                      value={registerPassword}
                      onChange={(e) => { setRegisterPassword(e.target.value); setRegisterError(''); setRegisterSuccess(''); }}
                      className={`w-full rounded-3xl border px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent bg-surface ${registerError ? 'border-red-500' : 'border-border'}`}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-textSecondary">
                    Confirmar contraseña
                    <input
                      type="password"
                      value={registerConfirmPassword}
                      onChange={(e) => { setRegisterConfirmPassword(e.target.value); setRegisterError(''); setRegisterSuccess(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                      className={`w-full rounded-3xl border px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent bg-surface ${registerError ? 'border-red-500' : 'border-border'}`}
                      placeholder="Repetir contraseña"
                    />
                  </label>

                  {registerError && (
                    <div className="rounded-2xl bg-red-900/30 border border-red-600/40 px-4 py-3 text-sm text-red-300">
                      {registerError}
                    </div>
                  )}

                  {registerSuccess && (
                    <div className="rounded-2xl bg-green-900/30 border border-green-600/40 px-4 py-3 text-sm text-green-300">
                      {registerSuccess}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={registering}
                    className={`w-full rounded-3xl px-4 py-3 text-sm font-semibold text-white transition ${
                      registering
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-accent hover:bg-indigo-600'
                    }`}
                  >
                    {registering ? 'Creando cuenta...' : 'Registrarse'}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setRegisterError(''); setRegisterSuccess(''); }}
                      className="text-sm text-accent hover:text-indigo-400 transition"
                    >
                      ¿Ya tenés cuenta? Iniciá sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {page !== 'login' && (
        <div className="min-h-screen bg-surface text-textPrimary">
          <div className="lg:flex">
            <Sidebar active={page} onSelect={setPage} currentUserData={currentUserData} />
            <main className="flex-1 px-4 py-6 lg:px-10 overflow-visible">
              <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_300px] lg:items-center">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-textSecondary">Portal</p>
                  <h2 className="mt-3 text-xl font-semibold sm:text-3xl">Cuenta corriente mayorista</h2>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setPage('dashboard')}
                    className="rounded-3xl bg-panel px-4 py-3 text-sm font-medium text-textPrimary shadow-sm ring-1 ring-border transition hover:bg-border"
                  >
                    Nueva factura
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage('clientes')}
                    className="rounded-3xl bg-panel px-4 py-3 text-sm font-medium text-textPrimary shadow-sm ring-1 ring-border transition hover:bg-border"
                  >
                    Clientes
                  </button>
                  {currentUser && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-textSecondary">Usuario: {currentUser} ({currentUserData?.rol})</span>
                      {usuariosPendientes.length > 0 && currentUserData?.rol === 'admin' && (
                        <button
                          type="button"
                          onClick={() => setPage('admin')}
                          className="relative rounded-full bg-red-600 px-3 py-1 text-xs text-white transition hover:bg-red-500"
                        >
                          {usuariosPendientes.length} pendientes
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-3xl bg-red-900 px-4 py-3 text-sm font-medium text-red-300 shadow-sm transition hover:bg-red-800"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </div>

          {page === 'inicio' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-textPrimary">Resumen general</h2>
                <p className="mt-1 text-sm text-textSecondary">Vista rápida del estado del negocio.</p>
              </div>

              {/* Cards de métricas — clickeables */}
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setResumenDeudaOpen(true)}
                  className="rounded-3xl bg-panel p-6 shadow-panel text-left cursor-pointer transition hover:ring-2 hover:ring-red-500/40 hover:bg-panel/80 focus:outline-none"
                >
                  <p className="text-sm text-textSecondary">Deuda total acumulada</p>
                  <p className="mt-3 text-4xl font-bold text-red-400">{formatMoney(resumen.deudaTotal)}</p>
                  <p className="mt-2 text-xs text-textSecondary">Suma de saldos pendientes · click para ver detalle</p>
                </button>
                <button
                  type="button"
                  onClick={() => setResumenDeudaOpen(true)}
                  className="rounded-3xl bg-panel p-6 shadow-panel text-left cursor-pointer transition hover:ring-2 hover:ring-amber-500/40 hover:bg-panel/80 focus:outline-none"
                >
                  <p className="text-sm text-textSecondary">Clientes con deuda</p>
                  <p className="mt-3 text-4xl font-bold text-amber-400">{resumen.clientesConDeuda}</p>
                  <p className="mt-2 text-xs text-textSecondary">de {clientes.length} clientes en total · click para ver detalle</p>
                </button>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Últimas 5 facturas */}
                <div className="rounded-3xl bg-panel p-6 shadow-panel">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Últimas facturas</h3>
                    <button type="button" onClick={() => setPage('historial')} className="text-xs text-accent hover:underline">Ver todas →</button>
                  </div>
                  {resumen.ultimas5Facturas.length === 0 ? (
                    <p className="text-sm text-textSecondary">No hay facturas registradas.</p>
                  ) : (
                    <div className="space-y-2">
                      {resumen.ultimas5Facturas.map((f) => {
                        const cli = clientes.find(c => c.id === f.clienteId);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setSelectedInvoice(f.id)}
                            className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 text-left transition hover:ring-1 hover:ring-accent/40 cursor-pointer"
                          >
                            <div>
                              <p className="text-sm font-medium text-textPrimary">{cli?.nombre ?? 'Cliente eliminado'}</p>
                              <p className="text-xs text-textSecondary">{f.fecha} · {f.items.length} ítem{f.items.length !== 1 ? 's' : ''}</p>
                            </div>
                            <span className="text-sm font-semibold text-accent">{formatMoney(f.total)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Últimos 3 pagos */}
                <div className="rounded-3xl bg-panel p-6 shadow-panel">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Últimos pagos</h3>
                  </div>
                  {resumen.ultimos3Pagos.length === 0 ? (
                    <p className="text-sm text-textSecondary">No hay pagos registrados.</p>
                  ) : (
                    <div className="space-y-2">
                      {resumen.ultimos3Pagos.map((p) => {
                        const cli = clientes.find(c => c.id === p.clienteId);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setResumenPagoDetalle(p)}
                            className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 text-left transition hover:ring-1 hover:ring-green-500/40 cursor-pointer"
                          >
                            <div>
                              <p className="text-sm font-medium text-textPrimary">{cli?.nombre ?? 'Cliente eliminado'}</p>
                              <p className="text-xs text-textSecondary">{p.fecha} · {p.forma}</p>
                            </div>
                            <span className="text-sm font-semibold text-green-400">{formatMoney(p.monto)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {page === 'dashboard' && (
            <section className="space-y-6 overflow-visible">
              <div className="rounded-3xl bg-panel p-6 shadow-panel overflow-visible">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm text-textSecondary">
                      {editingFactura ? 'Editando factura' : editingPresupuesto ? 'Editando presupuesto' : 'Factura nueva'}
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold">
                      {editingFactura
                        ? `Editar factura #${editingFactura.id.slice(-6).toUpperCase()}`
                        : editingPresupuesto
                          ? `Editar presupuesto #${editingPresupuesto.id.slice(-6).toUpperCase()}`
                          : 'Completa la venta y actualiza la cuenta'}
                    </h3>
                  </div>
                  {editingFactura && (
                    <button type="button" onClick={() => { setEditingFactura(null); setRows([{ rowKey: 'r0', prodId: '', nombre: '', categoria: '', talle: '', color: '', cant: 1, precio: 0, query: '' }]); setInvoiceDate(today); setDescuentoAplicado(false); }} className="rounded-3xl bg-surface px-4 py-2 text-sm text-textPrimary ring-1 ring-border hover:bg-border">
                      Cancelar edición
                    </button>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-textSecondary">
                      Cliente
                      <div className="relative">
                        <input
                          type="text"
                          value={invoiceClientDropdownOpen ? invoiceClientSearch : (invoiceClienteActual?.nombre ?? '')}
                          onChange={(e) => { setInvoiceClientSearch(e.target.value); setInvoiceClientDropdownOpen(true); }}
                          onFocus={() => { setInvoiceClientSearch(''); setInvoiceClientDropdownOpen(true); }}
                          onBlur={() => setTimeout(() => setInvoiceClientDropdownOpen(false), 150)}
                          placeholder="Buscar cliente..."
                          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                        />
                        {invoiceClientDropdownOpen && (
                          <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-auto rounded-2xl border border-border bg-panel shadow-xl">
                            {clientes.filter(c => invoiceClientSearch === '' || c.nombre.toLowerCase().includes(invoiceClientSearch.toLowerCase())).map(c => (
                              <button key={c.id} type="button"
                                onMouseDown={() => handleInvoiceClientChange(c.id)}
                                className="w-full px-4 py-2 text-left text-sm text-textPrimary hover:bg-surface border-b border-border last:border-b-0"
                              >
                                <span className="font-medium">{c.nombre}</span>
                                <span className="ml-2 text-xs text-textSecondary">{getListaById(c.cat).nombre}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                    <label className="space-y-2 text-sm text-textSecondary">
                      Fecha
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-6 overflow-visible rounded-3xl border border-border">
                  <div className="grid grid-cols-[2fr_80px_120px_120px_80px] gap-4 bg-surface px-5 py-4 text-sm uppercase tracking-[0.12em] text-textSecondary">
                    <span>Producto</span>
                    <span>Cant.</span>
                    <span>Precio</span>
                    <span>Subtotal</span>
                    <span></span>
                  </div>
                  <div className="divide-y divide-slate-200 bg-panel overflow-visible">
                    {rows.map((row) => {
                      const matches = filteredProducts(row.query || '');
                      return (
                        <div key={row.rowKey} className="grid grid-cols-[2fr_80px_120px_120px_80px] gap-4 px-5 py-4 items-start">
                          <div className="relative">
                            <input
                              value={row.prodId ? row.nombre : row.query}
                              onChange={(event) => {
                                if (!row.prodId) {
                                  handleRowChange(row.rowKey, 'query', event.target.value);
                                }
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' && matches.length > 0 && !row.prodId) {
                                  event.preventDefault();
                                  updateRowProduct(row.rowKey, matches[0]);
                                }
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  handleRowChange(row.rowKey, 'query', '');
                                  (event.target as HTMLInputElement).blur();
                                }
                                if (event.key === 'Backspace' && row.prodId) {
                                  // Permitir eliminar producto seleccionado con Backspace
                                  event.preventDefault();
                                  handleRowChange(row.rowKey, 'prodId', '');
                                  handleRowChange(row.rowKey, 'nombre', '');
                                  handleRowChange(row.rowKey, 'categoria', '');
                                  handleRowChange(row.rowKey, 'talle', '');
                                  handleRowChange(row.rowKey, 'color', '');
                                  handleRowChange(row.rowKey, 'query', '');
                                }
                              }}
                              placeholder={row.prodId ? "Producto seleccionado (Backspace para cambiar)" : "Buscar producto..."}
                              className={`w-full rounded-3xl border border-border px-4 py-3 text-sm outline-none transition focus:border-accent ${
                                row.prodId ? 'bg-green-900/20 text-green-300 border-green-600' : 'bg-surface text-textPrimary'
                              }`}
                              readOnly={!!row.prodId}
                            />
                            {row.prodId && (
                              <div className="mt-1 px-4 text-xs text-green-400">
                                {row.categoria} • {row.talle} • {row.color}
                              </div>
                            )}
                            {matches.length > 0 && row.query && row.query.trim().length > 0 && !row.prodId && (
                              <div className="absolute left-0 top-full z-[60] mt-2 max-h-60 w-full overflow-auto rounded-3xl border border-border bg-panel shadow-2xl">
                                {matches.map((product, index) => (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => {
                                      updateRowProduct(row.rowKey, product);
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm text-textPrimary transition hover:bg-surface border-b border-border last:border-b-0"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-textPrimary">{product.nombre}</span>
                                      <span className="text-xs text-textSecondary">{product.categoria} • {product.talle} • {product.color}</span>
                                      <span className="text-xs text-accent font-medium">{formatMoney(product.precio)}</span>
                                    </div>
                                  </button>
                                ))}
                                {matches.length === 0 && row.query.trim().length > 2 && (
                                  <div className="px-4 py-3 text-sm text-textSecondary">
                                    No se encontraron productos
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <label className="space-y-2 text-sm text-textSecondary">
                            <input
                              type="number"
                              min={1}
                              value={formatNumberInput(row.cant)}
                              onChange={(event) => handleRowChange(row.rowKey, 'cant', Number(event.target.value))}
                              className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                            />
                          </label>
                          <div>
                            <input
                              value={formatNumberInput(row.precio)}
                              onChange={(event) => handleRowChange(row.rowKey, 'precio', Number(event.target.value))}
                              type="number"
                              min={0}
                              className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                            />
                          </div>
                          <div className="flex flex-col text-sm">
                            {descuentoAplicado ? (
                              <>
                                <span className="text-textSecondary line-through">{formatMoney(row.precio * row.cant)}</span>
                                <span className="text-green-400 font-medium">{formatMoney(row.precio * row.cant * 0.9)}</span>
                              </>
                            ) : (
                              <span className="text-textPrimary">{formatMoney(row.precio * row.cant)}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => removeRow(row.rowKey)}
                              className="rounded-full px-3 py-2 text-sm text-red-600 transition hover:bg-red-900"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {rows.some(r => r.prodId && r.precio === 0) && (
                  <div className="mt-4 rounded-2xl bg-yellow-900/20 border border-yellow-700 px-4 py-3 text-sm text-yellow-300">
                    ⚠ Algunos productos no tienen precio definido para la lista "{getListaById(invoiceClienteActual?.cat ?? 'general').nombre}". Configura los precios en la pantalla de Productos.
                  </div>
                )}
                <div className="mt-6 flex flex-col gap-4 rounded-3xl bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={addRow}
                      className="inline-flex items-center justify-center rounded-3xl bg-panel px-5 py-3 text-sm font-medium text-textPrimary shadow-sm ring-1 ring-border transition hover:bg-surface"
                    >
                      Añadir
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescuentoAplicado(v => !v)}
                      className={`inline-flex items-center justify-center rounded-3xl px-5 py-3 text-sm font-medium shadow-sm ring-1 transition ${
                        descuentoAplicado
                          ? 'bg-accent text-white ring-accent hover:opacity-90'
                          : 'bg-panel text-textPrimary ring-border hover:bg-surface'
                      }`}
                    >
                      {descuentoAplicado ? '✓ Dto. 10% activo' : 'Aplicar 10% dto.'}
                    </button>
                  </div>
                  <div className="text-right">
                    {descuentoAplicado ? (
                      <>
                        <p className="text-sm text-textSecondary line-through">{formatMoney(totalFactura)}</p>
                        <p className="text-xs text-textSecondary">- {formatMoney(montoDescuento)} (10%)</p>
                        <p className="mt-1 text-3xl font-semibold text-green-400">{formatMoney(totalConDescuento)}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-textSecondary">Total general</p>
                        <p className="mt-1 text-3xl font-semibold">{formatMoney(totalFactura)}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-textSecondary mb-1">Notas</label>
                  <textarea
                    value={invoiceNotas}
                    onChange={e => setInvoiceNotas(e.target.value)}
                    placeholder="Ej: entrega en 15 días, sin el talle 12..."
                    rows={2}
                    className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent resize-none"
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-border bg-surface/50 p-4">
                  <h4 className="text-sm font-semibold text-textPrimary mb-3">Seña / pago al momento (opcional)</h4>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={invoiceSena === 0 ? '' : invoiceSena}
                      onChange={e => setInvoiceSena(Number(e.target.value))}
                      placeholder="Monto de seña"
                      className="flex-1 rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-textPrimary outline-none focus:border-accent"
                    />
                    <select
                      value={invoiceSenaForma}
                      onChange={e => setInvoiceSenaForma(e.target.value as FormaPago)}
                      className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm text-textPrimary outline-none focus:border-accent"
                    >
                      {formasPago.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  {invoiceSena > 0 && (
                    <p className="mt-2 text-xs text-textSecondary">
                      Saldo a quedar: <span className="font-semibold text-accent">{formatMoney(totalConDescuento - invoiceSena)}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleGuardarPresupuesto}
                    disabled={!invoiceClienteActual || rows.every((row) => !row.prodId)}
                    className="flex-1 rounded-3xl border border-border bg-surface py-3 text-sm font-semibold text-textPrimary transition hover:bg-border disabled:opacity-50"
                  >
                    Guardar como presupuesto
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmInvoice}
                    className="flex-1 rounded-3xl bg-accent py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50"
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
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">Clientes</h3>
                    <p className="mt-1 text-sm text-textSecondary">Revisa rápidamente el saldo, categoría y último pago.</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setExportDeudoresModalOpen(true)}
                      className="rounded-3xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-textPrimary transition hover:bg-border"
                    >
                      Exportar deudores
                    </button>
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
                </div>
                <div className="mt-4">
                  <input
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    placeholder="Buscar cliente por nombre..."
                    className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                  />
                </div>
                <div className="mt-4 overflow-hidden rounded-3xl border border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm min-w-[700px]">
                      <thead className="bg-surface text-textSecondary">
                        <tr>
                          <th className="px-3 py-4 text-left sm:px-5">Nombre</th>
                          <th className="px-3 py-4 text-left sm:px-5 hidden sm:table-cell">Lista de precios</th>
                          <th className="px-3 py-4 text-left sm:px-5 hidden md:table-cell">Teléfono</th>
                          <th className="px-3 py-4 text-left sm:px-5">Saldo</th>
                          <th className="px-3 py-4 text-left sm:px-5 hidden lg:table-cell">Último pago</th>
                          <th className="px-3 py-4 text-left sm:px-5">Acciones</th>
                        </tr>
                      </thead>
                    <tbody>
                      {clienteList.map((cliente) => {
                        const clienteFacturas = facturas.filter((factura) => factura.clienteId === cliente.id);
                        const clientePagos = pagos.filter((p) => p.clienteId === cliente.id);
                        const clienteTotalF = clienteFacturas.reduce((sum, f) => sum + f.total, 0);
                        const clienteTotalP = clientePagos.reduce((sum, p) => sum + p.monto, 0);
                        const total = clienteTotalF - clienteTotalP;
                        const sinActividad = clienteFacturas.length === 0 && clientePagos.length === 0;
                        const lastPago = clientePagos.map((p) => p.fecha).sort().reverse()[0];
                        return (
                          <tr key={cliente.id} className="border-t border-border hover:bg-surface">
                            <td
                              className="cursor-pointer px-3 py-4 sm:px-5"
                              onClick={() => { setSelectedClientId(cliente.id); setPage('cuenta'); }}
                            >
                              <div className="font-medium">{cliente.nombre}</div>
                              <div className="mt-1 text-xs text-textSecondary">{cliente.email}</div>
                              <div className="mt-1 text-xs text-textSecondary sm:hidden">
                                {getListaById(cliente.cat).nombre} • {cliente.tel}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-textSecondary sm:px-5 hidden sm:table-cell">{getListaById(cliente.cat).nombre}</td>
                            <td className="px-3 py-4 text-textSecondary sm:px-5 hidden md:table-cell">{cliente.tel}</td>
                            <td className={`px-3 py-4 sm:px-5 font-semibold ${sinActividad || total === 0 ? 'text-textSecondary' : total > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                              {formatMoney(total)}
                            </td>
                            <td className="px-3 py-4 text-textSecondary sm:px-5 hidden lg:table-cell">
                              {lastPago ?? <span className="text-textSecondary/50 italic">Sin actividad</span>}
                            </td>
                            <td className="px-3 py-4 sm:px-5">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPaymentClienteId(cliente.id);
                                    setPaymentModalOpen(true);
                                  }}
                                  className="rounded-3xl bg-blue-900 px-3 py-2 text-xs text-blue-300 transition hover:bg-blue-800"
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
                                  className="rounded-3xl bg-red-900 px-3 py-2 text-xs text-red-300 transition hover:bg-red-200"
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
              </div>
            </section>
          )}

          {page === 'cuenta' && clienteActual && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">{clienteActual.nombre}</h3>
                    <p className="mt-1 text-sm text-textSecondary">Categoría: {clienteActual.cat}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => clienteActual && enviarWhatsAppResumen(clienteActual)}
                      className="rounded-3xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 flex items-center gap-2"
                    >
                      <span>📱</span> Enviar por WhatsApp
                    </button>
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
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-border bg-surface p-5">
                    <p className="text-sm text-textSecondary">Saldo pendiente</p>
                    <p className="mt-2 text-3xl font-semibold">{formatMoney(saldoPendiente)}</p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface p-5">
                    <p className="text-sm text-textSecondary">Total comprado</p>
                    <p className="mt-2 text-3xl font-semibold">{formatMoney(totalComprado)}</p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface p-5">
                    <p className="text-sm text-textSecondary">Total pagado</p>
                    <p className="mt-2 text-3xl font-semibold">{formatMoney(totalPagado)}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl bg-panel p-6 shadow-panel">
                  <h4 className="text-xl font-semibold">Compras</h4>
                  <div className="mt-5 overflow-hidden rounded-3xl border border-border">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm min-w-[500px]">
                      <thead className="bg-surface text-textSecondary">
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
                            <tr key={factura.id} className="border-t border-border hover:bg-surface">
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
                </div>
                <div className="rounded-3xl bg-panel p-6 shadow-panel">
                  <h4 className="text-xl font-semibold">Pagos</h4>
                  <div className="mt-5 space-y-4">
                    {pagosPorCliente.length === 0 ? (
                      <p className="text-sm text-textSecondary">No hay pagos registrados aún.</p>
                    ) : (
                      pagosPorCliente.map((pago) => (
                        <div key={pago.id} className="rounded-3xl border border-border bg-surface p-4">
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
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
                <h3 className="text-2xl font-semibold">Historial de facturas</h3>
                <p className="mt-1 text-sm text-textSecondary">Todas las facturas generadas, ordenadas por fecha.</p>
                <div className="mt-6 overflow-hidden rounded-3xl border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-surface text-textSecondary">
                      <tr>
                        <th className="px-5 py-4 text-left">N°</th>
                        <th className="px-5 py-4 text-left">Fecha</th>
                        <th className="px-5 py-4 text-left">Cliente</th>
                        <th className="px-5 py-4 text-left">Ítems</th>
                        <th className="px-5 py-4 text-left">Total</th>
                        <th className="px-5 py-4 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedFacturas.map((factura, index) => {
                        const cliente = clientes.find((item) => item.id === factura.clienteId);
                        return (
                          <tr key={factura.id} className="border-t border-border hover:bg-surface">
                            <td className="px-5 py-4 text-textSecondary">{index + 1}</td>
                            <td className="px-5 py-4 text-textSecondary">{factura.fecha}</td>
                            <td className="px-5 py-4">{cliente?.nombre ?? 'Cliente eliminado'}</td>
                            <td className="px-5 py-4 text-textSecondary">
                              {factura.items.map((item) => `${item.nombre} ×${item.cant}`).join(', ')}
                            </td>
                            <td className="px-5 py-4 font-semibold">{formatMoney(factura.total)}</td>
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => cliente && printInvoice(factura, cliente)}
                                  className="rounded-3xl bg-blue-900 px-3 py-2 text-xs text-blue-300 transition hover:bg-blue-800"
                                  disabled={!cliente}
                                >
                                  🖨️ Imprimir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoice(factura.id)}
                                  className="rounded-3xl bg-surface px-3 py-2 text-xs text-textPrimary transition hover:bg-border"
                                >
                                  👁️ Ver
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditFactura(factura)}
                                  className="rounded-3xl bg-amber-900/40 px-3 py-2 text-xs text-amber-300 transition hover:bg-amber-900"
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFactura(factura.id)}
                                  className="rounded-3xl bg-red-900/40 px-3 py-2 text-xs text-red-300 transition hover:bg-red-900"
                                >
                                  🗑️ Eliminar
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

          {page === 'nuevo-cliente' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-panel p-6 shadow-panel sm:p-8">
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
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-textSecondary">
                    Teléfono
                    <input
                      value={newClientTel}
                      onChange={(e) => setNewClientTel(e.target.value)}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-textSecondary">
                    Email
                    <input
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-textSecondary">
                    Lista de precios
                    <select
                      value={newClientCat}
                      onChange={(e) => setNewClientCat(e.target.value)}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    >
                      {listasPrecios.map(l => (
                        <option key={l.id} value={l.id}>{l.nombre}</option>
                      ))}
                    </select>
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
                      className="rounded-3xl bg-panel px-6 py-3 text-sm font-semibold text-textPrimary shadow-sm ring-1 ring-border transition hover:bg-surface"
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
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">Productos</h3>
                    <p className="mt-1 text-sm text-textSecondary">Gestiona variantes y precios por lista. Haz clic en "Editar precios" para configurar la tabla de precios de cada producto.</p>
                  </div>
                  <div className="flex gap-3">
                    <input
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      placeholder="Buscar producto..."
                      className="flex-1 rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => { setExportPreciosLista(listasPrecios[0]?.id || ''); setExportPreciosModalOpen(true); }}
                      className="rounded-3xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-textPrimary transition hover:bg-border whitespace-nowrap"
                    >
                      Exportar lista de precios
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProductEdit(null);
                        setNewProducto({ nombre: '', categoria: '', talle: '', color: '' });
                        setProductModalOpen(true);
                      }}
                      className="rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 whitespace-nowrap"
                    >
                      + Nueva variante
                    </button>
                  </div>
                </div>
                <div className="mt-6 overflow-hidden rounded-3xl border border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm min-w-[600px]">
                      <thead className="bg-surface text-textSecondary">
                        <tr>
                          <th className="px-3 py-4 text-left sm:px-5">Producto / Talle</th>
                          <th className="px-3 py-4 text-left sm:px-5 hidden md:table-cell">Precios configurados</th>
                          <th className="px-3 py-4 sm:px-5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productGroups.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-5 py-8 text-center text-textSecondary">No hay productos</td>
                          </tr>
                        ) : productGroups.map(group => {
                          const isExpanded = productFilter.trim() !== '' || expandedGroups.has(group.key);
                          const toggleGroup = () => setExpandedGroups(prev => {
                            const next = new Set(prev);
                            if (next.has(group.key)) next.delete(group.key);
                            else next.add(group.key);
                            return next;
                          });
                          return (
                          <Fragment key={group.key}>
                            {/* Fila de grupo (colapsable) */}
                            <tr className="bg-surface/60 border-t-2 border-border cursor-pointer hover:bg-surface/80 transition" onClick={toggleGroup}>
                              <td className="px-3 py-3 sm:px-5" colSpan={2}>
                                <div className="flex items-center gap-2">
                                  <span className="text-textSecondary text-xs select-none">{isExpanded ? '▼' : '▶'}</span>
                                  <div>
                                    <span className="font-semibold text-textPrimary">{group.nombre}</span>
                                    <span className="ml-2 text-xs text-textSecondary capitalize">{group.categoria}</span>
                                    <span className="ml-2 text-xs text-textSecondary">· {group.variants.length} talle{group.variants.length !== 1 ? 's' : ''}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right sm:px-5" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => { setPriceMatrixGroup(group.key); setEditingPriceMap({}); }}
                                  className="rounded-3xl bg-accent/20 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/30 transition"
                                >
                                  Editar precios
                                </button>
                              </td>
                            </tr>
                            {/* Filas de variantes (solo si está expandido) */}
                            {isExpanded && group.variants.map(item => {
                              const hasAllPrices = listasPrecios.length > 0 && listasPrecios.every(l =>
                                productPrices.some(pp => pp.productoId === item.id && pp.listaId === l.id && pp.precio > 0)
                              );
                              return (
                                <tr key={item.id} className="border-t border-border/40 hover:bg-surface">
                                  <td className="px-6 py-3 sm:px-8">
                                    <span className="text-sm text-textPrimary">{item.talle}</span>
                                    {item.color && <span className="ml-2 text-xs text-textSecondary">· {item.color}</span>}
                                    {!hasAllPrices && (
                                      <span className="ml-2 rounded-full bg-yellow-600/20 px-2 py-0.5 text-xs text-yellow-400">sin precios</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-3 sm:px-5 hidden md:table-cell">
                                    <div className="flex flex-wrap gap-2">
                                      {listasPrecios.map(lista => {
                                        const pp = productPrices.find(p => p.productoId === item.id && p.listaId === lista.id);
                                        return (
                                          <span key={lista.id} className={`text-xs ${pp && pp.precio > 0 ? 'text-textSecondary' : 'text-yellow-500'}`}>
                                            <span className="text-textSecondary/50">{lista.nombre}:</span> {pp && pp.precio > 0 ? formatMoney(pp.precio) : '—'}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-right sm:px-5">
                                    <button type="button" onClick={() => handleProductEdit(item)}
                                      className="mr-2 rounded-3xl bg-surface px-3 py-2 text-xs text-textPrimary transition hover:bg-border">
                                      Editar
                                    </button>
                                    <button type="button" onClick={() => handleProductDelete(item.id)}
                                      className="rounded-3xl bg-red-900/40 px-3 py-2 text-xs text-red-400 transition hover:bg-red-900">
                                      Borrar
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {page === 'admin' && currentUserData?.rol === 'admin' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
                <div>
                  <h3 className="text-2xl font-semibold">Administración de usuarios</h3>
                  <p className="mt-1 text-sm text-textSecondary">Gestiona las solicitudes de registro de nuevos usuarios.</p>
                </div>

                {usuariosPendientes.length === 0 ? (
                  <div className="mt-6 rounded-3xl bg-surface p-8 text-center">
                    <div className="text-4xl mb-4">✅</div>
                    <h4 className="font-semibold text-textPrimary mb-2">No hay solicitudes pendientes</h4>
                    <p className="text-textSecondary">Todas las solicitudes de registro han sido procesadas.</p>
                  </div>
                ) : (
                  <div className="mt-6">
                    <h4 className="font-semibold text-textPrimary mb-4">
                      Solicitudes pendientes ({usuariosPendientes.length})
                    </h4>
                    <div className="space-y-4">
                      {usuariosPendientes.map((usuario) => (
                        <div key={usuario.id} className="rounded-3xl bg-surface p-6 border border-border">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h5 className="font-semibold text-textPrimary">{usuario.username}</h5>
                                <span className="rounded-full bg-yellow-600 px-2 py-1 text-xs text-white">
                                  Pendiente
                                </span>
                              </div>
                              <p className="text-sm text-textSecondary mb-1">
                                📧 {usuario.email}
                              </p>
                              <p className="text-xs text-textSecondary">
                                Registrado: {new Date(usuario.created_at).toLocaleString('es-AR')}
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => handleAprobarUsuario(usuario.username)}
                                className="rounded-3xl bg-green-700 px-4 py-2 text-sm font-semibold text-green-100 transition hover:bg-green-600"
                              >
                                ✅ Aprobar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRechazarUsuario(usuario.username)}
                                className="rounded-3xl bg-red-700 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-600"
                              >
                                ❌ Rechazar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {page === 'backup' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
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
                  <div className="rounded-3xl border border-border bg-surface p-6">
                    <h4 className="text-lg font-semibold">Exportar</h4>
                    <p className="mt-2 text-sm text-textSecondary">Guarda un archivo JSON con todos los clientes, productos, facturas y pagos.</p>
                    <div className="mt-4 rounded-3xl bg-panel p-4 border border-border">
                      <p className="text-sm text-textSecondary">Haz clic en "Descargar backup" y luego guarda el archivo en tu computadora.</p>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface p-6">
                    <h4 className="text-lg font-semibold">Importar</h4>
                    <p className="mt-2 text-sm text-textSecondary">Carga un backup JSON para restaurar los datos en este navegador.</p>
                    <input
                      type="file"
                      accept="application/json"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) handleBackupFile(file);
                      }}
                      className="mt-4 w-full rounded-3xl border border-border bg-panel px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                    <textarea
                      value={backupText}
                      onChange={(event) => setBackupText(event.target.value)}
                      placeholder="O pega aquí el contenido JSON del backup"
                      rows={8}
                      className="mt-4 w-full rounded-3xl border border-border bg-panel px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => handleBackupRestore(backupText)}
                      className="mt-4 rounded-3xl bg-panel px-5 py-3 text-sm font-semibold text-textPrimary shadow-sm ring-1 ring-border transition hover:bg-surface"
                    >
                      Restaurar desde JSON
                    </button>
                    {backupMessage && <p className="mt-3 text-sm text-emerald-600">{backupMessage}</p>}
                    {backupError && <p className="mt-3 text-sm text-red-600">{backupError}</p>}
                  </div>
                </div>
              </div>

              {/* Recuperación de pagos desde auditoría */}
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
                <h3 className="text-xl font-semibold">Recuperar pagos desde auditoría</h3>
                <p className="mt-1 text-sm text-textSecondary">
                  Busca en el historial de auditoría los pagos que existen en el registro pero no están cargados actualmente.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleRecuperarPagosDeAuditoria}
                    disabled={recoveryLoading}
                    className="rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {recoveryLoading ? 'Buscando...' : 'Buscar pagos en auditoría'}
                  </button>
                </div>

                {recoveryDone && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <p className="font-semibold">Aviso importante:</p>
                    <p className="mt-1">Esta herramienta solo puede recuperar pagos que fueron registrados con el botón "Registrar pago". Las <strong>señas cargadas al crear una factura</strong> no quedaron registradas en la auditoría (bug ya corregido) y deben cargarse manualmente.</p>
                  </div>
                )}

                {recoveryDone && recoveryPagos.length === 0 && (
                  <p className="mt-3 text-sm text-emerald-600">No se encontraron pagos faltantes en la auditoría.</p>
                )}

                {recoveryPagos.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold text-amber-600">
                      Se encontraron {recoveryPagos.length} pago(s) en la auditoría que no están en la base de datos:
                    </p>
                    <div className="max-h-80 overflow-y-auto rounded-2xl border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-surface">
                          <tr>
                            <th className="px-4 py-2 text-left text-textSecondary font-medium">Cliente</th>
                            <th className="px-4 py-2 text-left text-textSecondary font-medium">Fecha</th>
                            <th className="px-4 py-2 text-right text-textSecondary font-medium">Monto</th>
                            <th className="px-4 py-2 text-left text-textSecondary font-medium">Forma</th>
                            <th className="px-4 py-2 text-left text-textSecondary font-medium">Notas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recoveryPagos.map(p => {
                            const cliente = clientes.find(c => c.id === p.clienteId);
                            return (
                              <tr key={p.id} className="border-t border-border">
                                <td className="px-4 py-2 font-medium">{cliente?.nombre ?? p.clienteId}</td>
                                <td className="px-4 py-2 text-textSecondary">{p.fecha}</td>
                                <td className="px-4 py-2 text-right text-emerald-600 font-semibold">{formatMoney(p.monto)}</td>
                                <td className="px-4 py-2 text-textSecondary">{p.forma}</td>
                                <td className="px-4 py-2 text-textSecondary">{p.notas || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      onClick={handleRestaurarPagos}
                      className="rounded-3xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Restaurar {recoveryPagos.length} pago(s)
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {page === 'auditoria' && (
            <section className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-textPrimary">Auditoría del sistema</h2>
                <p className="mt-1 text-sm text-textSecondary">Registro completo de todas las acciones realizadas por los usuarios.</p>
              </div>

              {/* Filtros */}
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="space-y-2 text-sm text-textSecondary">
                    Usuario
                    <input
                      type="text"
                      value={auditFilterUsuario}
                      onChange={(e) => setAuditFilterUsuario(e.target.value)}
                      placeholder="Filtrar por usuario..."
                      className="w-full rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-textSecondary">
                    Entidad
                    <select
                      value={auditFilterEntidad}
                      onChange={(e) => setAuditFilterEntidad(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-textPrimary outline-none transition focus:border-accent"
                    >
                      <option value="">Todas</option>
                      <option value="cliente">Cliente / Usuario</option>
                      <option value="producto">Producto</option>
                      <option value="factura">Factura</option>
                      <option value="pago">Pago</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-textSecondary">
                    Desde
                    <input
                      type="date"
                      value={auditFilterDesde}
                      onChange={(e) => setAuditFilterDesde(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-textSecondary">
                    Hasta
                    <input
                      type="date"
                      value={auditFilterHasta}
                      onChange={(e) => setAuditFilterHasta(e.target.value)}
                      className="w-full rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                  </label>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={loadAuditData}
                    disabled={auditLoading}
                    className="rounded-3xl bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {auditLoading ? 'Cargando...' : 'Buscar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuditFilterUsuario(''); setAuditFilterEntidad(''); setAuditFilterDesde(''); setAuditFilterHasta(''); }}
                    className="rounded-3xl bg-panel px-5 py-2 text-sm font-semibold text-textPrimary ring-1 ring-border transition hover:bg-surface"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Tabla */}
              <div className="rounded-3xl bg-panel shadow-panel overflow-hidden">
                {auditLoading ? (
                  <div className="p-10 text-center text-textSecondary">Cargando registros...</div>
                ) : auditData.length === 0 ? (
                  <div className="p-10 text-center text-textSecondary">No hay registros de auditoría.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-surface text-textSecondary">
                        <tr>
                          <th className="px-4 py-3 text-left">Fecha</th>
                          <th className="px-4 py-3 text-left">Usuario</th>
                          <th className="px-4 py-3 text-left">Acción</th>
                          <th className="px-4 py-3 text-left">Entidad</th>
                          <th className="px-4 py-3 text-left">Detalles</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditData.flatMap((row) => {
                          const isExpanded = auditExpandedId === row.id;
                          let parsed: any = null;
                          let isStructured = false;
                          try {
                            if (row.detalles) {
                              parsed = JSON.parse(row.detalles);
                              isStructured = parsed?.v === 2;
                            }
                          } catch { /* plain text detalles */ }

                          const fecha = row.fecha ? new Date(row.fecha).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

                          const mainRow = (
                            <tr key={row.id} className="border-t border-border hover:bg-surface">
                              <td className="px-4 py-3 text-textSecondary whitespace-nowrap">{fecha}</td>
                              <td className="px-4 py-3 font-medium">{row.usuario}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  row.accion?.includes('ELIMINAD') ? 'bg-red-900/40 text-red-300' :
                                  row.accion?.includes('EDITAD') ? 'bg-amber-900/40 text-amber-300' :
                                  row.accion?.includes('CREAD') || row.accion?.includes('REGISTRAD') || row.accion?.includes('APROBAD') ? 'bg-green-900/40 text-green-300' :
                                  row.accion?.includes('SESION') ? 'bg-blue-900/40 text-blue-300' :
                                  'bg-surface text-textSecondary'
                                }`}>
                                  {row.accion}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-textSecondary capitalize">{row.entidad}</td>
                              <td className="px-4 py-3">
                                {row.detalles && (
                                  <button
                                    type="button"
                                    onClick={() => setAuditExpandedId(isExpanded ? null : row.id)}
                                    className="rounded-2xl bg-surface px-3 py-1 text-xs text-textPrimary ring-1 ring-border transition hover:bg-border"
                                  >
                                    {isExpanded ? 'Ocultar' : 'Ver detalles'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );

                          if (!isExpanded) return [mainRow];

                          const detailRow = (
                            <tr key={`${row.id}-det`} className="bg-surface border-t border-border">
                              <td colSpan={5} className="px-6 py-4">
                                {isStructured ? (
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    {parsed.antes && (
                                      <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-400">Antes</p>
                                        <div className="rounded-2xl bg-panel p-3 space-y-1">
                                          {Object.entries(parsed.antes).map(([k, v]) => (
                                            <div key={k} className="flex gap-2 text-xs">
                                              <span className="text-textSecondary min-w-[90px]">{k}:</span>
                                              <span className="text-textPrimary break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {parsed.despues && (
                                      <div>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-green-400">Después</p>
                                        <div className="rounded-2xl bg-panel p-3 space-y-1">
                                          {Object.entries(parsed.despues).map(([k, v]) => (
                                            <div key={k} className="flex gap-2 text-xs">
                                              <span className="text-textSecondary min-w-[90px]">{k}:</span>
                                              <span className="text-textPrimary break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {!parsed.antes && !parsed.despues && (
                                      <div className="sm:col-span-2 text-xs text-textSecondary whitespace-pre-wrap">{row.detalles}</div>
                                    )}
                                  </div>
                                ) : (
                                  <pre className="text-xs text-textSecondary whitespace-pre-wrap">{row.detalles}</pre>
                                )}
                              </td>
                            </tr>
                          );

                          return [mainRow, detailRow];
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {page === 'listas-precios' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold">Listas de precios</h3>
                    <p className="mt-1 text-sm text-textSecondary">Crea listas y asígnalas a clientes. Los precios por producto se configuran en la pantalla de Productos.</p>
                  </div>
                </div>

                {/* Tabla de listas existentes */}
                <div className="mt-6 overflow-hidden rounded-3xl border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-surface text-textSecondary">
                      <tr>
                        <th className="px-5 py-4 text-left">Nombre</th>
                        <th className="px-5 py-4 text-left">Clientes asignados</th>
                        <th className="px-5 py-4 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listasPrecios.map((lista) => {
                        const isBuiltin = lista.id === 'general' || lista.id === 'especial';
                        const cantClientes = clientes.filter(c => c.cat === lista.id).length;
                        return (
                          <tr key={lista.id} className="border-t border-border hover:bg-surface">
                            <td className="px-5 py-4 font-medium">
                              {lista.nombre}
                              {isBuiltin && <span className="ml-2 text-xs text-textSecondary">(integrada)</span>}
                            </td>
                            <td className="px-5 py-4 text-textSecondary">{cantClientes > 0 ? `${cantClientes} cliente${cantClientes !== 1 ? 's' : ''}` : '—'}</td>
                            <td className="px-5 py-4">
                              {!isBuiltin && (
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => { setEditingLista(lista); setNewListaNombre(lista.nombre); }}
                                    className="rounded-3xl bg-amber-900/40 px-3 py-2 text-xs text-amber-300 hover:bg-amber-900">Editar</button>
                                  <button type="button" onClick={() => handleDeleteLista(lista.id)}
                                    className="rounded-3xl bg-red-900/40 px-3 py-2 text-xs text-red-300 hover:bg-red-900">Eliminar</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Formulario nueva lista */}
                <div className="mt-8 rounded-3xl border border-border bg-surface p-6">
                  <h4 className="text-lg font-semibold mb-4">{editingLista ? `Editando: ${editingLista.nombre}` : 'Nueva lista de precios'}</h4>
                  <div className="flex gap-4 items-end">
                    <label className="flex-1 space-y-2 text-sm text-textSecondary">
                      Nombre de la lista
                      <input value={newListaNombre} onChange={(e) => setNewListaNombre(e.target.value)}
                        placeholder="Ej: Mayorista, VIP, Revendedor..."
                        className="w-full rounded-3xl border border-border bg-panel px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent" />
                    </label>
                    <button type="button" onClick={handleSaveLista}
                      className="rounded-3xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-600">
                      {editingLista ? 'Actualizar' : 'Crear lista'}
                    </button>
                    {editingLista && (
                      <button type="button" onClick={() => { setEditingLista(null); setNewListaNombre(''); }}
                        className="rounded-3xl bg-panel px-6 py-3 text-sm font-semibold text-textPrimary ring-1 ring-border hover:bg-surface">
                        Cancelar
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-textSecondary">
                    Una vez creada la lista, ve a Productos para asignar el precio de cada variante en esta lista.
                  </p>
                </div>
              </div>
            </section>
          )}

          {page === 'presupuestos' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
                <h3 className="text-2xl font-semibold mb-1">Presupuestos</h3>
                <p className="text-sm text-textSecondary mb-6">Presupuestos guardados. Convertí a factura cuando el cliente confirme.</p>
                {presupuestos.length === 0 ? (
                  <div className="py-12 text-center text-textSecondary">No hay presupuestos guardados</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-surface text-textSecondary">
                        <tr>
                          <th className="px-4 py-3 text-left">Fecha</th>
                          <th className="px-4 py-3 text-left">Cliente</th>
                          <th className="px-4 py-3 text-left">Items</th>
                          <th className="px-4 py-3 text-right">Total</th>
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {presupuestos.map(pres => {
                          const cliente = clientes.find(c => c.id === pres.clienteId);
                          return (
                            <tr key={pres.id} className="border-t border-border hover:bg-surface">
                              <td className="px-4 py-3">{pres.fecha}</td>
                              <td className="px-4 py-3 font-medium">{cliente?.nombre || '—'}</td>
                              <td className="px-4 py-3 text-textSecondary">{pres.items.length} ítem{pres.items.length !== 1 ? 's' : ''}</td>
                              <td className="px-4 py-3 text-right font-semibold">{formatMoney(pres.total)}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => handleEditarPresupuesto(pres)}
                                  className="mr-2 rounded-3xl bg-surface border border-border px-3 py-1.5 text-xs text-textPrimary hover:bg-border">
                                  Editar
                                </button>
                                <button onClick={() => handleConvertirPresupuesto(pres)}
                                  className="mr-2 rounded-3xl bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/30">
                                  Convertir en factura
                                </button>
                                <button onClick={() => enviarWhatsAppPresupuesto(pres)}
                                  className="mr-2 rounded-3xl bg-green-600/20 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-600/30">
                                  WhatsApp
                                </button>
                                <button onClick={async () => { await deletePresupuesto(pres.id); setPresupuestos(prev => prev.filter(p => p.id !== pres.id)); }}
                                  className="rounded-3xl bg-red-900/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900">
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {page === 'reportes' && currentUserData?.rol === 'admin' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
                <h3 className="text-2xl font-semibold mb-4">Reportes de ventas</h3>
                <div className="flex gap-4 flex-wrap items-end">
                  <div>
                    <label className="block text-xs text-textSecondary mb-1">Desde</label>
                    <input type="date" value={reporteDesde} onChange={e => setReporteDesde(e.target.value)}
                      className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-textPrimary outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="block text-xs text-textSecondary mb-1">Hasta</label>
                    <input type="date" value={reporteHasta} onChange={e => setReporteHasta(e.target.value)}
                      className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-textPrimary outline-none focus:border-accent" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setReporteDesdeAplicado(reporteDesde); setReporteHastaAplicado(reporteHasta); }}
                    className="rounded-2xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-600 transition"
                  >
                    Buscar
                  </button>
                  {(reporteDesdeAplicado || reporteHastaAplicado) && (
                    <button
                      type="button"
                      onClick={() => { setReporteDesde(''); setReporteHasta(''); setReporteDesdeAplicado(''); setReporteHastaAplicado(''); }}
                      className="rounded-2xl border border-border bg-surface px-5 py-2 text-sm text-textSecondary hover:bg-border transition"
                    >
                      Limpiar
                    </button>
                  )}
                  {reporteDesdeAplicado || reporteHastaAplicado ? (
                    <p className="text-xs text-textSecondary self-end pb-2">
                      Mostrando: {reporteDesdeAplicado || '...'} → {reporteHastaAplicado || '...'}
                    </p>
                  ) : (
                    <p className="text-xs text-textSecondary self-end pb-2">Mostrando todas las facturas</p>
                  )}
                </div>
              </div>

              {/* Resumen del período */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-panel p-6 shadow-panel">
                  <p className="text-sm text-textSecondary">Total vendido</p>
                  <p className="mt-2 text-3xl font-bold text-accent">{formatMoney(facturasFiltradas.reduce((s, f) => s + f.total, 0))}</p>
                  <p className="mt-1 text-xs text-textSecondary">{facturasFiltradas.length} facturas</p>
                </div>
                <div className="rounded-3xl bg-panel p-6 shadow-panel">
                  <p className="text-sm text-textSecondary">Total cobrado (período)</p>
                  <p className="mt-2 text-3xl font-bold text-green-400">{formatMoney(
                    pagos.filter(p => {
                      if (reporteDesde && p.fecha < reporteDesde) return false;
                      if (reporteHasta && p.fecha > reporteHasta) return false;
                      return true;
                    }).reduce((s, p) => s + p.monto, 0)
                  )}</p>
                </div>
                <div className="rounded-3xl bg-panel p-6 shadow-panel">
                  <p className="text-sm text-textSecondary">Promedio por factura</p>
                  <p className="mt-2 text-3xl font-bold text-textPrimary">
                    {facturasFiltradas.length > 0 ? formatMoney(facturasFiltradas.reduce((s, f) => s + f.total, 0) / facturasFiltradas.length) : '—'}
                  </p>
                </div>
              </div>

              {/* Gráfico ventas por mes */}
              {reporteVentasPorMes.length > 0 && (
                <div className="rounded-3xl bg-panel p-6 shadow-panel">
                  <h4 className="text-lg font-semibold mb-4">Ventas por mes</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={reporteVentasPorMes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="mes" tick={{ fill: '#888', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#888', fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => [formatMoney(Number(value ?? 0)), 'Ventas']} contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 12 }} />
                      <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top 10 productos */}
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
                <h4 className="text-lg font-semibold mb-4">Top 10 productos más vendidos</h4>
                {reporteTopProductos.length === 0 ? (
                  <p className="text-sm text-textSecondary">Sin datos en el período seleccionado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-surface text-textSecondary">
                        <tr>
                          <th className="px-4 py-3 text-left">#</th>
                          <th className="px-4 py-3 text-left">Producto</th>
                          <th className="px-4 py-3 text-left">Talle</th>
                          <th className="px-4 py-3 text-right">Unidades</th>
                          <th className="px-4 py-3 text-right">Total vendido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reporteTopProductos.map((p, i) => (
                          <tr key={i} className="border-t border-border hover:bg-surface">
                            <td className="px-4 py-3 text-textSecondary">{i + 1}</td>
                            <td className="px-4 py-3 font-medium">{p.nombre}</td>
                            <td className="px-4 py-3 text-textSecondary">{p.talle}</td>
                            <td className="px-4 py-3 text-right">{p.unidades}</td>
                            <td className="px-4 py-3 text-right font-semibold">{formatMoney(p.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Top 10 clientes */}
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
                <div className="flex items-center gap-3 mb-4">
                  <h4 className="text-lg font-semibold">Ranking de clientes</h4>
                  <div className="flex gap-2">
                    <button onClick={() => setRankingTab('volumen')}
                      className={`rounded-3xl px-3 py-1 text-xs font-semibold transition ${rankingTab === 'volumen' ? 'bg-accent text-white' : 'bg-surface text-textSecondary hover:bg-border'}`}>
                      Por volumen
                    </button>
                    <button onClick={() => setRankingTab('deuda')}
                      className={`rounded-3xl px-3 py-1 text-xs font-semibold transition ${rankingTab === 'deuda' ? 'bg-accent text-white' : 'bg-surface text-textSecondary hover:bg-border'}`}>
                      Por deuda
                    </button>
                  </div>
                </div>
                {rankingTab === 'volumen' ? (
                  reporteTopClientes.length === 0 ? (
                    <p className="text-sm text-textSecondary">Sin datos en el período.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-surface text-textSecondary">
                          <tr>
                            <th className="px-4 py-3 text-left">#</th>
                            <th className="px-4 py-3 text-left">Cliente</th>
                            <th className="px-4 py-3 text-right">Facturas</th>
                            <th className="px-4 py-3 text-right">Total comprado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reporteTopClientes.map((item, i) => (
                            <tr key={item.cliente.id} className="border-t border-border hover:bg-surface">
                              <td className="px-4 py-3 text-textSecondary">{i + 1}</td>
                              <td className="px-4 py-3 font-medium">{item.cliente.nombre}</td>
                              <td className="px-4 py-3 text-right">{item.cantFacturas}</td>
                              <td className="px-4 py-3 text-right font-semibold">{formatMoney(item.totalComprado)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  clientesConDeudaDetalle.length === 0 ? (
                    <p className="text-sm text-textSecondary">No hay clientes con deuda.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-surface text-textSecondary">
                          <tr>
                            <th className="px-4 py-3 text-left">#</th>
                            <th className="px-4 py-3 text-left">Cliente</th>
                            <th className="px-4 py-3 text-left">Teléfono</th>
                            <th className="px-4 py-3 text-right">Saldo pendiente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clientesConDeudaDetalle.slice(0, 10).map((item, i) => (
                            <tr key={item.cliente.id} className="border-t border-border hover:bg-surface">
                              <td className="px-4 py-3 text-textSecondary">{i + 1}</td>
                              <td className="px-4 py-3 font-medium">{item.cliente.nombre}</td>
                              <td className="px-4 py-3 text-textSecondary">{item.cliente.tel || '—'}</td>
                              <td className="px-4 py-3 text-right font-semibold text-amber-400">{formatMoney(item.saldo)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

        </main>
      </div>

      {/* Modal de producto (variante) */}
      <Modal
        title={productEdit ? 'Editar variante' : 'Nueva variante'}
        open={productModalOpen}
        onClose={() => { setProductModalOpen(false); setProductEdit(null); setNewProducto({ nombre: '', categoria: '', talle: '', color: '' }); }}
      >
        <div className="space-y-4">
          <p className="text-xs text-textSecondary">Los precios se configuran en la tabla de precios del producto (botón "Editar precios").</p>
          <label className="space-y-2 text-sm text-textSecondary">
            Nombre del producto
            <input value={newProducto.nombre} onChange={(e) => setNewProducto((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Remera, Pantalón, Campera..."
              className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-2 text-sm text-textSecondary">
              Categoría
              <input value={newProducto.categoria} onChange={(e) => setNewProducto((p) => ({ ...p, categoria: e.target.value }))}
                placeholder="Ej: Indumentaria"
                className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent" />
            </label>
            <label className="space-y-2 text-sm text-textSecondary">
              Talle
              <input value={newProducto.talle} onChange={(e) => setNewProducto((p) => ({ ...p, talle: e.target.value }))}
                placeholder="Ej: S, M, L, XL, 38..."
                className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent" />
            </label>
          </div>
          <label className="space-y-2 text-sm text-textSecondary">
            Color
            <input value={newProducto.color} onChange={(e) => setNewProducto((p) => ({ ...p, color: e.target.value }))}
              placeholder="Ej: Rojo, Negro, Blanco..."
              className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent" />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setProductModalOpen(false); setProductEdit(null); setNewProducto({ nombre: '', categoria: '', talle: '', color: '' }); }}
              className="rounded-3xl bg-panel px-5 py-3 text-sm font-semibold text-textPrimary ring-1 ring-border hover:bg-surface">
              Cancelar
            </button>
            <button type="button" onClick={handleProductSave}
              className="rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-600">
              {productEdit ? 'Actualizar' : 'Guardar variante'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de matriz de precios */}
      <Modal
        title={priceMatrixGroup ? `Precios — ${priceMatrixGroup.split('||')[0]}` : ''}
        open={priceMatrixGroup !== null}
        onClose={() => { setPriceMatrixGroup(null); setEditingPriceMap({}); }}
      >
        {priceMatrixGroup && (() => {
          const [nombre, categoria] = priceMatrixGroup.split('||');
          const variants = productos.filter(p => p.nombre === nombre && p.categoria === categoria);
          return (
            <div>
              <p className="text-sm text-textSecondary mb-4">
                <span className="capitalize">{categoria}</span> · Editá el precio para cada talle y lista. Los cambios se guardan automáticamente.
              </p>
              {listasPrecios.length === 0 ? (
                <div className="rounded-3xl bg-surface p-6 text-center text-textSecondary">
                  No hay listas de precios configuradas. Creá una en la sección "Listas de precios".
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-surface">
                        <th className="px-3 py-3 text-left text-textSecondary font-medium">Talle / Color</th>
                        {listasPrecios.map(lista => (
                          <th key={lista.id} className="px-3 py-3 text-left text-textSecondary font-medium min-w-[110px]">{lista.nombre}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map(variant => (
                        <tr key={variant.id} className="border-t border-border">
                          <td className="px-3 py-3 font-medium text-textPrimary">
                            {variant.talle}
                            {variant.color && <span className="ml-1 text-xs text-textSecondary">· {variant.color}</span>}
                          </td>
                          {listasPrecios.map(lista => {
                            const existingPP = productPrices.find(pp => pp.productoId === variant.id && pp.listaId === lista.id);
                            const localVal = editingPriceMap[variant.id]?.[lista.id];
                            const displayVal = localVal !== undefined ? localVal : (existingPP?.precio ? existingPP.precio.toString() : '');
                            const isEmpty = !displayVal || displayVal === '0';
                            return (
                              <td key={lista.id} className="px-3 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  value={displayVal}
                                  placeholder="—"
                                  onChange={(e) => {
                                    setEditingPriceMap(prev => ({
                                      ...prev,
                                      [variant.id]: { ...(prev[variant.id] ?? {}), [lista.id]: e.target.value },
                                    }));
                                  }}
                                  onBlur={async (e) => {
                                    const val = e.target.value.trim();
                                    if (val === '' || val === undefined) return;
                                    const precio = Number(val);
                                    try {
                                      await upsertProductPrice(variant.id, lista.id, precio);
                                      setProductPrices(prev => {
                                        const filtered = prev.filter(pp => !(pp.productoId === variant.id && pp.listaId === lista.id));
                                        return [...filtered, { productoId: variant.id, listaId: lista.id, precio }];
                                      });
                                    } catch (err: any) {
                                      error(`Error guardando precio: ${err.message}`);
                                    }
                                  }}
                                  className={`w-28 rounded-xl border px-3 py-2 text-sm text-textPrimary outline-none transition focus:border-accent ${isEmpty ? 'border-yellow-600/50 bg-yellow-900/10' : 'border-border bg-surface'}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-4 text-xs text-textSecondary">Los precios en amarillo están sin definir. Al salir de la celda se guarda automáticamente.</p>
            </div>
          );
        })()}
      </Modal>

      <Modal title="Registrar pago" open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)}>
        <div className="space-y-4">
          <label className="space-y-2 text-sm text-textSecondary">
            Cliente
            <select
              value={paymentClienteId}
              onChange={(e) => setPaymentClienteId(e.target.value)}
              className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
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
                className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
              />
            </label>
            <label className="space-y-2 text-sm text-textSecondary">
              Monto
              <input
                type="number"
                min={0}
                value={formatNumberInput(paymentAmount)}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
              />
            </label>
          </div>
          <label className="space-y-2 text-sm text-textSecondary">
            Forma de pago
            <select
              value={paymentForm}
              onChange={(e) => setPaymentForm(e.target.value as FormaPago)}
              className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
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
              className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
            />
          </label>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="rounded-3xl bg-panel px-5 py-3 text-sm font-semibold text-textPrimary shadow-sm ring-1 ring-border transition hover:bg-surface"
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

      {/* Modal de detalles de factura */}
      <Modal
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title="Detalles de la Factura"
      >
        {selectedInvoice && (() => {
          const factura = facturas.find(f => f.id === selectedInvoice);
          const cliente = clientes.find(c => c.id === factura?.clienteId);
          if (!factura || !cliente) return null;

          return (
            <div className="space-y-6">
              {/* Info principal */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="rounded-3xl bg-surface p-4">
                  <h4 className="font-semibold text-textPrimary">Cliente</h4>
                  <p className="text-textSecondary">{cliente.nombre}</p>
                  <p className="text-sm text-textSecondary">{cliente.email}</p>
                  <p className="text-sm text-textSecondary">{cliente.tel}</p>
                </div>
                <div className="rounded-3xl bg-surface p-4">
                  <h4 className="font-semibold text-textPrimary">Factura</h4>
                  <p className="text-textSecondary">#{factura.id.slice(-8).toUpperCase()}</p>
                  <p className="text-sm text-textSecondary">{factura.fecha}</p>
                  <p className="font-semibold text-accent">{formatMoney(factura.total)}</p>
                </div>
              </div>

              {/* Productos */}
              <div>
                <h4 className="font-semibold text-textPrimary mb-4">Productos facturados</h4>
                <div className="overflow-hidden rounded-3xl border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-surface text-textSecondary">
                      <tr>
                        <th className="px-4 py-3 text-left">Producto</th>
                        <th className="px-4 py-3 text-right">Cant.</th>
                        <th className="px-4 py-3 text-right">Precio</th>
                        <th className="px-4 py-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {factura.items.map((item, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.nombre}</div>
                            <div className="text-xs text-textSecondary">
                              {item.categoria} • {item.talle} • {item.color}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">{item.cant}</td>
                          <td className="px-4 py-3 text-right">{formatMoney(item.precio)}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatMoney(item.cant * item.precio)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-border bg-surface">
                        <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                          TOTAL:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-accent">
                          {formatMoney(factura.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notas */}
              {factura.notas && (
                <div className="rounded-2xl bg-surface p-4">
                  <p className="text-xs font-semibold text-textSecondary mb-1">Notas</p>
                  <p className="text-sm text-textPrimary">{factura.notas}</p>
                </div>
              )}

              {/* Acciones */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => printInvoice(factura, cliente)}
                  className="rounded-3xl bg-blue-900 px-5 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-800"
                >
                  🖨️ Imprimir comprobante
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="rounded-3xl bg-surface px-5 py-3 text-sm font-semibold text-textPrimary transition hover:bg-border"
                >
                  Cerrar
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal deuda total — lista de clientes con saldo > 0 */}
      <Modal
        title="Clientes con deuda pendiente"
        open={resumenDeudaOpen}
        onClose={() => setResumenDeudaOpen(false)}
      >
        {clientesConDeudaDetalle.length === 0 ? (
          <p className="text-sm text-textSecondary py-4 text-center">No hay clientes con saldo pendiente.</p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface text-textSecondary">
                  <tr>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-right">Saldo pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesConDeudaDetalle.map(({ cliente, saldo }) => (
                    <tr key={cliente.id} className="border-t border-border hover:bg-surface">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => { setSelectedClientId(cliente.id); setResumenDeudaOpen(false); setPage('cuenta'); }}
                          className="text-left hover:text-accent transition"
                        >
                          <span className="font-medium">{cliente.nombre}</span>
                          {cliente.tel && <span className="ml-2 text-xs text-textSecondary">{cliente.tel}</span>}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-400">{formatMoney(saldo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-surface">
                    <td className="px-4 py-3 font-semibold text-textSecondary">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-red-400">
                      {formatMoney(clientesConDeudaDetalle.reduce((s, x) => s + x.saldo, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-xs text-textSecondary text-center">
              {clientesConDeudaDetalle.length} cliente{clientesConDeudaDetalle.length !== 1 ? 's' : ''} con deuda · click en el nombre para ver su cuenta
            </p>
          </div>
        )}
      </Modal>

      {/* Modal detalle de pago individual */}
      <Modal
        title="Detalle del pago"
        open={!!resumenPagoDetalle}
        onClose={() => setResumenPagoDetalle(null)}
      >
        {resumenPagoDetalle && (() => {
          const cli = clientes.find(c => c.id === resumenPagoDetalle.clienteId);
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-surface p-4">
                  <p className="text-xs text-textSecondary mb-1">Cliente</p>
                  <p className="font-semibold text-textPrimary">{cli?.nombre ?? 'Cliente eliminado'}</p>
                  {cli?.tel && <p className="text-xs text-textSecondary mt-1">{cli.tel}</p>}
                </div>
                <div className="rounded-2xl bg-surface p-4">
                  <p className="text-xs text-textSecondary mb-1">Monto</p>
                  <p className="text-2xl font-bold text-green-400">{formatMoney(resumenPagoDetalle.monto)}</p>
                </div>
                <div className="rounded-2xl bg-surface p-4">
                  <p className="text-xs text-textSecondary mb-1">Fecha</p>
                  <p className="font-medium text-textPrimary">{resumenPagoDetalle.fecha}</p>
                </div>
                <div className="rounded-2xl bg-surface p-4">
                  <p className="text-xs text-textSecondary mb-1">Forma de pago</p>
                  <p className="font-medium text-textPrimary">{resumenPagoDetalle.forma}</p>
                </div>
              </div>
              {resumenPagoDetalle.notas && (
                <div className="rounded-2xl bg-surface p-4">
                  <p className="text-xs text-textSecondary mb-1">Notas</p>
                  <p className="text-sm text-textPrimary">{resumenPagoDetalle.notas}</p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { if (cli) { setSelectedClientId(cli.id); setResumenPagoDetalle(null); setPage('cuenta'); } }}
                  disabled={!cli}
                  className="rounded-3xl bg-surface px-5 py-2 text-sm font-medium text-textPrimary ring-1 ring-border transition hover:bg-border disabled:opacity-40"
                >
                  Ver cuenta del cliente
                </button>
                <button
                  type="button"
                  onClick={() => setResumenPagoDetalle(null)}
                  className="rounded-3xl bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
                >
                  Cerrar
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
        </div>
      )}

      {/* Modal exportar deudores */}
      {exportDeudoresModalOpen && (
        <Modal title="Exportar deudores" open={exportDeudoresModalOpen} onClose={() => setExportDeudoresModalOpen(false)}>
          <p className="text-sm text-textSecondary mb-6">{clientesConDeudaDetalle.length} clientes con saldo pendiente, ordenados de mayor a menor deuda.</p>
          <div className="flex gap-3">
            <button onClick={() => { exportDeudoresPDF(); setExportDeudoresModalOpen(false); }}
              className="flex-1 rounded-3xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700">
              Descargar PDF
            </button>
            <button onClick={() => { exportDeudoresExcel(); setExportDeudoresModalOpen(false); }}
              className="flex-1 rounded-3xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700">
              Descargar Excel
            </button>
          </div>
        </Modal>
      )}

      {/* Modal exportar lista de precios */}
      {exportPreciosModalOpen && (
        <Modal title="Exportar lista de precios" open={exportPreciosModalOpen} onClose={() => setExportPreciosModalOpen(false)}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-textSecondary mb-1">Lista de precios</label>
            <select value={exportPreciosLista} onChange={e => setExportPreciosLista(e.target.value)}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none focus:border-accent">
              {listasPrecios.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { exportPreciosPDF(exportPreciosLista); setExportPreciosModalOpen(false); }}
              className="flex-1 rounded-3xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700">
              Descargar PDF
            </button>
            <button onClick={() => { exportPreciosExcel(exportPreciosLista); setExportPreciosModalOpen(false); }}
              className="flex-1 rounded-3xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700">
              Descargar Excel
            </button>
          </div>
        </Modal>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
}

export default App;
