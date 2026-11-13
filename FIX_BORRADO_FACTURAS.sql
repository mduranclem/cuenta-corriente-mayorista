-- ============================================================
-- FIX: no se podian eliminar ni editar facturas con mas de 3 lineas
-- ============================================================
-- ENDURECER_SEGURIDAD.sql bloquea cualquier DELETE de mas de 3 filas
-- en una sola sentencia. Pero al eliminar o editar una factura, la app
-- borra TODAS sus lineas de un saque (factura_items WHERE factura_id = X).
-- Con el desglose por talle una factura tiene facilmente 4+ lineas, asi
-- que el borrado fallaba y la factura "volvia" al recargar.
--
-- Este script cambia SOLO la regla de factura_items: se permite borrar
-- cualquier cantidad de lineas siempre que pertenezcan a UNA misma
-- factura. Borrar lineas de varias facturas a la vez (o la tabla entera)
-- sigue bloqueado. Las demas tablas no cambian.
--
-- Ejecutar una vez en Supabase -> SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_mass_delete_factura_items()
RETURNS trigger AS $$
DECLARE
  cnt integer;
  facturas_afectadas integer;
BEGIN
  SELECT count(*), count(DISTINCT factura_id) INTO cnt, facturas_afectadas FROM old_rows;
  IF cnt > 3 AND facturas_afectadas > 1 THEN
    RAISE EXCEPTION
      'Borrado bloqueado por seguridad: % lineas de % facturas distintas en una sola sentencia. '
      'Si esto es un restore de backup intencional, desactivar temporalmente el trigger '
      '(ver ENDURECER_SEGURIDAD.sql) antes de repetir la operacion.',
      cnt, facturas_afectadas;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_mass_delete ON public.factura_items;
CREATE TRIGGER trg_prevent_mass_delete
  AFTER DELETE ON public.factura_items
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_mass_delete_factura_items();

-- Verificacion: debe mostrar el trigger apuntando a la funcion nueva.
SELECT tgname, tgrelid::regclass AS tabla, tgfoid::regproc AS funcion
FROM pg_trigger
WHERE tgname = 'trg_prevent_mass_delete'
ORDER BY tabla::text;
