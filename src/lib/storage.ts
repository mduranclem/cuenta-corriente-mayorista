import type { Cliente, Factura, ListaPrecio, Pago, ProductPrice, Producto, Presupuesto } from '../types';
import { supabase } from './supabase';

export interface BackupPayload {
  clientes: Cliente[];
  productos: Producto[];
  facturas: Factura[];
  pagos: Pago[];
}

const LISTAS_PRECIOS_KEY = 'cc_listas_precios';

const LISTAS_FALLBACK: ListaPrecio[] = [
  { id: 'general', nombre: 'General' },
  { id: 'especial', nombre: 'Especial' },
];

export async function loadListasPrecios(): Promise<ListaPrecio[]> {
  try {
    const { data, error } = await supabase
      .from('listas_precios')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(r => ({ id: r.id, nombre: r.nombre }));
  } catch {
    // Fallback: migrate from localStorage if available
    try {
      const saved = localStorage.getItem(LISTAS_PRECIOS_KEY);
      if (saved) {
        const listas = JSON.parse(saved) as any[];
        return listas.map(l => ({ id: l.id, nombre: l.nombre }));
      }
    } catch { /* ignore */ }
    return LISTAS_FALLBACK;
  }
}

export async function saveListaPrecio(lista: ListaPrecio): Promise<void> {
  const { error } = await supabase
    .from('listas_precios')
    .upsert({ id: lista.id, nombre: lista.nombre });
  if (error) throw error;
}

export async function deleteListaPrecio(id: string): Promise<void> {
  const { error } = await supabase
    .from('listas_precios')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function loadProductPrices(): Promise<ProductPrice[]> {
  try {
    const { data, error } = await supabase
      .from('product_prices')
      .select('*');
    if (error) throw error;
    return (data || []).map(r => ({
      productoId: r.producto_id,
      listaId: r.lista_id,
      precio: parseFloat(r.precio),
    }));
  } catch {
    return [];
  }
}

export async function upsertProductPrice(productoId: string, listaId: string, precio: number): Promise<void> {
  const { error } = await supabase
    .from('product_prices')
    .upsert({ producto_id: productoId, lista_id: listaId, precio });
  if (error) throw error;
}

// Convertir tipos de la app a tipos de la BD
function clienteToDatabase(cliente: Cliente) {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    tel: cliente.tel,
    email: cliente.email,
    cat: cliente.cat,
    notas: cliente.notas,
  };
}

function databaseToCliente(row: any): Cliente {
  return {
    id: row.id,
    nombre: row.nombre,
    tel: row.tel || '',
    email: row.email || '',
    cat: row.cat,
    notas: row.notas || '',
  };
}

function productoToDatabase(producto: Producto) {
  return {
    id: producto.id,
    nombre: producto.nombre,
    categoria: producto.categoria,
    talle: producto.talle,
    color: producto.color,
    precio: producto.precio,
    precio_esp: producto.precioEsp || null,
  };
}

function databaseToProducto(row: any): Producto {
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    talle: row.talle,
    color: row.color,
    precio: parseFloat(row.precio),
    precioEsp: row.precio_esp ? parseFloat(row.precio_esp) : undefined,
  };
}

function facturaToDatabase(factura: Factura) {
  return {
    id: factura.id,
    cliente_id: factura.clienteId,
    fecha: factura.fecha,
    total: factura.total,
    descuento: factura.descuento ?? null,
    notas: factura.notas || null,
  };
}

function databaseToFactura(facturaRow: any, items: any[]): Factura {
  return {
    id: facturaRow.id,
    clienteId: facturaRow.cliente_id,
    fecha: facturaRow.fecha,
    total: parseFloat(facturaRow.total),
    descuento: facturaRow.descuento != null ? parseFloat(facturaRow.descuento) : undefined,
    notas: facturaRow.notas || '',
    items: items.map(item => ({
      prodId: item.prod_id,
      nombre: item.nombre,
      categoria: item.categoria,
      talle: item.talle,
      color: item.color,
      cant: item.cant,
      precio: parseFloat(item.precio),
    })),
  };
}

function pagoToDatabase(pago: Pago) {
  return {
    id: pago.id,
    cliente_id: pago.clienteId,
    fecha: pago.fecha,
    monto: pago.monto,
    forma: pago.forma,
    notas: pago.notas || null,
  };
}

function databaseToPago(row: any): Pago {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    fecha: row.fecha,
    monto: parseFloat(row.monto),
    forma: row.forma,
    notas: row.notas || '',
  };
}

