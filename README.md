# Cuenta Corriente Mayorista

Aplicación SPA para gestión de facturas, clientes, pagos y productos.

## Estado actual

- Proyecto listo con React + Vite + TailwindCSS
- `npm install` ya se ejecutó
- El build de producción ya está generado en `dist/`

## Cómo enviar el link al cliente

La app ya está lista para subir a un hosting estático.

### Netlify

1. Crear una cuenta en https://www.netlify.com (si no tenés una).
2. Conectar el repositorio o arrastrar la carpeta `dist/` a Netlify.
3. Si usás el deploy automático con Git, la configuración es:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Netlify generará una URL de acceso público.

### Vercel

1. Crear una cuenta en https://vercel.com.
2. Conectar el repositorio o subir el proyecto.
3. Vercel detecta el `package.json` y puede usar `npm run build` automáticamente.
4. La app se desplegará en una URL pública.

### Archivos de configuración incluidos

- `netlify.toml` para Netlify
- `vercel.json` para Vercel

## Cómo ver la app localmente

1. Desde la carpeta del proyecto:
   ```bash
   npm install
   ```
2. Si querés arrancar solo el frontend:
   ```bash
   npm run dev -- --host 0.0.0.0
   ```
3. Si querés arrancar frontend y backend juntos en una sola terminal:
   ```bash
   npm run dev:full
   ```
4. Si querés usar el backend local para que los datos se guarden en el servidor en lugar de `localStorage`:
   ```bash
   npm run server
   ```
5. Abrí en el navegador:
   ```
   http://127.0.0.1:5173/
   ```

> Para activar el backend local, copia `.env.example` a `.env` y deja `VITE_API_URL=http://localhost:4000`.
> 
> Si vas a desplegar el backend y el frontend juntos, pon `VITE_API_URL=/api` antes de ejecutar `npm run build`.

## Cómo generar el build de producción

1. Generar el frontend:
   ```bash
   npm run build
   ```
2. Arrancar el servidor que sirve el frontend y la API:
   ```bash
   npm start
   ```

> El servidor cargará la carpeta `dist/` y servirá la app estática junto a la API REST.

## Despliegue profesional

Para desplegar este proyecto con backend Node, se recomienda usar un servicio que soporte Node.js como Render, Railway o Heroku.

- Asegurate de generar el build antes del despliegue con `npm run build`.
- El servidor de producción usa `npm start` y sirve tanto la API como los archivos estáticos de `dist/`.
- Usa un archivo `.env` para configurar variables si necesitás cambiar la URL de la API o el puerto.

### Render

Se incluye `render.yaml` para desplegar en Render con el backend y frontend juntos. El servicio está configurado para compilar usando `npm run build` y ejecutar `npm start`.

### Opción frontend-only

Si querés usar solo la parte de frontend y mantener datos en `localStorage`, podés desplegar la carpeta `dist/` en un hosting estático como Netlify o Vercel. En ese caso no se usa el backend Node.

1. Ejecutar:
   ```bash
   npm run build
   ```
2. Subir el contenido de `dist/` al hosting estático.

### Opción Docker

Para un despliegue profesional con backend y frontend en el mismo contenedor, podés usar el `Dockerfile` incluido.

1. Construir la imagen:
   ```bash
   docker build -t cuenta-corriente-mayorista .
   ```
2. Ejecutar el contenedor:
   ```bash
   docker run -p 4000:4000 cuenta-corriente-mayorista
   ```

Si querés que el frontend use la API del mismo host dentro del contenedor, configura `VITE_API_URL=/api` antes de ejecutar `npm run build`.

## Nota sobre datos

Por defecto la aplicación usa `localStorage` como respaldo. Si arrancás el backend local con `npm run server` y configurás `VITE_API_URL=http://localhost:4000`, la app guardará los datos en un archivo JSON del servidor en lugar del navegador.

## Links útiles para desplegar

- Vercel: https://vercel.com
- Netlify: https://www.netlify.com
- Surge: https://surge.sh
# Forzar refresh de Netlify
