import type { Cliente, Factura, Pago, Producto } from '../types';
import { demoClientes, demoFacturas, demoPagos, demoProductos } from '../data/demo';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '/api';
let remoteChecked = false;
let remoteAvailable = false;

const KEYS = {
  clientes: 'cc_clientes',
  productos: 'cc_productos',
  facturas: 'cc_facturas',
  pagos: 'cc_pagos',
};

async function checkRemote() {
  if (remoteChecked) return remoteAvailable;
  remoteChecked = true;

  if (!API_BASE_URL) {
    remoteAvailable = false;
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    remoteAvailable = response.ok;
  } catch {
    remoteAvailable = false;
  }

  return remoteAvailable;
}

async function shouldUseRemote() {
  if (import.meta.env.VITE_API_URL) return true;
  return await checkRemote();
}


export interface BackupPayload {
  clientes: Cliente[];
  productos: Producto[];
  facturas: Factura[];
  pagos: Pago[];
}

function parse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function seedIfEmpty<T>(key: string, fallback: T) {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  return parse<T>(stored, fallback);
}

function loadClientesLocal(): Cliente[] {
  return seedIfEmpty(KEYS.clientes, demoClientes);
}

function loadProductosLocal(): Producto[] {
  return seedIfEmpty(KEYS.productos, demoProductos);
}

function loadFacturasLocal(): Factura[] {
  return seedIfEmpty(KEYS.facturas, demoFacturas);
}

function loadPagosLocal(): Pago[] {
  return seedIfEmpty(KEYS.pagos, demoPagos);
}

function saveClientesLocal(clientes: Cliente[]) {
  localStorage.setItem(KEYS.clientes, JSON.stringify(clientes));
}

function saveProductosLocal(productos: Producto[]) {
  localStorage.setItem(KEYS.productos, JSON.stringify(productos));
}

function saveFacturasLocal(facturas: Factura[]) {
  localStorage.setItem(KEYS.facturas, JSON.stringify(facturas));
}

function savePagosLocal(pagos: Pago[]) {
  localStorage.setItem(KEYS.pagos, JSON.stringify(pagos));
}

function loadStateLocal(): BackupPayload {
  return {
    clientes: loadClientesLocal(),
    productos: loadProductosLocal(),
    facturas: loadFacturasLocal(),
    pagos: loadPagosLocal(),
  };
}

function saveStateLocal(data: BackupPayload) {
  saveClientesLocal(data.clientes);
  saveProductosLocal(data.productos);
  saveFacturasLocal(data.facturas);
  savePagosLocal(data.pagos);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

async function loadStateRemote(): Promise<BackupPayload> {
  return request<BackupPayload>('/state');
}

async function saveStateRemote(data: BackupPayload) {
  await request('/api/state', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function loadClientes(): Promise<Cliente[]> {
  return (await shouldUseRemote()) ? (await loadStateRemote()).clientes : loadClientesLocal();
}

export async function loadProductos(): Promise<Producto[]> {
  return (await shouldUseRemote()) ? (await loadStateRemote()).productos : loadProductosLocal();
}

export async function loadFacturas(): Promise<Factura[]> {
  return (await shouldUseRemote()) ? (await loadStateRemote()).facturas : loadFacturasLocal();
}

export async function loadPagos(): Promise<Pago[]> {
  return (await shouldUseRemote()) ? (await loadStateRemote()).pagos : loadPagosLocal();
}

export async function saveClientes(clientes: Cliente[]) {
  if (await shouldUseRemote()) {
    const current = await loadStateRemote();
    await saveStateRemote({ ...current, clientes });
  } else {
    saveClientesLocal(clientes);
  }
}

export async function saveProductos(productos: Producto[]) {
  if (await shouldUseRemote()) {
    const current = await loadStateRemote();
    await saveStateRemote({ ...current, productos });
  } else {
    saveProductosLocal(productos);
  }
}

export async function saveFacturas(facturas: Factura[]) {
  if (await shouldUseRemote()) {
    const current = await loadStateRemote();
    await saveStateRemote({ ...current, facturas });
  } else {
    saveFacturasLocal(facturas);
  }
}

export async function savePagos(pagos: Pago[]) {
  if (await shouldUseRemote()) {
    const current = await loadStateRemote();
    await saveStateRemote({ ...current, pagos });
  } else {
    savePagosLocal(pagos);
  }
}

export async function exportBackup(): Promise<BackupPayload> {
  return (await shouldUseRemote()) ? loadStateRemote() : loadStateLocal();
}

export async function importBackup(data: BackupPayload) {
  if (await shouldUseRemote()) {
    await saveStateRemote(data);
  } else {
    saveStateLocal(data);
  }
}

export function clearStorage() {
  if (import.meta.env.VITE_API_URL) {
    throw new Error('clearStorage no está disponible en modo API');
  }

  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}
