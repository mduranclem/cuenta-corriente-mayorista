-- ============================================================
-- NUEVAS FUNCIONALIDADES - Ejecutar en Supabase Dashboard
-- ============================================================

-- Feature 1: Notas en facturas
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS notas TEXT;

-- Feature: Descuento en facturas (ej: 10% = 0.1)
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS descuento NUMERIC;

-- Feature 7: Presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
  id TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL,
  fecha TEXT NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'presupuesto',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presupuesto_items (
  id SERIAL PRIMARY KEY,
  presupuesto_id TEXT NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  prod_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT '',
  talle TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  cant INTEGER NOT NULL DEFAULT 1,
  precio NUMERIC NOT NULL DEFAULT 0
);
