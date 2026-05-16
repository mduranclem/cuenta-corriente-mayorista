import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tcegqyvikgicdcazrbam.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjZWdxeXZpa2dpY2RjYXpyYmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NzE2ODcsImV4cCI6MjA5NDQ0NzY4N30.bmRLI-iiaxUQJ5tVsecZTU1ay4ITX53qXRTF_tWnINg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para las tablas de la base de datos
export interface DatabaseCliente {
  id: string
  nombre: string
  tel: string | null
  email: string | null
  cat: 'general' | 'especial'
  notas: string | null
  created_at?: string
  updated_at?: string
}

export interface DatabaseProducto {
  id: string
  nombre: string
  categoria: string
  talle: string
  color: string
  precio: number
  precio_esp: number | null
  created_at?: string
  updated_at?: string
}

export interface DatabaseFactura {
  id: string
  cliente_id: string
  fecha: string
  total: number
  created_at?: string
  updated_at?: string
}

export interface DatabaseFacturaItem {
  id?: number
  factura_id: string
  prod_id: string
  nombre: string
  categoria: string
  talle: string
  color: string
  cant: number
  precio: number
}

export interface DatabasePago {
  id: string
  cliente_id: string
  fecha: string
  monto: number
  forma: 'Efectivo' | 'Transferencia' | 'Cheque' | 'Tarjeta'
  notas: string | null
  created_at?: string
  updated_at?: string
}

export interface DatabaseAuditoria {
  id?: number
  usuario: string
  accion: string
  entidad: 'cliente' | 'producto' | 'factura' | 'pago'
  entidad_id?: string
  detalles?: string
  fecha: string
  created_at?: string
}

export interface DatabaseUsuario {
  id: string
  username: string
  email: string
  password_hash: string
  rol: 'admin' | 'usuario'
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  creado_por?: string
  aprobado_por?: string
  created_at?: string
  updated_at?: string
}