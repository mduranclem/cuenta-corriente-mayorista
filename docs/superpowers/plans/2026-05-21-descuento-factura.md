# Descuento Manual 10% en Factura — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un botón toggle en el formulario de factura que aplica un descuento del 10% sobre todos los productos, mostrando precios originales y descontados en la UI y en la factura impresa.

**Architecture:** Se agrega `descuento?: number` a `Factura` en types.ts. En App.tsx: estado `descuentoAplicado` (boolean), cálculos derivados del total con descuento, botón toggle, UI de filas y total actualizada, lógica de guardado y printInvoice adaptados.

**Tech Stack:** React + TypeScript, Vite, Tailwind CSS. Sin framework de tests — verificación manual en el navegador.

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/types.ts` | Agregar `descuento?: number` a `Factura` |
| `src/App.tsx` | Estado, cálculos, botón, UI filas, UI total, guardado, edición, printInvoice |

---

### Task 1: Agregar campo `descuento` al tipo `Factura`

**Files:**
- Modify: `src/types.ts:44-51`

- [ ] **Step 1: Editar `src/types.ts`** — agregar `descuento?: number` a la interfaz `Factura`:

```ts
export interface Factura {
  id: string;
  clienteId: string;
  fecha: string;
  items: FacturaItem[];
  total: number;
  descuento?: number;
  notas?: string;
}
```

- [ ] **Step 2: Verificar que TypeScript no rompe**

```powershell
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```powershell
git add src/types.ts
git commit -m "feat: agregar campo descuento a Factura"
```

---

### Task 2: Agregar estado `descuentoAplicado` y cálculos derivados

**Files:**
- Modify: `src/App.tsx` — estado cerca de línea 246, cálculos cerca de línea 420

- [ ] **Step 1: Agregar el estado** después de `invoiceSenaForma` (línea 246):

```ts
  const [invoiceSenaForma, setInvoiceSenaForma] = useState<FormaPago>('Efectivo');
  const [descuentoAplicado, setDescuentoAplicado] = useState(false);
```

- [ ] **Step 2: Agregar cálculos derivados** después de `totalFactura` (línea 420-423):

```ts
  const totalFactura = useMemo(
    () => rows.reduce((total, row) => total + row.precio * row.cant, 0),
    [rows]
  );

  const montoDescuento = useMemo(
    () => descuentoAplicado ? totalFactura * 0.1 : 0,
    [descuentoAplicado, totalFactura]
  );

  const totalConDescuento = useMemo(
    () => totalFactura - montoDescuento,
    [totalFactura, montoDescuento]
  );
```

- [ ] **Step 3: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

Expected: sin errores.

---

### Task 3: Resetear `descuentoAplicado` al limpiar el formulario

**Files:**
- Modify: `src/App.tsx` — `handleConfirmInvoice` (línea ~579-586) y `handleEditFactura` (línea ~908-914)

- [ ] **Step 1: En `handleConfirmInvoice`**, agregar el reset de `descuentoAplicado` junto a los otros resets (después de `setInvoiceSenaForma('Efectivo')`, línea 585):

```ts
    setInvoiceSenaForma('Efectivo');
    setDescuentoAplicado(false);
    setEditingFactura(null);
```

- [ ] **Step 2: En `handleEditFactura`**, restaurar el estado de descuento al editar una factura existente:

```ts
  const handleEditFactura = (factura: Factura) => {
    setEditingFactura(factura);
    const cliente = clientes.find(c => c.id === factura.clienteId);
    if (cliente) setInvoiceClient(factura.clienteId);
    setInvoiceDate(factura.fecha);
    setRows(factura.items.map((item, i) => ({ ...item, rowKey: `r${i}`, query: '' })));
    setDescuentoAplicado(factura.descuento != null && factura.descuento > 0);
    setPage('dashboard');
  };
```

- [ ] **Step 3: También resetear en el botón "Cancelar edición"** (línea ~1812-1813). Encontrá el onClick del botón de cancelar edición y agregá `setDescuentoAplicado(false)`:

```tsx
onClick={() => {
  setEditingFactura(null);
  setRows([{ rowKey: 'r0', prodId: '', nombre: '', categoria: '', talle: '', color: '', cant: 1, precio: 0, query: '' }]);
  setInvoiceDate(today);
  setDescuentoAplicado(false);
}}
```

