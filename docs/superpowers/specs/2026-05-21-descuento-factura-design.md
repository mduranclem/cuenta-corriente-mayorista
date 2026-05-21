# Diseño: Descuento manual del 10% en factura

**Fecha:** 2026-05-21  
**Estado:** Aprobado

---

## Resumen

Agregar un botón en el formulario de factura que permite aplicar un descuento del 10% sobre todos los productos. El descuento es manual (el usuario lo activa/desactiva con el botón), aplica para cualquier cliente y cualquier lista de precios. Al activarse, se muestran los precios originales tachados al lado de los descontados, tanto en el formulario como en la factura impresa.

---

## Requisitos

- Botón siempre visible en el formulario de factura ("Aplicar 10% desc." / "Quitar descuento")
- Al activar: cada fila muestra precio original (tachado) + precio con descuento
- El total muestra subtotal original (tachado) + total con descuento
- El descuento se guarda en la Factura (`descuento: 0.1`) y el `total` guardado es ya el descontado
- La factura impresa refleja el descuento: precio unit. original, precio descontado, línea de descuento total
- El botón es un toggle: se puede activar y desactivar antes de guardar

---

## Cambios de tipos (`types.ts`)

Agregar campo opcional a `Factura`:

```ts
export interface Factura {
  id: string;
  clienteId: string;
  fecha: string;
  items: FacturaItem[];
  total: number;
  descuento?: number;   // porcentaje como decimal, ej: 0.1 = 10%
  notas?: string;
}
```

`FacturaItem` no cambia — los precios originales ya están en cada fila.

---

## Estado en el formulario (`App.tsx`)

Nuevo estado:

```ts
const [descuentoAplicado, setDescuentoAplicado] = useState(false);
```

Cálculos derivados:

```ts
const totalFactura = rows.reduce((sum, row) => sum + row.precio * row.cant, 0);
const totalFacturaConDescuento = descuentoAplicado ? totalFactura * 0.9 : totalFactura;
const montoDescuento = totalFactura * 0.1;
```

Resetear `descuentoAplicado = false` al limpiar el formulario (junto con los otros estados).

---

## UI del formulario

### Botón toggle
Ubicado en la sección del resumen/total, junto al botón "Añadir":

- Estado OFF: botón gris/neutro, texto "Aplicar 10% dto."
- Estado ON: botón verde/accent, texto "Quitar descuento ✓"

### Filas de productos (cuando `descuentoAplicado`)
Cada fila muestra una segunda línea de precio:

```
Nombre / talle / color
$1.000 (tachado, gris)  →  $900
```

### Sección de total
- OFF: `Total general: $X` (comportamiento actual)
- ON:
  ```
  Subtotal:     $X (tachado)
  Descuento 10%: -$Y
  Total:        $Z  (en verde/accent)
  ```

---

## Al guardar la factura

```ts
const factura: Factura = {
  id: ...,
  clienteId: ...,
  fecha: ...,
  items,
  total: descuentoAplicado
    ? items.reduce((sum, i) => sum + i.precio * i.cant, 0) * 0.9
    : items.reduce((sum, i) => sum + i.precio * i.cant, 0),
  descuento: descuentoAplicado ? 0.1 : undefined,
  notas: invoiceNotas || undefined,
};
```

Los `items` se guardan con sus precios originales (sin modificar). El descuento vive en `factura.descuento`.

---

## Factura impresa (`printInvoice`)

Cuando `factura.descuento` existe:

### Tabla de productos
Agregar columna "Precio unit." que muestra precio original y precio descontado:

| Producto | Color | Talle | Cant | Precio unit. | Subtotal |
|---|---|---|---|---|---|
| Remera | Rojo | M | 3 | ~~$1.000~~ $900 | $2.700 |

### Pie de tabla
```
Subtotal:      $10.000
Descuento 10%: -$1.000
TOTAL:          $9.000
```

Sin descuento, el comportamiento actual no cambia.

---

## Presupuestos

`Presupuesto` también tiene `items` y `total`. Aplicar el mismo campo `descuento?: number` para mantener consistencia, pero es opcional en esta iteración. Si el usuario no lo pide, se omite.

---

## Casos borde

- Si el usuario activa el descuento, agrega productos, luego lo desactiva → el total vuelve al precio lleno. No hay estado inconsistente porque los precios originales siempre están en `items`.
- Al editar una factura existente con descuento: `descuentoAplicado` se inicializa en `true` si `editingFactura.descuento` existe.
- La seña (si aplica) se calcula sobre `totalFacturaConDescuento`, no sobre el original.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/types.ts` | Agregar `descuento?: number` a `Factura` |
| `src/App.tsx` | Estado `descuentoAplicado`, botón toggle, UI de filas y total, lógica de guardado, `printInvoice` |
