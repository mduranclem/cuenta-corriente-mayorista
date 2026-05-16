import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Modal } from './components/Modal';
import { Toast } from './components/Toast';
import { useToast } from './hooks/useToast';
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
  registrarAccion,
  obtenerAuditoria,
  verificarPrimerAdmin,
  crearPrimerAdmin,
  registrarUsuario,
  autenticarUsuario,
  obtenerUsuariosPendientes,
  aprobarUsuario,
  rechazarUsuario,
} from './lib/storage';

type Page = 'dashboard' | 'clientes' | 'cuenta' | 'historial' | 'nuevo-cliente' | 'productos' | 'backup' | 'login' | 'admin';

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
const printInvoice = (factura: Factura, cliente: Cliente) => {
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Factura ${factura.id}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: white; color: black; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .invoice-title { font-size: 18px; color: #666; }
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
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">CUENTA CORRIENTE MAYORISTA</div>
        <div class="invoice-title">Comprobante de Factura</div>
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
          ${factura.items.map(item => `
            <tr>
              <td><strong>${item.nombre}</strong></td>
              <td>${item.categoria} • ${item.talle} • ${item.color}</td>
              <td class="text-right">${item.cant}</td>
              <td class="text-right">${formatMoney(item.precio)}</td>
              <td class="text-right">${formatMoney(item.cant * item.precio)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4" class="text-right"><strong>TOTAL GENERAL</strong></td>
            <td class="text-right"><strong>${formatMoney(factura.total)}</strong></td>
          </tr>
        </tbody>
      </table>

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
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
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

  // Verificar primer admin al cargar
  useEffect(() => {
    const checkFirstAdmin = async () => {
      try {
        const needsAdmin = await verificarPrimerAdmin();
        setNeedsFirstAdmin(needsAdmin);
        if (needsAdmin) {
          setAuthMode('first-admin');
          setPage('login');
        }
      } catch (error) {
        console.error('Error verificando primer admin:', error);
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
        setPage('dashboard');
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

  useEffect(() => {
    // Solo cargar datos si hay un usuario logueado
    if (!currentUser) return;

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
              query: '',
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
    if (!text) return productos; // Mostrar todos los productos si no hay búsqueda
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

    // Registrar auditoría
    if (currentUser) {
      await registrarAccion(
        currentUser,
        'Crear factura',
        'factura',
        factura.id,
        `Factura por ${formatMoney(factura.total)} para ${invoiceClienteActual?.nombre}`
      );
    }

    setRows([
      { rowKey: 'r0', prodId: '', nombre: '', categoria: '', talle: '', color: '', cant: 1, precio: 0, query: '' },
    ]);
    setInvoiceDate(today);
    success('Factura creada exitosamente');
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
      success('Cliente actualizado exitosamente');
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

      // Registrar auditoría
      if (currentUser) {
        await registrarAccion(
          currentUser,
          editingClient ? 'Editar cliente' : 'Agregar cliente',
          'cliente',
          cliente.id,
          `Cliente: ${cliente.nombre} (${cliente.cat})`
        );
      }

      success(editingClient ? 'Cliente actualizado exitosamente' : 'Cliente agregado exitosamente');
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

    // Registrar auditoría
    if (currentUser) {
      await registrarAccion(
        currentUser,
        'Eliminar cliente',
        'cliente',
        clientId,
        `Cliente: ${client?.nombre || 'Desconocido'}`
      );
    }

    success('Cliente eliminado exitosamente');

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

    // Registrar auditoría
    if (currentUser) {
      const cliente = clientes.find(c => c.id === paymentClienteId);
      await registrarAccion(
        currentUser,
        'Registrar pago',
        'pago',
        pago.id,
        `${formatMoney(paymentAmount)} (${paymentForm}) - ${cliente?.nombre || 'Cliente desconocido'}`
      );
    }

    setPaymentModalOpen(false);
    setPaymentAmount(0);
    setPaymentNotes('');
    success('Pago registrado exitosamente');
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
      success('Producto actualizado exitosamente');
    } else {
      const nuevo: Producto = {
        id: `p${Date.now()}`,
        ...trimmed,
      };
      const nextProductos = [nuevo, ...productos];
      setProductos(nextProductos);
      await saveProductos(nextProductos);

      // Registrar auditoría
      if (currentUser) {
        await registrarAccion(
          currentUser,
          productEdit ? 'Editar producto' : 'Agregar producto',
          'producto',
          nuevo.id,
          `${nuevo.nombre} - ${nuevo.categoria} (${formatMoney(nuevo.precio)})`
        );
      }

      success(productEdit ? 'Producto actualizado exitosamente' : 'Producto agregado exitosamente');
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
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    if (!window.confirm(`¿Estás seguro de eliminar "${producto.nombre}"?`)) return;

    const next = productos.filter((item) => item.id !== id);
    setProductos(next);
    await saveProductos(next);

    // Registrar auditoría
    if (currentUser) {
      await registrarAccion(
        currentUser,
        'Eliminar producto',
        'producto',
        id,
        `${producto?.nombre || 'Desconocido'} - ${producto?.categoria || ''}`
      );
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
    try {
      const userData = await autenticarUsuario(loginUsername, loginPassword);
      setCurrentUser(userData.username);
      setCurrentUserData(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      setPage('dashboard');
      setLoginUsername('');
      setLoginPassword('');
      success(`Bienvenido ${userData.username}!`);
      await registrarAccion(userData.username, 'Inicio de sesión', 'cliente');
    } catch (error: any) {
      error(error.message || 'Error al iniciar sesión');
    }
  };

  const handleFirstAdminCreate = async () => {
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

    try {
      const userData = await crearPrimerAdmin(registerUsername, registerEmail, registerPassword);
      setCurrentUser(userData.username);
      setCurrentUserData(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      setNeedsFirstAdmin(false);
      setPage('dashboard');
      setRegisterUsername('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      success(`Administrador creado exitosamente. Bienvenido ${userData.username}!`);
      await registrarAccion(userData.username, 'Primer administrador creado', 'cliente');
    } catch (error: any) {
      error(error.message || 'Error creando administrador');
    }
  };

  const handleRegister = async () => {
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

    try {
      await registrarUsuario(registerUsername, registerEmail, registerPassword);
      setRegisterUsername('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setAuthMode('login');
      success('Registro exitoso. Tu cuenta está pendiente de aprobación por el administrador.');
    } catch (error: any) {
      error(error.message || 'Error en el registro');
    }
  };

  const handleAprobarUsuario = async (userId: string) => {
    try {
      await aprobarUsuario(userId, currentUserData.username);
      await loadUsuariosPendientes();
      success('Usuario aprobado exitosamente');
      await registrarAccion(currentUserData.username, 'Usuario aprobado', 'cliente', userId);
    } catch (error: any) {
      error(error.message || 'Error aprobando usuario');
    }
  };

  const handleRechazarUsuario = async (userId: string) => {
    try {
      await rechazarUsuario(userId, currentUserData.username);
      await loadUsuariosPendientes();
      success('Usuario rechazado');
      await registrarAccion(currentUserData.username, 'Usuario rechazado', 'cliente', userId);
    } catch (error: any) {
      error(error.message || 'Error rechazando usuario');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserData(null);
    localStorage.removeItem('currentUser');
    setPage('login');
    setAuthMode('login');
    success('Sesión cerrada correctamente');
  };

  const productList = productos.filter((item) =>
    [item.nombre, item.categoria, item.talle, item.color].some((value) =>
      value.toLowerCase().includes(productFilter.toLowerCase())
    )
  );

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
                    className="w-full rounded-3xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                  >
                    Crear administrador
                  </button>
                </div>
              )}

              {authMode === 'login' && !needsFirstAdmin && (
                <div className="space-y-4">
                  <label className="space-y-2 text-sm text-textSecondary">
                    Usuario
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      placeholder="Ingresa tu usuario"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-textSecondary">
                    Contraseña
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      placeholder="Ingresa tu contraseña"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleLogin}
                    className="w-full rounded-3xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                  >
                    Iniciar sesión
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className="text-sm text-accent hover:text-indigo-400 transition"
                    >
                      ¿No tienes cuenta? Regístrate
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'register' && !needsFirstAdmin && (
                <div className="space-y-4">
                  <div className="rounded-3xl bg-yellow-900/20 border border-yellow-600/30 p-4">
                    <h3 className="font-semibold text-yellow-300 mb-2">📝 Registro de usuario</h3>
                    <p className="text-sm text-yellow-200">Tu cuenta quedará pendiente de aprobación</p>
                  </div>

                  <label className="space-y-2 text-sm text-textSecondary">
                    Nombre de usuario
                    <input
                      type="text"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      placeholder="usuario123"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-textSecondary">
                    Email
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      placeholder="usuario@email.com"
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
                      onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      placeholder="Repetir contraseña"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleRegister}
                    className="w-full rounded-3xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                  >
                    Registrarse
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-sm text-accent hover:text-indigo-400 transition"
                    >
                      ¿Ya tienes cuenta? Inicia sesión
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
            <main className="flex-1 px-4 py-6 lg:px-10">
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

          {page === 'dashboard' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
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
                        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
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
                        className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-6 overflow-hidden rounded-3xl border border-border">
                  <div className="grid grid-cols-[2fr_80px_120px_120px_80px] gap-4 bg-surface px-5 py-4 text-sm uppercase tracking-[0.12em] text-textSecondary">
                    <span>Producto</span>
                    <span>Cant.</span>
                    <span>Precio</span>
                    <span>Subtotal</span>
                    <span></span>
                  </div>
                  <div className="divide-y divide-slate-200 bg-panel">
                    {rows.map((row) => {
                      const matches = filteredProducts(row.query || '');
                      return (
                        <div key={row.rowKey} className="grid grid-cols-[2fr_80px_120px_120px_80px] gap-4 px-5 py-4 items-start">
                          <div className="relative">
                            <input
                              value={row.query}
                              onChange={(event) => handleRowChange(row.rowKey, 'query', event.target.value)}
                              placeholder="Buscar producto..."
                              className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm outline-none transition focus:border-accent"
                            />
                            {matches.length > 0 && (
                              <div className="absolute left-0 top-full z-20 mt-2 max-h-60 w-full overflow-auto rounded-3xl border border-border bg-panel shadow-xl">
                                {matches.slice(0, 6).map((product) => (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => updateRowProduct(row.rowKey, product)}
                                    className="w-full px-4 py-3 text-left text-sm text-textPrimary transition hover:bg-surface"
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
                          <div className="flex items-center text-sm text-textPrimary">
                            {formatMoney(row.precio * row.cant)}
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
                <div className="mt-6 flex flex-col gap-4 rounded-3xl bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center justify-center rounded-3xl bg-panel px-5 py-3 text-sm font-medium text-textPrimary shadow-sm ring-1 ring-border transition hover:bg-surface"
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
              <div className="rounded-3xl bg-panel p-6 shadow-panel">
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
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm min-w-[700px]">
                      <thead className="bg-surface text-textSecondary">
                        <tr>
                          <th className="px-3 py-4 text-left sm:px-5">Nombre</th>
                          <th className="px-3 py-4 text-left sm:px-5 hidden sm:table-cell">Categoría</th>
                          <th className="px-3 py-4 text-left sm:px-5 hidden md:table-cell">Teléfono</th>
                          <th className="px-3 py-4 text-left sm:px-5">Saldo</th>
                          <th className="px-3 py-4 text-left sm:px-5 hidden lg:table-cell">Último pago</th>
                          <th className="px-3 py-4 text-left sm:px-5">Acciones</th>
                        </tr>
                      </thead>
                    <tbody>
                      {clientes.map((cliente) => {
                        const clienteFacturas = facturas.filter((factura) => factura.clienteId === cliente.id);
                        const clientePagos = pagos.filter((p) => p.clienteId === cliente.id);
                        const total = clienteFacturas.reduce((sum, factura) => sum + factura.total, 0) - clientePagos.reduce((sum, pago) => sum + pago.monto, 0);
                        const lastPago = clientePagos.map((p) => p.fecha).sort().reverse()[0] || '—';
                        return (
                          <tr key={cliente.id} className="border-t border-border hover:bg-surface">
                            <td
                              className="cursor-pointer px-3 py-4 sm:px-5"
                              onClick={() => {
                                setSelectedClientId(cliente.id);
                                setPage('cuenta');
                              }}
                            >
                              <div className="font-medium">{cliente.nombre}</div>
                              <div className="mt-1 text-xs text-textSecondary">{cliente.email}</div>
                              <div className="mt-1 text-xs text-textSecondary sm:hidden">
                                {cliente.cat} • {cliente.tel}
                              </div>
                            </td>
                            <td className="px-3 py-4 capitalize text-textSecondary sm:px-5 hidden sm:table-cell">{cliente.cat}</td>
                            <td className="px-3 py-4 text-textSecondary sm:px-5 hidden md:table-cell">{cliente.tel}</td>
                            <td className="px-3 py-4 font-semibold sm:px-5">{formatMoney(total)}</td>
                            <td className="px-3 py-4 text-textSecondary sm:px-5 hidden lg:table-cell">{lastPago}</td>
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
                              <div className="flex gap-2">
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
                                  👁️ Ver detalles
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
                    Categoría de precios
                    <select
                      value={newClientCat}
                      onChange={(e) => setNewClientCat(e.target.value as 'general' | 'especial')}
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
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
                      className="w-full rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
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
                    <p className="mt-1 text-sm text-textSecondary">Administra prendas, talles y precios con filtros claros.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      placeholder="Buscar producto"
                      className="rounded-3xl border border-border bg-surface px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProductEdit(null);
                        setNewProducto({ nombre: '', categoria: '', talle: '', color: '', precio: 0, precioEsp: 0 });
                        success('Formulario listo para nuevo producto');
                        // Hacer scroll al formulario
                        setTimeout(() => {
                          const formulario = document.getElementById('formulario-producto');
                          if (formulario) {
                            formulario.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }, 100);
                      }}
                      className="rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                    >
                      Nuevo producto
                    </button>
                  </div>
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
                  <div className="overflow-hidden rounded-3xl border border-border">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm min-w-[600px]">
                        <thead className="bg-surface text-textSecondary">
                          <tr>
                            <th className="px-3 py-4 text-left sm:px-5">Nombre</th>
                            <th className="px-3 py-4 text-left sm:px-5 hidden sm:table-cell">Categoría</th>
                            <th className="px-3 py-4 text-left sm:px-5 hidden md:table-cell">Talle</th>
                            <th className="px-3 py-4 text-left sm:px-5 hidden md:table-cell">Color</th>
                            <th className="px-3 py-4 text-left sm:px-5">Precios</th>
                            <th className="px-3 py-4 sm:px-5"></th>
                          </tr>
                        </thead>
                      <tbody>
                        {productList.map((item) => (
                          <tr key={item.id} className="border-t border-border hover:bg-surface">
                            <td className="px-3 py-4 sm:px-5">
                              <div className="font-medium">{item.nombre}</div>
                              <div className="mt-1 text-xs text-textSecondary sm:hidden">
                                {item.categoria} • {item.talle} • {item.color}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-textSecondary capitalize sm:px-5 hidden sm:table-cell">{item.categoria}</td>
                            <td className="px-3 py-4 text-textSecondary sm:px-5 hidden md:table-cell">{item.talle}</td>
                            <td className="px-3 py-4 text-textSecondary sm:px-5 hidden md:table-cell">{item.color}</td>
                            <td className="px-3 py-4 text-textSecondary sm:px-5">
                              {formatMoney(item.precio)}{item.precioEsp ? ` / ${formatMoney(item.precioEsp)}` : ''}
                            </td>
                            <td className="px-3 py-4 text-right sm:px-5">
                              <button
                                type="button"
                                onClick={() => handleProductEdit(item)}
                                className="mr-2 rounded-3xl bg-surface px-3 py-2 text-xs text-textPrimary transition hover:bg-border"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleProductDelete(item.id)}
                                className="rounded-3xl bg-red-900 px-3 py-2 text-xs text-red-600 transition hover:bg-red-900"
                              >
                                Borrar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                  <div id="formulario-producto" className="rounded-3xl border border-border bg-surface p-6">
                    <h4 className="text-xl font-semibold">{productEdit ? 'Editar producto' : 'Agregar producto'}</h4>
                    <div className="mt-6 space-y-4">
                      <label className="space-y-2 text-sm text-textSecondary">
                        Nombre
                        <input
                          value={newProducto.nombre}
                          onChange={(e) => setNewProducto((prev) => ({ ...prev, nombre: e.target.value }))}
                          className="w-full rounded-3xl border border-border bg-panel px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <label className="space-y-2 text-sm text-textSecondary">
                          Categoría
                          <input
                            value={newProducto.categoria}
                            onChange={(e) => setNewProducto((prev) => ({ ...prev, categoria: e.target.value }))}
                            className="w-full rounded-3xl border border-border bg-panel px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                          />
                        </label>
                        <label className="space-y-2 text-sm text-textSecondary">
                          Talle
                          <input
                            value={newProducto.talle}
                            onChange={(e) => setNewProducto((prev) => ({ ...prev, talle: e.target.value }))}
                            className="w-full rounded-3xl border border-border bg-panel px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                          />
                        </label>
                      </div>
                      <label className="space-y-2 text-sm text-textSecondary">
                        Color
                        <input
                          value={newProducto.color}
                          onChange={(e) => setNewProducto((prev) => ({ ...prev, color: e.target.value }))}
                          className="w-full rounded-3xl border border-border bg-panel px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-textSecondary">
                        Precio general
                        <input
                          type="number"
                          value={formatNumberInput(newProducto.precio)}
                          onChange={(e) => setNewProducto((prev) => ({ ...prev, precio: Number(e.target.value) }))}
                          className="w-full rounded-3xl border border-border bg-panel px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-textSecondary">
                        Precio especial
                        <input
                          type="number"
                          value={formatNumberInput(newProducto.precioEsp)}
                          onChange={(e) => setNewProducto((prev) => ({ ...prev, precioEsp: Number(e.target.value) }))}
                          className="w-full rounded-3xl border border-border bg-panel px-4 py-3 text-sm text-textPrimary outline-none transition focus:border-accent"
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
                          className="rounded-3xl bg-panel px-5 py-3 text-sm font-semibold text-textPrimary shadow-sm ring-1 ring-border transition hover:bg-surface"
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
                                onClick={() => handleAprobarUsuario(usuario.id)}
                                className="rounded-3xl bg-green-700 px-4 py-2 text-sm font-semibold text-green-100 transition hover:bg-green-600"
                              >
                                ✅ Aprobar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRechazarUsuario(usuario.id)}
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
            </section>
          )}

          <Toast toasts={toasts} onRemove={removeToast} />
        </main>
      </div>

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
        </div>
      )}
    </>
  );
}

export default App;