// Funciones principales de carga
export async function loadClientes(): Promise<Cliente[]> {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(databaseToCliente);
  } catch (error) {
    console.error('Error loading clientes:', error);
    return [];
  }
}

export async function loadProductos(): Promise<Producto[]> {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(databaseToProducto);
  } catch (error) {
    console.error('Error loading productos:', error);
    return [];
  }
}

export async function loadFacturas(): Promise<Factura[]> {
  try {
    // Cargar facturas con sus items
    const { data: facturasData, error: facturasError } = await supabase
      .from('facturas')
      .select('*')
      .order('created_at', { ascending: false });

    if (facturasError) throw facturasError;

    if (!facturasData || facturasData.length === 0) return [];

    // Cargar todos los items de facturas
    const { data: itemsData, error: itemsError } = await supabase
      .from('factura_items')
      .select('*');

    if (itemsError) throw itemsError;

    // Agrupar items por factura
    const itemsByFactura = (itemsData || []).reduce((acc: any, item: any) => {
      if (!acc[item.factura_id]) acc[item.factura_id] = [];
      acc[item.factura_id].push(item);
      return acc;
    }, {});

    return facturasData.map(factura =>
      databaseToFactura(factura, itemsByFactura[factura.id] || [])
    );
  } catch (error) {
    console.error('Error loading facturas:', error);
    return [];
  }
}

export async function loadPagos(): Promise<Pago[]> {
  try {
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(databaseToPago);
  } catch (error) {
    console.error('Error loading pagos:', error);
    return [];
  }
}

// Funciones atómicas (operan sobre un registro a la vez — SEGURAS)
export async function saveCliente(cliente: Cliente): Promise<void> {
  const { error } = await supabase.from('clientes').upsert(clienteToDatabase(cliente));
  if (error) throw error;
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw error;
}

export async function saveProducto(producto: Producto): Promise<void> {
  const { error } = await supabase.from('productos').upsert(productoToDatabase(producto));
  if (error) throw error;
}

export async function deleteProducto(id: string): Promise<void> {
  const { error } = await supabase.from('productos').delete().eq('id', id);
  if (error) throw error;
}

export async function savePago(pago: Pago): Promise<void> {
  const { error } = await supabase.from('pagos').upsert(pagoToDatabase(pago));
  if (error) throw error;
}

export async function deletePago(id: string): Promise<void> {
  const { error } = await supabase.from('pagos').delete().eq('id', id);
  if (error) throw error;
}

