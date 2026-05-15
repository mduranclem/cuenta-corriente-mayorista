# 🚀 Instrucciones de Deploy - Sistema Cuenta Corriente

## Opciones de deploy disponibles

Tu proyecto está configurado para 3 plataformas diferentes. Elige la que mejor se adapte a tus necesidades:

### 🔵 1. Render (RECOMENDADO - Con Backend)
**✅ Mejor opción para uso profesional**
- Frontend + Backend en el mismo servicio
- Base de datos persistente en servidor
- Gratis hasta cierto límite de uso
- Se mantiene siempre activo

**Cómo desplegar:**
1. Ve a https://render.com y crea una cuenta
2. Conecta tu repositorio de GitHub
3. Selecciona "Web Service"
4. El archivo `render.yaml` ya está configurado
5. Render detectará automáticamente la configuración
6. Tu app estará disponible en `https://tu-app.onrender.com`

**Configuración automática:**
- Build: `npm install && npm run build`
- Start: `npm start`
- Variable: `VITE_API_URL=/api`

---

### 🟢 2. Netlify (Solo Frontend)
**✅ Opción más simple y rápida**
- Solo frontend, datos en localStorage del navegador
- Deploy súper rápido
- Perfecto para demos y uso personal

**Cómo desplegar:**
1. Ve a https://netlify.com y crea una cuenta
2. Conecta tu repositorio o arrastra la carpeta `dist/`
3. Si usas GitHub:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. El archivo `netlify.toml` ya está configurado
5. Tu app estará disponible en `https://tu-app.netlify.app`

---

### 🔷 3. Vercel (Solo Frontend)
**✅ Alternativa a Netlify**
- Solo frontend, datos en localStorage
- Deploy automático con GitHub
- Interface muy amigable

**Cómo desplegar:**
1. Ve a https://vercel.com y crea una cuenta
2. Conecta tu repositorio de GitHub
3. Vercel detectará el proyecto automáticamente
4. El archivo `vercel.json` ya está configurado
5. Tu app estará disponible en `https://tu-app.vercel.app`

---

## 🛠️ Deploy Manual con Docker

Si tienes servidor propio:

```bash
# 1. Clonar el repo
git clone tu-repositorio
cd SISTEMA.MAMA

# 2. Construir imagen
docker build -t cuenta-corriente-mayorista .

# 3. Ejecutar
docker run -p 4000:4000 cuenta-corriente-mayorista
```

---

## 📋 Checklist antes del deploy

- [x] ✅ Build funciona: `npm run build`
- [x] ✅ Servidor funciona: `npm start`
- [x] ✅ Archivos de configuración listos
- [x] ✅ README actualizado
- [x] ✅ Documentación para cliente creada

---

## 🎯 Recomendación final

**Para tu cliente mayorista, usa RENDER:**
- Datos persistentes en servidor (no se pierden)
- Múltiples usuarios pueden acceder
- Más profesional y confiable
- Backup automático en servidor

**Para demos o uso personal, usa NETLIFY:**
- Deploy en 2 minutos
- Gratis para siempre
- Perfecto para mostrar el sistema

---

## 🔗 URLs de ejemplo

Una vez desplegado, comparte con tu cliente:

**Render**: `https://cuenta-corriente-mayorista.onrender.com`
**Netlify**: `https://cuenta-corriente-mayorista.netlify.app`
**Vercel**: `https://cuenta-corriente-mayorista.vercel.app`

(Los nombres exactos pueden variar según disponibilidad)

---

## 📞 Próximos pasos

1. **Elige una plataforma** (recomiendo Render)
2. **Despliega el proyecto**
3. **Prueba todas las funcionalidades**
4. **Comparte la URL con tu cliente**
5. **Entrega la GUIA_CLIENTE.md**

¡Tu sistema está 100% listo para producción! 🎉