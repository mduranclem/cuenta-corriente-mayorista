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