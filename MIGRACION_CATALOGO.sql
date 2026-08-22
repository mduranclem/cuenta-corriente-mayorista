-- ============================================================
-- MIGRACION_CATALOGO.sql
-- Ejecutar en Supabase Dashboard -> SQL Editor
--
-- Nuevo modelo de precios: Producto x Variedad x Rango de talle.
-- Un precio unitario por cada combinacion de esos tres campos.
--
-- Es idempotente: se puede ejecutar varias veces sin romper nada.
-- NO borra las tablas viejas (productos / product_prices / listas_precios):
-- quedan intactas como respaldo historico.
-- ============================================================

-- ========================================
-- 1. TABLAS NUEVAS
-- ========================================

CREATE TABLE IF NOT EXISTS public.catalogo_productos (
    id         TEXT PRIMARY KEY,
    nombre     TEXT NOT NULL,
    orden      INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS catalogo_productos_nombre_uq
    ON public.catalogo_productos (lower(nombre));

CREATE TABLE IF NOT EXISTS public.catalogo_precios (
    producto_id TEXT NOT NULL REFERENCES public.catalogo_productos(id) ON DELETE CASCADE,
    variedad    TEXT NOT NULL,
    rango_talle TEXT NOT NULL,
    precio      NUMERIC NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (producto_id, variedad, rango_talle),
    CONSTRAINT catalogo_precios_variedad_chk
        CHECK (variedad IN ('Liso', 'Bordado', 'Estampado')),
    CONSTRAINT catalogo_precios_rango_chk
        CHECK (rango_talle IN ('4 AL 10', '12 AL 16', 'S AL XL', 'ESPECIAL'))
);

-- RLS habilitado + politica permisiva, igual que el resto de las tablas
-- (ver ENDURECER_SEGURIDAD.sql). Sin esto la app entra como "anon" y ve
-- las tablas vacias aunque tengan datos.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['catalogo_productos', 'catalogo_precios']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS anon_full_access ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY anon_full_access ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
  END LOOP;
END $$;

-- ========================================
-- 2. COLUMNAS NUEVAS EN LOS ITEMS
--    Las facturas y presupuestos viejos conservan categoria/talle/color.
--    Los nuevos guardan ademas variedad + rango_talle.
-- ========================================

ALTER TABLE public.factura_items
    ADD COLUMN IF NOT EXISTS variedad    TEXT,
    ADD COLUMN IF NOT EXISTS rango_talle TEXT;

ALTER TABLE public.presupuesto_items
    ADD COLUMN IF NOT EXISTS variedad    TEXT,
    ADD COLUMN IF NOT EXISTS rango_talle TEXT;

-- Presupuestos: la columna descuento puede faltar en instalaciones viejas
ALTER TABLE public.presupuestos
    ADD COLUMN IF NOT EXISTS descuento NUMERIC;

-- ========================================
-- 3. MIGRACION DE LOS PRODUCTOS QUE YA EXISTEN
--    Cada nombre distinto de la tabla `productos` pasa a ser
--    un producto del catalogo. No se pierde ningun nombre.
--    Los que ya existan por el seed de abajo no se duplican.
-- ========================================

INSERT INTO public.catalogo_productos (id, nombre, orden)
SELECT
    'mig-' || substr(md5(lower(trim(nombre))), 1, 16) AS id,
    min(trim(nombre))                                 AS nombre,
    1000                                              AS orden
FROM public.productos
WHERE nombre IS NOT NULL AND trim(nombre) <> ''
GROUP BY lower(trim(nombre))
ON CONFLICT DO NOTHING;

-- ========================================
-- 4. PRECIOS INICIALES (datos de arranque)
-- ========================================

-- Productos del catálogo
INSERT INTO public.catalogo_productos (id, nombre, orden) VALUES ('cat-remera-algodon', 'Remera Algodón', 0) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.catalogo_productos (id, nombre, orden) VALUES ('cat-buzo-algodon', 'Buzo Algodón', 10) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.catalogo_productos (id, nombre, orden) VALUES ('cat-canguro-premium', 'Canguro Premium', 20) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.catalogo_productos (id, nombre, orden) VALUES ('cat-chomba-pique-premium', 'Chomba Piqué Premium', 30) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.catalogo_productos (id, nombre, orden) VALUES ('cat-joguin-algodon', 'Joguin Algodón', 40) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.catalogo_productos (id, nombre, orden) VALUES ('cat-short-algodon', 'Short Algodón', 50) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.catalogo_productos (id, nombre, orden) VALUES ('cat-cargo-gabardina', 'Cargo Gabardina', 60) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.catalogo_productos (id, nombre, orden) VALUES ('cat-campera-polar', 'Campera Polar', 70) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.catalogo_productos (id, nombre, orden) VALUES ('cat-chaleco-polar', 'Chaleco Polar', 80) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
INSERT INTO public.catalogo_productos (id, nombre, orden) VALUES ('cat-campera-canguro', 'Campera Canguro', 90) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- Precios por Producto x Variedad x Rango de talle
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-remera-algodon', 'Liso', '4 AL 10', 8625) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-remera-algodon', 'Liso', '12 AL 16', 9200) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-remera-algodon', 'Liso', 'S AL XL', 9775) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-remera-algodon', 'Liso', 'ESPECIAL', 10925) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-remera-algodon', 'Bordado', '4 AL 10', 13225) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-remera-algodon', 'Bordado', '12 AL 16', 14375) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-remera-algodon', 'Bordado', 'S AL XL', 15525) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-remera-algodon', 'Bordado', 'ESPECIAL', 16675) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-remera-algodon', 'Estampado', '4 AL 10', 10925) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-remera-algodon', 'Estampado', '12 AL 16', 12075) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-remera-algodon', 'Estampado', 'S AL XL', 13225) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-remera-algodon', 'Estampado', 'ESPECIAL', 14375) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-buzo-algodon', 'Liso', '4 AL 10', 18400) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-buzo-algodon', 'Liso', '12 AL 16', 19550) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-buzo-algodon', 'Liso', 'S AL XL', 20700) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-buzo-algodon', 'Liso', 'ESPECIAL', 21850) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-buzo-algodon', 'Bordado', '4 AL 10', 22425) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-buzo-algodon', 'Bordado', '12 AL 16', 23575) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-buzo-algodon', 'Bordado', 'S AL XL', 24725) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-buzo-algodon', 'Bordado', 'ESPECIAL', 25875) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-buzo-algodon', 'Estampado', '4 AL 10', 20010) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-buzo-algodon', 'Estampado', '12 AL 16', 21678) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-buzo-algodon', 'Estampado', 'S AL XL', 23345) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-buzo-algodon', 'Estampado', 'ESPECIAL', 26680) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-canguro-premium', 'Liso', '4 AL 10', 20700) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-canguro-premium', 'Liso', '12 AL 16', 21850) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-canguro-premium', 'Liso', 'S AL XL', 23000) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-canguro-premium', 'Liso', 'ESPECIAL', 24150) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-canguro-premium', 'Bordado', '4 AL 10', 24725) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-canguro-premium', 'Bordado', '12 AL 16', 25875) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-canguro-premium', 'Bordado', 'S AL XL', 27025) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-canguro-premium', 'Bordado', 'ESPECIAL', 28175) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-canguro-premium', 'Estampado', '4 AL 10', 22310) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-canguro-premium', 'Estampado', '12 AL 16', 23575) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-canguro-premium', 'Estampado', 'S AL XL', 25645) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-canguro-premium', 'Estampado', 'ESPECIAL', 28980) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chomba-pique-premium', 'Liso', '4 AL 10', 17825) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chomba-pique-premium', 'Liso', '12 AL 16', 18975) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chomba-pique-premium', 'Liso', 'S AL XL', 20125) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chomba-pique-premium', 'Liso', 'ESPECIAL', 21275) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chomba-pique-premium', 'Bordado', '4 AL 10', 21850) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chomba-pique-premium', 'Bordado', '12 AL 16', 23000) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chomba-pique-premium', 'Bordado', 'S AL XL', 24150) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chomba-pique-premium', 'Bordado', 'ESPECIAL', 25300) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chomba-pique-premium', 'Estampado', '4 AL 10', 20125) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chomba-pique-premium', 'Estampado', '12 AL 16', 21275) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chomba-pique-premium', 'Estampado', 'S AL XL', 22425) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chomba-pique-premium', 'Estampado', 'ESPECIAL', 23575) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-joguin-algodon', 'Liso', '4 AL 10', 16330) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-joguin-algodon', 'Liso', '12 AL 16', 17480) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-joguin-algodon', 'Liso', 'S AL XL', 18630) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-joguin-algodon', 'Liso', 'ESPECIAL', 19780) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-joguin-algodon', 'Bordado', '4 AL 10', 20355) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-joguin-algodon', 'Bordado', '12 AL 16', 21505) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-joguin-algodon', 'Bordado', 'S AL XL', 22655) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-joguin-algodon', 'Bordado', 'ESPECIAL', 23805) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-joguin-algodon', 'Estampado', '4 AL 10', 18400) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-joguin-algodon', 'Estampado', '12 AL 16', 19550) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-joguin-algodon', 'Estampado', 'S AL XL', 20700) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-joguin-algodon', 'Estampado', 'ESPECIAL', 21850) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-short-algodon', 'Liso', '4 AL 10', 13800) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-short-algodon', 'Liso', '12 AL 16', 14950) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-short-algodon', 'Liso', 'S AL XL', 16100) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-short-algodon', 'Liso', 'ESPECIAL', 17250) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-short-algodon', 'Bordado', '4 AL 10', 17825) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-short-algodon', 'Bordado', '12 AL 16', 18975) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-short-algodon', 'Bordado', 'S AL XL', 20125) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-short-algodon', 'Bordado', 'ESPECIAL', 21275) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-short-algodon', 'Estampado', '4 AL 10', 15525) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-short-algodon', 'Estampado', '12 AL 16', 16675) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-short-algodon', 'Estampado', 'S AL XL', 17825) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-short-algodon', 'Estampado', 'ESPECIAL', 18975) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-cargo-gabardina', 'Liso', '4 AL 10', 34500) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-cargo-gabardina', 'Liso', '12 AL 16', 36800) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-cargo-gabardina', 'Liso', 'S AL XL', 39100) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-cargo-gabardina', 'Liso', 'ESPECIAL', 43700) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-cargo-gabardina', 'Bordado', '4 AL 10', 39100) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-cargo-gabardina', 'Bordado', '12 AL 16', 41400) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-cargo-gabardina', 'Bordado', 'S AL XL', 43700) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-cargo-gabardina', 'Bordado', 'ESPECIAL', 48300) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-cargo-gabardina', 'Estampado', '4 AL 10', 36800) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-cargo-gabardina', 'Estampado', '12 AL 16', 39100) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-cargo-gabardina', 'Estampado', 'S AL XL', 41400) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-cargo-gabardina', 'Estampado', 'ESPECIAL', 46000) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-polar', 'Liso', '4 AL 10', 24725) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-polar', 'Liso', '12 AL 16', 25875) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-polar', 'Liso', 'S AL XL', 27025) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-polar', 'Liso', 'ESPECIAL', 28175) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-polar', 'Bordado', '4 AL 10', 29325) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-polar', 'Bordado', '12 AL 16', 30475) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-polar', 'Bordado', 'S AL XL', 31625) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-polar', 'Bordado', 'ESPECIAL', 32775) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-polar', 'Estampado', '4 AL 10', 27025) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-polar', 'Estampado', '12 AL 16', 28175) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-polar', 'Estampado', 'S AL XL', 29325) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-polar', 'Estampado', 'ESPECIAL', 30475) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chaleco-polar', 'Liso', '4 AL 10', 20700) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chaleco-polar', 'Liso', '12 AL 16', 21850) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chaleco-polar', 'Liso', 'S AL XL', 23000) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chaleco-polar', 'Liso', 'ESPECIAL', 24150) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chaleco-polar', 'Bordado', '4 AL 10', 25300) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chaleco-polar', 'Bordado', '12 AL 16', 26450) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chaleco-polar', 'Bordado', 'S AL XL', 27600) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chaleco-polar', 'Bordado', 'ESPECIAL', 28750) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chaleco-polar', 'Estampado', '4 AL 10', 23000) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chaleco-polar', 'Estampado', '12 AL 16', 24150) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chaleco-polar', 'Estampado', 'S AL XL', 25300) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-chaleco-polar', 'Estampado', 'ESPECIAL', 26450) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-canguro', 'Liso', '4 AL 10', 24725) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-canguro', 'Liso', '12 AL 16', 25875) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-canguro', 'Liso', 'S AL XL', 27025) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-canguro', 'Liso', 'ESPECIAL', 29325) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-canguro', 'Bordado', '4 AL 10', 28175) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-canguro', 'Bordado', '12 AL 16', 29325) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-canguro', 'Bordado', 'S AL XL', 30475) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-canguro', 'Bordado', 'ESPECIAL', 32775) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-canguro', 'Estampado', '4 AL 10', 26500) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-canguro', 'Estampado', '12 AL 16', 27400) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-canguro', 'Estampado', 'S AL XL', 29500) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;
INSERT INTO public.catalogo_precios (producto_id, variedad, rango_talle, precio) VALUES ('cat-campera-canguro', 'Estampado', 'ESPECIAL', 31775) ON CONFLICT (producto_id, variedad, rango_talle) DO UPDATE SET precio = EXCLUDED.precio;

-- ========================================
-- 5. VERIFICACION
-- ========================================
-- Debe devolver 10 productos del seed + los migrados, y 120 precios del seed.
SELECT
    (SELECT count(*) FROM public.catalogo_productos)                       AS productos_total,
    (SELECT count(*) FROM public.catalogo_productos WHERE id LIKE 'cat-%') AS productos_seed,
    (SELECT count(*) FROM public.catalogo_productos WHERE id LIKE 'mig-%') AS productos_migrados,
    (SELECT count(*) FROM public.catalogo_precios)                         AS precios_cargados;
