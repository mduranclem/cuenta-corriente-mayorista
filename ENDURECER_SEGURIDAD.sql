-- ============================================================
-- ENDURECER_SEGURIDAD.sql
-- Ejecutar en Supabase Dashboard -> SQL Editor
--
-- Objetivo: evitar que un borrado masivo accidental (como el que
-- paso el 2026-07-03, donde una sola sentencia dejo la tabla
-- "pagos" con solo 5 filas) pueda volver a pasar, venga de donde
-- venga: la app, una copia vieja del codigo corriendo en otra
-- compu, o una consulta manual.
--
-- IMPORTANTE sobre RLS en esta app:
-- Esta app NO usa Supabase Auth (tiene su propio login contra la
-- tabla "usuarios"). Todo el acceso a la base pasa por la misma
-- anon key, publica en el JS del sitio. Por eso, habilitar RLS
-- con politicas "USING (true)" no restringe QUIEN puede escribir
-- -- eso seguiria siendo cualquiera con la anon key. La proteccion
-- real esta en el paso 2 (el trigger que bloquea borrados masivos
-- en una sola sentencia). El paso 1 solo formaliza RLS para que
-- quede habilitado (buena practica / requisito de varios linters
-- de seguridad de Supabase) sin romper la app.
-- ============================================================

-- 1) Habilitar RLS + politica permisiva (necesaria para que la app
--    siga funcionando, ya que no hay sesion de Supabase Auth)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','productos','listas_precios','product_prices',
                            'facturas','factura_items','pagos','presupuestos',
                            'presupuesto_items','usuarios','auditoria']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS anon_full_access ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY anon_full_access ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- 2) Bloquear DELETE que afecte a mas de 3 filas en UNA sola
--    sentencia, sobre las tablas de negocio criticas. El uso
--    normal de la app siempre borra de a una fila (deleteCliente,
--    deleteProducto, deleteFactura, deletePago). El patron que
--    causo la perdida de datos (`.delete().neq('id','')`, que
--    borra la tabla entera de un saque) queda bloqueado.
CREATE OR REPLACE FUNCTION public.prevent_mass_delete()
RETURNS trigger AS $$
DECLARE
  cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM old_rows;
  IF cnt > 3 THEN
    RAISE EXCEPTION
      'Borrado bloqueado por seguridad: % filas eliminadas en una sola sentencia sobre "%". '
      'Si esto es un restore de backup intencional, desactivar temporalmente el trigger '
      '(ver instrucciones al final de este archivo) antes de repetir la operacion.',
      cnt, TG_TABLE_NAME;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','productos','facturas','factura_items','pagos']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_mass_delete ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_prevent_mass_delete '
      'AFTER DELETE ON public.%I '
      'REFERENCING OLD TABLE AS old_rows '
      'FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_mass_delete()',
      t
    );
  END LOOP;
END $$;

-- ============================================================
-- Si alguna vez necesitan hacer un restore de backup real
-- (reemplazar TODA una tabla a proposito), primero desactivar
-- el trigger de esa tabla, hacer el restore, y reactivarlo:
--
--   ALTER TABLE public.pagos DISABLE TRIGGER trg_prevent_mass_delete;
--   -- ... restaurar backup ...
--   ALTER TABLE public.pagos ENABLE TRIGGER trg_prevent_mass_delete;
--
-- (cambiar "pagos" por la tabla que corresponda: clientes,
-- productos, facturas, factura_items)
-- ============================================================