// Solo usar en importBackup — reemplazo total intencional
export async function saveClientes(clientes: Cliente[]) {
  try {
    const { error: deleteError } = await supabase.from('clientes').delete().neq('id', '');
    if (deleteError && deleteError.code !== 'PGRST116') throw deleteError;
    if (clientes.length > 0) {
      const { error: insertError } = await supabase.from('clientes').insert(clientes.map(clienteToDatabase));
      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error saving clientes:', error);
    throw error;
  }
}

// Solo usar en importBackup — reemplazo total intencional
export async function saveProductos(productos: Producto[]) {
  try {
    const { error: deleteError } = await supabase.from('productos').delete().neq('id', '');
    if (deleteError && deleteError.code !== 'PGRST116') throw deleteError;
    if (productos.length > 0) {
      const { error: insertError } = await supabase.from('productos').insert(productos.map(productoToDatabase));
      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error saving productos:', error);
    throw error;
  }
}

// Guardar o actualizar UNA factura (operación atómica segura)
export async function saveFactura(factura: Factura): Promise<void> {
  try {
    const { error: upsertError } = await supabase
      .from('facturas')
      .upsert(facturaToDatabase(factura));
    if (upsertError) throw upsertError;

    // Reemplazar items de ESTA factura
    const { error: deleteItemsError } = await supabase
      .from('factura_items')
      .delete()
      .eq('factura_id', factura.id);
    if (deleteItemsError) throw deleteItemsError;

    if (factura.items.length > 0) {
      const { error: insertItemsError } = await supabase
        .from('factura_items')
        .insert(factura.items.map(item => ({
          factura_id: factura.id,
          prod_id: item.prodId,
          nombre: item.nombre,
          categoria: item.categoria,
          talle: item.talle,
          color: item.color,
          cant: item.cant,
          precio: item.precio,
        })));
      if (insertItemsError) throw insertItemsError;
    }
  } catch (error) {
    console.error('Error saving factura:', error);
    throw error;
  }
}

// Eliminar UNA factura (operación atómica segura)
export async function deleteFactura(id: string): Promise<void> {
  try {
    const { error: deleteItemsError } = await supabase
      .from('factura_items')
      .delete()
      .eq('factura_id', id);
    if (deleteItemsError) throw deleteItemsError;

    const { error: deleteFacturaError } = await supabase
      .from('facturas')
      .delete()
      .eq('id', id);
    if (deleteFacturaError) throw deleteFacturaError;
  } catch (error) {
    console.error('Error deleting factura:', error);
    throw error;
  }
}

// Solo usar en importBackup (restore completo intencional)
export async function saveFacturas(facturas: Factura[]) {
  try {
    const { error: deleteItemsError } = await supabase
      .from('factura_items')
      .delete()
      .neq('id', 0);
    if (deleteItemsError && deleteItemsError.code !== 'PGRST116') throw deleteItemsError;

    const { error: deleteFacturasError } = await supabase
      .from('facturas')
      .delete()
      .neq('id', '');
    if (deleteFacturasError && deleteFacturasError.code !== 'PGRST116') throw deleteFacturasError;

    if (facturas.length > 0) {
      const { error: insertFacturasError } = await supabase
        .from('facturas')
        .insert(facturas.map(facturaToDatabase));
      if (insertFacturasError) throw insertFacturasError;

      const allItems = facturas.flatMap(factura =>
        factura.items.map(item => ({
          factura_id: factura.id,
          prod_id: item.prodId,
          nombre: item.nombre,
          categoria: item.categoria,
          talle: item.talle,
          color: item.color,
          cant: item.cant,
          precio: item.precio,
        }))
      );
      if (allItems.length > 0) {
        const { error: insertItemsError } = await supabase
          .from('factura_items')
          .insert(allItems);
        if (insertItemsError) throw insertItemsError;
      }
    }
  } catch (error) {
    console.error('Error saving facturas:', error);
    throw error;
  }
}

// Solo usar en importBackup — reemplazo total intencional
export async function savePagos(pagos: Pago[]) {
  try {
    const { error: deleteError } = await supabase.from('pagos').delete().neq('id', '');
    if (deleteError && deleteError.code !== 'PGRST116') throw deleteError;
    if (pagos.length > 0) {
      const { error: insertError } = await supabase.from('pagos').insert(pagos.map(pagoToDatabase));
      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error saving pagos:', error);
    throw error;
  }
}

// Funciones de backup
export async function exportBackup(): Promise<BackupPayload> {
  const [clientes, productos, facturas, pagos] = await Promise.all([
    loadClientes(),
    loadProductos(),
    loadFacturas(),
    loadPagos(),
  ]);

  return { clientes, productos, facturas, pagos };
}

export async function importBackup(data: BackupPayload) {
  try {
    // Importar en orden: primero clientes y productos, luego facturas y pagos
    await saveClientes(data.clientes);
    await saveProductos(data.productos);
    await saveFacturas(data.facturas);
    await savePagos(data.pagos);
  } catch (error) {
    console.error('Error importing backup:', error);
    throw error;
  }
}

export function clearStorage() {
  throw new Error('clearStorage no está disponible con Supabase. Use la interfaz de Supabase para limpiar datos.');
}

// Funciones de auditoría
export async function registrarAccion(
  usuario: string,
  accion: string,
  entidad: 'cliente' | 'producto' | 'factura' | 'pago',
  entidadId?: string,
  detalles?: string
) {
  try {
    const { error } = await supabase
      .from('auditoria')
      .insert({
        usuario,
        accion,
        entidad,
        entidad_id: entidadId,
        detalles,
        fecha: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error registrando acción de auditoría:', error);
  }
}

export interface AuditoriaFiltros {
  usuario?: string;
  entidad?: string;
  desde?: string;
  hasta?: string;
}

export async function logAudit(
  usuario: string,
  accion: string,
  entidad: string,
  entidadId: string | undefined,
  antes: Record<string, unknown> | null,
  despues: Record<string, unknown> | null
) {
  try {
    const detalles = JSON.stringify({ v: 2, accion, entidad, antes, despues });
    const { error } = await supabase
      .from('auditoria')
      .insert({
        usuario,
        accion,
        entidad,
        entidad_id: entidadId,
        detalles,
        fecha: new Date().toISOString(),
      });
    if (error) throw error;
  } catch (err) {
    console.error('Error registrando auditoría:', err);
  }
}

export async function obtenerAuditoria(filtros?: AuditoriaFiltros): Promise<any[]> {
  try {
    let query = supabase
      .from('auditoria')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (filtros?.usuario) query = query.ilike('usuario', `%${filtros.usuario}%`);
    if (filtros?.entidad) query = query.eq('entidad', filtros.entidad);
    if (filtros?.desde) query = query.gte('fecha', filtros.desde);
    if (filtros?.hasta) query = query.lte('fecha', filtros.hasta + 'T23:59:59');

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo auditoría:', error);
    return [];
  }
}

// Funciones de usuarios
export async function crearPrimerAdmin(username: string, email: string, password: string) {
  try {
    console.log('🔍 Verificando si ya existen usuarios...');

    // Verificar que no existan usuarios
    const { data: existingUsers, error: checkError } = await supabase
      .from('usuarios')
      .select('id')
      .limit(1);

    console.log('📊 Resultado verificación usuarios:', { existingUsers, checkError });

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error verificando usuarios:', checkError);
      throw checkError;
    }

    if (existingUsers && existingUsers.length > 0) {
      console.log('⚠️ Ya existen usuarios en el sistema');
      throw new Error('Ya existe un administrador en el sistema');
    }

    console.log('✅ No hay usuarios existentes, creando primer admin...');

    // Crear hash simple de contraseña (en producción usar bcrypt)
    const passwordHash = btoa(password);
    const userId = crypto.randomUUID();

    console.log('💾 Insertando usuario en base de datos...', {
      userId,
      username,
      email,
      rol: 'admin',
      estado: 'aprobado'
    });

    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        id: userId,
        username,
        email,
        password_hash: passwordHash,
        rol: 'admin',
        estado: 'aprobado'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error insertando usuario:', error);
      throw error;
    }

    console.log('✅ Usuario creado exitosamente:', data);
    return data;
  } catch (error) {
    console.error('❌ Error general creando primer admin:', error);
    throw error;
  }
}

export async function registrarUsuario(username: string, email: string, password: string, creado_por?: string) {
  try {
    console.log('📝 Iniciando registro de usuario:', { username, email });

    // Verificar que el username no exista
    const { data: existingUsers, error: checkError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('username', username);

    console.log('🔍 Verificación username existente:', { existingUsers, checkError });

    if (existingUsers && existingUsers.length > 0) {
      throw new Error('El nombre de usuario ya existe');
    }

    if (checkError) {
      console.error('❌ Error verificando username:', checkError);
      throw checkError;
    }

    // Crear hash simple de contraseña
    const passwordHash = btoa(password);
    console.log('🔐 Hash de contraseña generado');

    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        id: crypto.randomUUID(),
        username,
        email,
        password_hash: passwordHash,
        rol: 'usuario',
        estado: 'pendiente',
        creado_por
      })
      .select();

    console.log('💾 Resultado inserción usuario:', { data, error });

    if (error) {
      console.error('❌ Error insertando usuario:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No se pudo crear el usuario');
    }

    console.log('✅ Usuario registrado exitosamente:', data[0]);
    return data[0];
  } catch (err: any) {
    console.error('❌ Error general registrando usuario:', err);
    throw err;
  }
}

export async function autenticarUsuario(usernameOrEmail: string, password: string) {
  try {
    console.log('🔍 Autenticando usuario:', usernameOrEmail);
    const passwordHash = btoa(password);
    console.log('🔐 Password hash generado para comparación');

    // Buscar por username O email - hacer dos consultas separadas para mayor compatibilidad
    const input = usernameOrEmail.toLowerCase(); // Convertir a minúsculas para comparación

    // Primero intentar por username (case-insensitive)
    let { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('password_hash', passwordHash)
      .eq('estado', 'aprobado')
      .ilike('username', input);

    console.log('📊 Búsqueda por username:', { data, error, input });

    // Si no encontramos por username, intentar por email
    if (!data || data.length === 0) {
      ({ data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('password_hash', passwordHash)
        .eq('estado', 'aprobado')
        .ilike('email', input));

      console.log('📊 Búsqueda por email:', { data, error, input });
    }

    if (error) {
      console.error('❌ Error de Supabase en autenticación:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('❌ No se encontró usuario con esas credenciales');
      throw new Error('Usuario o contraseña incorrectos');
    }

    const usuario = data[0];
    console.log('✅ Usuario autenticado correctamente:', {
      username: usuario.username,
      email: usuario.email,
      rol: usuario.rol,
      estado: usuario.estado
    });

    return usuario;
  } catch (err: any) {
    console.error('❌ Error general autenticando usuario:', err);
    throw err;
  }
}

export async function obtenerUsuariosPendientes() {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo usuarios pendientes:', error);
    return [];
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolverUUID(usernameOrUuid: string): Promise<string | null> {
  if (UUID_REGEX.test(usernameOrUuid)) return usernameOrUuid;
  try {
    const { data } = await supabase
      .from('usuarios')
      .select('id')
      .eq('username', usernameOrUuid)
      .single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function aprobarUsuario(username: string, aprobadoPor: string) {
  try {
    const aprobadoPorId = await resolverUUID(aprobadoPor);
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        estado: 'aprobado',
        ...(aprobadoPorId ? { aprobado_por: aprobadoPorId } : {}),
        updated_at: new Date().toISOString()
      })
      .eq('username', username)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error aprobando usuario:', error);
    throw error;
  }
}

export async function rechazarUsuario(username: string, aprobadoPor: string) {
  try {
    const aprobadoPorId = await resolverUUID(aprobadoPor);
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        estado: 'rechazado',
        ...(aprobadoPorId ? { aprobado_por: aprobadoPorId } : {}),
        updated_at: new Date().toISOString()
      })
      .eq('username', username)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error rechazando usuario:', error);
    throw error;
  }
}

// Funciones de presupuestos
export async function loadPresupuestos(): Promise<Presupuesto[]> {
  try {
    const { data: presData, error: presError } = await supabase
      .from('presupuestos')
      .select('*')
      .order('created_at', { ascending: false });
    if (presError) throw presError;
    if (!presData || presData.length === 0) return [];

    const { data: itemsData, error: itemsError } = await supabase
      .from('presupuesto_items')
      .select('*');
    if (itemsError) throw itemsError;

    const itemsByPres = (itemsData || []).reduce((acc: any, item: any) => {
      if (!acc[item.presupuesto_id]) acc[item.presupuesto_id] = [];
      acc[item.presupuesto_id].push(item);
      return acc;
    }, {});

    return presData.map(p => ({
      id: p.id,
      clienteId: p.cliente_id,
      fecha: p.fecha,
      total: parseFloat(p.total),
      notas: p.notas || '',
      estado: 'presupuesto' as const,
      items: (itemsByPres[p.id] || []).map((item: any) => ({
        prodId: item.prod_id,
        nombre: item.nombre,
        categoria: item.categoria,
        talle: item.talle,
        color: item.color,
        cant: item.cant,
        precio: parseFloat(item.precio),
      })),
    }));
  } catch (error) {
    console.error('Error loading presupuestos:', error);
    return [];
  }
}

export async function savePresupuesto(p: Presupuesto): Promise<void> {
  const { error: pError } = await supabase.from('presupuestos').upsert({
    id: p.id,
    cliente_id: p.clienteId,
    fecha: p.fecha,
    total: p.total,
    notas: p.notas || null,
    estado: p.estado,
  });
  if (pError) throw pError;

  await supabase.from('presupuesto_items').delete().eq('presupuesto_id', p.id);
  if (p.items.length > 0) {
    const { error: iError } = await supabase.from('presupuesto_items').insert(
      p.items.map(item => ({
        presupuesto_id: p.id,
        prod_id: item.prodId,
        nombre: item.nombre,
        categoria: item.categoria,
        talle: item.talle,
        color: item.color,
        cant: item.cant,
        precio: item.precio,
      }))
    );
    if (iError) throw iError;
  }
}

export async function deletePresupuesto(id: string): Promise<void> {
  const { error } = await supabase.from('presupuestos').delete().eq('id', id);
  if (error) throw error;
}

export async function verificarPrimerAdmin(): Promise<boolean> {
  try {
    console.log('🔍 Verificando si existe primer admin en Supabase...');

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10000)
    );

    const query = supabase
      .from('usuarios')
      .select('id')
      .eq('rol', 'admin')
      .limit(1);

    const { data, error } = await Promise.race([query, timeout]) as any;

    console.log('📊 Respuesta Supabase verificarPrimerAdmin:', { data, error });

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error en consulta Supabase:', error);
      throw error;
    }

    const needsFirstAdmin = !data || data.length === 0;
    console.log('✅ ¿Necesita primer admin?:', needsFirstAdmin);

    return needsFirstAdmin;
  } catch (error) {
    console.error('❌ Error verificando primer admin:', error);
    throw error;
  }
}