-- ============================================================
-- SETUP_TABLAS_NEGOCIO.sql
-- Ejecutar en Supabase Dashboard → SQL Editor
-- Crea todas las tablas del negocio (clientes, productos, facturas, pagos)
-- ============================================================

-- ========================================
-- 1. CLIENTES
-- ========================================
CREATE TABLE IF NOT EXISTS public.clientes (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tel TEXT DEFAULT '',
    email TEXT DEFAULT '',
    cat TEXT NOT NULL DEFAULT 'general',
    notas TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. PRODUCTOS
-- ========================================
CREATE TABLE IF NOT EXISTS public.productos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT '',
    talle TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    precio NUMERIC NOT NULL DEFAULT 0,
    precio_esp NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 3. LISTAS DE PRECIOS
-- ========================================
CREATE TABLE IF NOT EXISTS public.listas_precios (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_prices (
    producto_id TEXT NOT NULL,
    lista_id TEXT NOT NULL,
    precio NUMERIC NOT NULL DEFAULT 0,
    PRIMARY KEY (producto_id, lista_id)
);

-- ========================================
-- 4. FACTURAS
-- ========================================
CREATE TABLE IF NOT EXISTS public.facturas (
    id TEXT PRIMARY KEY,
    cliente_id TEXT NOT NULL,
    fecha TEXT NOT NULL,
    total NUMERIC NOT NULL DEFAULT 0,
    descuento NUMERIC,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.factura_items (
    id SERIAL PRIMARY KEY,
    factura_id TEXT NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
    prod_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT '',
    talle TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    cant INTEGER NOT NULL DEFAULT 1,
    precio NUMERIC NOT NULL DEFAULT 0
);

-- ========================================
-- 5. PAGOS
-- ========================================
CREATE TABLE IF NOT EXISTS public.pagos (
    id TEXT PRIMARY KEY,
    cliente_id TEXT NOT NULL,
    fecha TEXT NOT NULL,
    monto NUMERIC NOT NULL DEFAULT 0,
    forma TEXT NOT NULL DEFAULT 'Efectivo',
    notas TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 6. PRESUPUESTOS
-- ========================================
CREATE TABLE IF NOT EXISTS public.presupuestos (
    id TEXT PRIMARY KEY,
    cliente_id TEXT NOT NULL,
    fecha TEXT NOT NULL,
    total NUMERIC NOT NULL DEFAULT 0,
    notas TEXT,
    estado TEXT NOT NULL DEFAULT 'presupuesto',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.presupuesto_items (
    id SERIAL PRIMARY KEY,
    presupuesto_id TEXT NOT NULL REFERENCES public.presupuestos(id) ON DELETE CASCADE,
    prod_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT '',
    talle TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    cant INTEGER NOT NULL DEFAULT 1,
    precio NUMERIC NOT NULL DEFAULT 0
);

-- ========================================
-- 7. DESHABILITAR RLS (la app usa auth propia)
-- ========================================
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_precios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_prices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.factura_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_items DISABLE ROW LEVEL SECURITY;