- [ ] **Step 4: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

---

### Task 4: Actualizar `handleConfirmInvoice` para guardar el descuento

**Files:**
- Modify: `src/App.tsx` — `handleConfirmInvoice` (línea ~541-548)

- [ ] **Step 1: Reemplazar la construcción del objeto `factura`** para incluir `descuento`:

```ts
    const subtotal = items.reduce((sum, item) => sum + item.precio * item.cant, 0);
    const factura: Factura = {
      id: editingFactura ? editingFactura.id : `f${Date.now()}`,
      clienteId: invoiceClienteActual.id,
      fecha: invoiceDate,
      items,
      total: descuentoAplicado ? subtotal * 0.9 : subtotal,
      descuento: descuentoAplicado ? 0.1 : undefined,
      notas: invoiceNotas.trim() || undefined,
    };
```

- [ ] **Step 2: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```powershell
git add src/App.tsx
git commit -m "feat: guardar descuento en factura al confirmar"
```

---

### Task 5: Agregar botón toggle en la UI del formulario

**Files:**
- Modify: `src/App.tsx` — sección de total del formulario (línea ~1975-1986)

El bloque actual es:
```tsx
<div className="mt-6 flex flex-col gap-4 rounded-3xl bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
  <button
    type="button"
    onClick={addRow}
    className="inline-flex items-center justify-center rounded-3xl bg-panel px-5 py-3 text-sm font-medium text-textPrimary shadow-sm ring-1 ring-border transition hover:bg-surface"
  >
    Añadir
  </button>
  <div className="text-right">
    <p className="text-sm text-textSecondary">Total general</p>
    <p className="mt-1 text-3xl font-semibold">{formatMoney(totalFactura)}</p>
  </div>
</div>
```

- [ ] **Step 1: Reemplazar ese bloque** con la versión que incluye botón de descuento y total actualizado:

```tsx
<div className="mt-6 flex flex-col gap-4 rounded-3xl bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex gap-2">
    <button
      type="button"
      onClick={addRow}
      className="inline-flex items-center justify-center rounded-3xl bg-panel px-5 py-3 text-sm font-medium text-textPrimary shadow-sm ring-1 ring-border transition hover:bg-surface"
    >
      Añadir
    </button>
    <button
      type="button"
      onClick={() => setDescuentoAplicado(v => !v)}
      className={`inline-flex items-center justify-center rounded-3xl px-5 py-3 text-sm font-medium shadow-sm ring-1 transition ${
        descuentoAplicado
          ? 'bg-accent text-white ring-accent hover:opacity-90'
          : 'bg-panel text-textPrimary ring-border hover:bg-surface'
      }`}
    >
      {descuentoAplicado ? '✓ Dto. 10% activo' : 'Aplicar 10% dto.'}
    </button>
  </div>
  <div className="text-right">
    {descuentoAplicado ? (
      <>
        <p className="text-sm text-textSecondary line-through">{formatMoney(totalFactura)}</p>
        <p className="text-xs text-textSecondary">- {formatMoney(montoDescuento)} (10%)</p>
        <p className="mt-1 text-3xl font-semibold text-green-400">{formatMoney(totalConDescuento)}</p>
      </>
    ) : (
      <>
        <p className="text-sm text-textSecondary">Total general</p>
        <p className="mt-1 text-3xl font-semibold">{formatMoney(totalFactura)}</p>
      </>
    )}
  </div>
</div>
```

- [ ] **Step 2: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```powershell
git add src/App.tsx
git commit -m "feat: botón toggle descuento 10% en formulario de factura"
```

---

### Task 6: Mostrar precio original y descontado en cada fila

**Files:**
- Modify: `src/App.tsx` — bloque de renderizado de filas (línea ~1953-1954)

La línea actual que muestra el subtotal de la fila es:
```tsx
<div className="flex items-center text-sm text-textPrimary">
  {formatMoney(row.precio * row.cant)}
</div>
```

- [ ] **Step 1: Reemplazar ese div** para mostrar ambos precios cuando el descuento está activo:

