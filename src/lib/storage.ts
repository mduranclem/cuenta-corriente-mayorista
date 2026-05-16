import type { Cliente, Factura, Pago, Producto } from '../types';
import { supabase } from './supabase';

export interface BackupPayload {
  clientes: Cliente[];
  productos: Producto[];
  facturas: Factura[];
  pagos: Pago[];
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
  };
}

function databaseToFactura(facturaRow: any, items: any[]): Factura {
  return {
    id: facturaRow.id,
    clienteId: facturaRow.cliente_id,
    fecha: facturaRow.fecha,
    total: parseFloat(facturaRow.total),
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

// Funciones principales de guardado
export async function saveClientes(clientes: Cliente[]) {
  try {
    // Eliminar todos los clientes existentes
    const { error: deleteError } = await supabase
      .from('clientes')
      .delete()
      .neq('id', ''); // Eliminar todos

    if (deleteError && deleteError.code !== 'PGRST116') { // PGRST116 = no rows to delete
      throw deleteError;
    }

    // Insertar nuevos clientes
    if (clientes.length > 0) {
      const { error: insertError } = await supabase
        .from('clientes')
        .insert(clientes.map(clienteToDatabase));

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error saving clientes:', error);
    throw error;
  }
}

export async function saveProductos(productos: Producto[]) {
  try {
    // Eliminar todos los productos existentes
    const { error: deleteError } = await supabase
      .from('productos')
      .delete()
      .neq('id', '');

    if (deleteError && deleteError.code !== 'PGRST116') {
      throw deleteError;
    }

    // Insertar nuevos productos
    if (productos.length > 0) {
      const { error: insertError } = await supabase
        .from('productos')
        .insert(productos.map(productoToDatabase));

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error saving productos:', error);
    throw error;
  }
}

export async function saveFacturas(facturas: Factura[]) {
  try {
    // Eliminar todos los items de facturas existentes
    const { error: deleteItemsError } = await supabase
      .from('factura_items')
      .delete()
      .neq('id', 0);

    if (deleteItemsError && deleteItemsError.code !== 'PGRST116') {
      throw deleteItemsError;
    }

    // Eliminar todas las facturas existentes
    const { error: deleteFacturasError } = await supabase
      .from('facturas')
      .delete()
      .neq('id', '');

    if (deleteFacturasError && deleteFacturasError.code !== 'PGRST116') {
      throw deleteFacturasError;
    }

    // Insertar nuevas facturas e items
    if (facturas.length > 0) {
      // Insertar facturas
      const { error: insertFacturasError } = await supabase
        .from('facturas')
        .insert(facturas.map(facturaToDatabase));

      if (insertFacturasError) throw insertFacturasError;

      // Insertar items de facturas
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

export async function savePagos(pagos: Pago[]) {
  try {
    // Eliminar todos los pagos existentes
    const { error: deleteError } = await supabase
      .from('pagos')
      .delete()
      .neq('id', '');

    if (deleteError && deleteError.code !== 'PGRST116') {
      throw deleteError;
    }

    // Insertar nuevos pagos
    if (pagos.length > 0) {
      const { error: insertError } = await supabase
        .from('pagos')
        .insert(pagos.map(pagoToDatabase));

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

export async function obtenerAuditoria(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('auditoria')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

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
    // Verificar que el username no exista
    const { data: existingUser, error: checkError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      throw new Error('El nombre de usuario ya existe');
    }

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // Crear hash simple de contraseña
    const passwordHash = btoa(password);

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
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error registrando usuario:', error);
    throw error;
  }
}

export async function autenticarUsuario(usernameOrEmail: string, password: string) {
  try {
    console.log('🔍 Autenticando usuario:', usernameOrEmail);
    const passwordHash = btoa(password);
    console.log('🔐 Password hash generado para comparación');

    // Buscar por username O email (case-insensitive)
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .or(`username.ilike.${usernameOrEmail},email.ilike.${usernameOrEmail}`)
      .eq('password_hash', passwordHash)
      .eq('estado', 'aprobado');

    console.log('📊 Respuesta Supabase autenticación:', { data, error });

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

export async function aprobarUsuario(userId: string, aprobadoPor: string) {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        estado: 'aprobado',
        aprobado_por: aprobadoPor,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error aprobando usuario:', error);
    throw error;
  }
}

export async function rechazarUsuario(userId: string, aprobadoPor: string) {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        estado: 'rechazado',
        aprobado_por: aprobadoPor,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error rechazando usuario:', error);
    throw error;
  }
}

export async function verificarPrimerAdmin(): Promise<boolean> {
  try {
    console.log('🔍 Verificando si existe primer admin en Supabase...');

    const { data, error } = await supabase
      .from('usuarios')
      .select('id')
      .eq('rol', 'admin')
      .limit(1);

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
    throw error; // Cambiar para que propague el error
  }
}