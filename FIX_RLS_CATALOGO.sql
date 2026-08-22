-- ============================================================
-- FIX_RLS_CATALOGO.sql
-- Ejecutar en Supabase Dashboard -> SQL Editor
--
-- Problema: catalogo_productos y catalogo_precios tienen los datos
-- correctos (120 precios), pero la app los ve vacios. Causa: RLS
-- habilitado sin ninguna politica, asi que el rol "anon" (con el
-- que entra la app) no ve ninguna fila. El editor SQL si las ve
-- porque corre como "postgres", que ignora RLS.
--
-- Solucion: mismo patron que ENDURECER_SEGURIDAD.sql -> RLS
-- habilitado + politica permisiva para anon/authenticated.
--
-- Escrito con sentencias explicitas (sin DO / format / $$) para
-- que no se rompa al copiar y pegar.
-- Es idempotente: se puede correr varias veces.
-- ============================================================

-- 1) Habilitar RLS
ALTER TABLE public.catalogo_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_precios   ENABLE ROW LEVEL SECURITY;

-- 2) Borrar la politica si ya existia (para poder recrearla)
DROP POLICY IF EXISTS anon_full_access ON public.catalogo_productos;
DROP POLICY IF EXISTS anon_full_access ON public.catalogo_precios;

-- 3) Crear la politica permisiva
CREATE POLICY anon_full_access ON public.catalogo_productos
    FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY anon_full_access ON public.catalogo_precios
    FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);

-- 4) Asegurar los permisos de tabla del rol anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogo_productos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogo_precios   TO anon, authenticated;

-- 5) Verificacion: las dos filas tienen que decir rls = true y politicas = 1
SELECT
    c.relname        AS tabla,
    c.relrowsecurity AS rls,
    (SELECT count(*) FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS politicas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('catalogo_productos', 'catalogo_precios')
ORDER BY c.relname;