```tsx
<div className="flex flex-col text-sm">
  {descuentoAplicado ? (
    <>
      <span className="text-textSecondary line-through">{formatMoney(row.precio * row.cant)}</span>
      <span className="text-green-400 font-medium">{formatMoney(row.precio * row.cant * 0.9)}</span>
    </>
  ) : (
    <span className="text-textPrimary">{formatMoney(row.precio * row.cant)}</span>
  )}
</div>
```

- [ ] **Step 2: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 3: Actualizar la sección de seña** para que el saldo restante use `totalConDescuento` en lugar de `totalFactura`. Buscar la línea (~2020):

```tsx
Saldo a quedar: <span className="font-semibold text-accent">{formatMoney(totalFactura - invoiceSena)}</span>
```

Reemplazar con:
```tsx
Saldo a quedar: <span className="font-semibold text-accent">{formatMoney(totalConDescuento - invoiceSena)}</span>
```

- [ ] **Step 4: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```powershell
git add src/App.tsx
git commit -m "feat: mostrar precios originales y descontados en filas de factura"
```

---

### Task 7: Actualizar `printInvoice` para reflejar el descuento

**Files:**
- Modify: `src/App.tsx` — función `printInvoice` (línea ~57-165)

- [ ] **Step 1: En la tabla de items**, reemplazar la generación de filas (línea ~119-127) para mostrar precio unit. original y descontado cuando haya descuento:

```ts
          ${factura.items.map(item => {
            const precioUnit = factura.descuento
              ? `<span style="text-decoration:line-through;color:#999;">${formatMoney(item.precio)}</span> <strong>${formatMoney(item.precio * (1 - factura.descuento))}</strong>`
              : formatMoney(item.precio);
            const subtotal = factura.descuento
              ? formatMoney(item.cant * item.precio * (1 - factura.descuento))
              : formatMoney(item.cant * item.precio);
            return `
            <tr>
              <td><strong>${item.nombre}</strong></td>
              <td>${item.categoria} • ${item.talle} • ${item.color}</td>
              <td class="text-right">${item.cant}</td>
              <td class="text-right">${precioUnit}</td>
              <td class="text-right">${subtotal}</td>
            </tr>`;
          }).join('')}
```

- [ ] **Step 2: Reemplazar el bloque del TOTAL GENERAL** (líneas ~128-131) para mostrar subtotal, descuento y total cuando aplique:

```ts
          ${factura.descuento ? `
          <tr>
            <td colspan="4" class="text-right">Subtotal</td>
            <td class="text-right" style="text-decoration:line-through;color:#999;">${formatMoney(factura.total / (1 - factura.descuento))}</td>
          </tr>
          <tr>
            <td colspan="4" class="text-right">Descuento ${Math.round(factura.descuento * 100)}%</td>
            <td class="text-right" style="color: green;">- ${formatMoney(factura.total / (1 - factura.descuento) * factura.descuento)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td colspan="4" class="text-right"><strong>TOTAL GENERAL</strong></td>
            <td class="text-right"><strong>${formatMoney(factura.total)}</strong></td>
          </tr>
```

- [ ] **Step 3: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```powershell
git add src/App.tsx
git commit -m "feat: mostrar descuento en factura impresa"
```

---

### Task 8: Verificación manual en el navegador

- [ ] **Step 1: Levantar el servidor de desarrollo**

```powershell
npm run dev
```

- [ ] **Step 2: Verificar flujo completo**

  1. Ir a "Nueva factura" → seleccionar un cliente → agregar 2-3 productos
  2. Hacer click en "Aplicar 10% dto." — verificar que el botón cambia a verde, los subtotales por fila muestran el original tachado y el descontado, y el total muestra el desglose
  3. Volver a hacer click en el botón — verificar que el descuento se quita y los precios vuelven a la normalidad
  4. Con el descuento activo, confirmar la factura
  5. Ir a historial → abrir la factura guardada → verificar que el total guardado es el descontado
  6. Imprimir la factura → verificar que aparece el precio unit. original tachado, el descontado, y el desglose de descuento al pie de la tabla
  7. Editar esa factura → verificar que el botón de descuento aparece activo (verde) al cargar

- [ ] **Step 3: Commit final**

```powershell
git add -A
git commit -m "feat: descuento manual 10% en factura - completo"
```
