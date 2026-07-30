-- Agrega soporte de descuento (5%/10%) a la tabla de presupuestos,
-- igual que ya existe en facturas.
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS descuento numeric;
