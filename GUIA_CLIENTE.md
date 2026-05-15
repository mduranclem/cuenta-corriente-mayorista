# Sistema de Cuenta Corriente Mayorista

## 🎯 ¿Qué hace tu sistema?

Tu sistema de cuenta corriente mayorista te permite:

- **Gestionar clientes** con precios diferenciados (general y especial)
- **Manejar inventario** de productos con múltiples variantes (talle, color)
- **Emitir facturas** rápidamente con búsqueda de productos
- **Registrar pagos** en diferentes formas (efectivo, transferencia, etc.)
- **Llevar cuenta corriente** automática por cliente
- **Hacer backup** de todos los datos

## 📋 Funcionalidades principales

### 1. Dashboard - Nueva Factura
- Seleccionas el cliente y la fecha
- Buscas productos por nombre, categoría, talle o color
- El sistema aplica automáticamente el precio según la categoría del cliente
- Se calcula el total automáticamente
- Al confirmar, se actualiza la cuenta del cliente

### 2. Clientes
- Lista todos los clientes con su saldo pendiente
- Muestra categoría de precio y último pago
- Botón de "Pago rápido" para registrar pagos fácilmente
- Puedes hacer clic en el nombre para ver la cuenta detallada

### 3. Cuenta Corriente
- Ve el detalle completo de un cliente
- Saldo pendiente, total comprado y total pagado
- Historial de compras con productos y fechas
- Historial de pagos con formas de pago y notas

### 4. Historial de Facturas
- Todas las facturas emitidas ordenadas por fecha
- Número, cliente, productos y total

### 5. Productos
- Gestión completa del inventario
- Precios diferenciados: general y especial
- Búsqueda y filtros
- Editar y eliminar productos

### 6. Backup
- Exportar todos los datos a un archivo JSON
- Importar datos desde archivo o texto JSON
- Ideal para hacer respaldos periódicos

## 🚀 Cómo usar tu sistema

### Acceso al sistema
Tu sistema ya está desplegado y listo. Puedes accederlo desde cualquier navegador en:

**Render.com**: `https://tu-app.onrender.com` (configurar en Render)
**Netlify**: Solo frontend con localStorage (más simple)
**Vercel**: Solo frontend con localStorage (más simple)

### Para agregar productos nuevos
1. Ve a "Productos"
2. Haz clic en "Nuevo producto"
3. Completa nombre, categoría, talle, color
4. Define precio general y precio especial (opcional)
5. Guarda

### Para crear una factura
1. Ve al Dashboard
2. Selecciona el cliente
3. Busca productos escribiendo en el campo "Buscar producto"
4. Ajusta cantidades y precios si es necesario
5. Agrega más productos con "Añadir"
6. Confirma la factura

### Para registrar un pago
1. Desde "Clientes" usa "Pago rápido"
2. O desde la cuenta del cliente "Registrar pago"
3. Selecciona fecha, monto y forma de pago
4. Agrega notas si es necesario

## 💾 Respaldos importantes

**¡IMPORTANTE!** Haz backup regularmente:

1. Ve a "Respaldo de datos"
2. Haz clic en "Descargar backup"
3. Guarda el archivo JSON en tu computadora
4. Haz esto semanalmente o antes de cambios importantes

Para restaurar:
1. Ve a "Respaldo de datos"
2. Sube el archivo JSON o pega el contenido
3. Haz clic en "Restaurar desde JSON"

## 🔧 Configuración técnica

### Modo solo frontend (más simple)
- Los datos se guardan en el navegador (localStorage)
- Ideal para uso personal
- No requiere servidor

### Modo con backend (profesional)
- Los datos se guardan en el servidor
- Ideal para múltiples usuarios
- Requiere hosting con Node.js

## 📞 Soporte

Si necesitas ayuda:
1. Revisa esta guía
2. Haz backup antes de cualquier cambio
3. Contacta para soporte técnico si es necesario

## 🎨 Personalización

El sistema está diseñado para ser limpio y profesional:
- Colores neutros y profesionales
- Interface responsive (funciona en móvil y desktop)
- Diseño moderno con TailwindCSS
- Fácil de usar sin entrenamiento

---

**¡Tu sistema está listo para usar!** 🚀