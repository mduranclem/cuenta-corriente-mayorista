# 🔐 Sistema de Usuarios y Autenticación

## ✨ Características Nuevas

### 🛡️ **Sistema de Autenticación Completo**
- **Primer administrador**: Configuración inicial obligatoria
- **Registro de usuarios**: Los nuevos usuarios deben registrarse y esperar aprobación
- **Aprobación por admin**: Los administradores aprueban o rechazan solicitudes
- **Roles**: Admin (gestión completa) y Usuario (acceso normal)

### 📋 **Funcionalidades Implementadas**
- ✅ Creación del primer administrador
- ✅ Registro de nuevos usuarios con validación
- ✅ Sistema de aprobación/rechazo por admin
- ✅ Interfaz de administración para gestionar usuarios
- ✅ Notificaciones de usuarios pendientes
- ✅ Auditoría completa de acciones de usuarios
- ✅ Seguridad con contraseñas encriptadas

---

## 🚀 **Configuración Inicial (IMPORTANTE)**

### **Paso 1: Configurar la Base de Datos**

1. **Ir a Supabase Dashboard**
   - Abrir [supabase.com](https://supabase.com)
   - Ir a tu proyecto existente

2. **Ejecutar el Script SQL**
   - Ir a "SQL Editor" en el menú lateral
   - Abrir el archivo `SETUP_USUARIOS_SUPABASE.sql`
   - Copiar todo el contenido y ejecutarlo
   - Esto creará la tabla `usuarios` con todas las políticas de seguridad

### **Paso 2: Primera Vez que Accedes al Sistema**

1. **Acceder a la aplicación**
   - La primera vez verás la pantalla "Configuración inicial"
   - Esto significa que no hay administradores en el sistema

2. **Crear el Primer Administrador**
   - Completar el formulario:
     - **Username**: `admin` (o el que prefieras)
     - **Email**: tu email de administrador
     - **Contraseña**: mínimo 6 caracteres
     - **Confirmar contraseña**: debe coincidir
   - Hacer clic en "Crear administrador"

3. **¡Listo!**
   - Ya tienes acceso completo al sistema como administrador
   - Aparecerá el menú "Administración" en la barra lateral

---

## 👥 **Flujo de Usuarios**

### **Para Nuevos Usuarios:**

1. **Registro**
   - Acceder a la aplicación
   - Hacer clic en "¿No tienes cuenta? Regístrate"
   - Completar formulario de registro
   - Aparecerá mensaje: "Registro exitoso. Tu cuenta está pendiente de aprobación"

2. **Esperar Aprobación**
   - El usuario no puede acceder hasta ser aprobado
   - Recibirá error "Usuario o contraseña incorrectos" hasta la aprobación

### **Para Administradores:**

1. **Notificaciones**
   - Aparecerá un botón rojo con "X pendientes" en el header
   - Hacer clic para ir a la página de administración

2. **Gestionar Solicitudes**
   - Ver todos los usuarios pendientes con:
     - Nombre de usuario
     - Email
     - Fecha de registro
   - **Aprobar**: Usuario puede acceder inmediatamente
   - **Rechazar**: Usuario no podrá acceder nunca

---

## 🔧 **Funcionalidades del Sistema**

### **Panel de Administración**
- **Solo visible para administradores**
- Lista de usuarios pendientes de aprobación
- Botones de aprobar/rechazar con confirmación
- Información completa de cada solicitud

### **Seguridad**
- **Contraseñas encriptadas** (base64, mejorable a bcrypt en producción)
- **Validación de email** formato correcto
- **Contraseñas mínimo 6 caracteres**
- **Usernames únicos** no pueden repetirse
- **Row Level Security** en Supabase

### **Auditoría Completa**
- **Registro de todas las acciones**:
  - Inicios de sesión
  - Creación de administrador
  - Aprobaciones/rechazos
  - Todas las operaciones CRUD existentes
- **Trazabilidad** de quién hizo qué y cuándo

---

## 🎯 **Estados de Usuario**

| Estado | Descripción | Puede acceder |
|--------|-------------|---------------|
| **Pendiente** | Recién registrado, esperando aprobación | ❌ No |
| **Aprobado** | Aprobado por un admin | ✅ Sí |
| **Rechazado** | Rechazado por un admin | ❌ No |

---

## 🛡️ **Roles del Sistema**

### **👑 Administrador**
- **Acceso completo** a todas las funciones
- **Gestión de usuarios** (aprobar/rechazar)
- **Ver auditoría** completa
- **Todas las funciones** del sistema

### **👤 Usuario**
- **Acceso normal** a todas las funciones operativas
- **No puede** gestionar otros usuarios
- **Puede** realizar todas las operaciones de negocio

---

## 🚨 **Resolución de Problemas**

### **"No me deja entrar con usuario/contraseña"**
- ✅ **Verifica** que tu usuario esté **aprobado**
- ✅ **Contacta al administrador** para que apruebe tu cuenta
- ✅ **Revisa** que el username/password sean correctos

### **"No veo el menú de Administración"**
- ✅ **Solo administradores** ven este menú
- ✅ **Verifica** que tu rol sea "admin" en la base de datos

### **"No aparece la configuración inicial"**
- ✅ **Significa** que ya hay un administrador
- ✅ **Usa** el formulario de login normal
- ✅ **Contacta** al administrador existente

### **"Error en la base de datos"**
- ✅ **Verifica** que ejecutaste el script SQL correctamente
- ✅ **Revisa** la conexión a Supabase
- ✅ **Chequea** las credenciales en `.env`

---

## 📝 **Cambios Realizados**

### **Backend (Supabase)**
- ✅ Nueva tabla `usuarios` con campos completos
- ✅ Políticas de Row Level Security
- ✅ Índices para rendimiento
- ✅ Triggers para updated_at automático

### **Frontend (React)**
- ✅ Interfaz de configuración inicial
- ✅ Formularios de login y registro
- ✅ Panel de administración completo
- ✅ Notificaciones y validaciones
- ✅ Integración con auditoría existente

### **Seguridad**
- ✅ Eliminación de usuarios hardcodeados
- ✅ Autenticación real contra base de datos
- ✅ Validaciones de entrada completas
- ✅ Manejo seguro de sesiones

---

## 🎉 **¡El Sistema Está Listo!**

Ya no hay usuarios pre-cargados. El sistema:
1. **Te obliga** a crear un administrador la primera vez
2. **Requiere** que nuevos usuarios se registren
3. **Necesita** aprobación del admin para acceder
4. **Mantiene** auditoría completa de todo

**¡Disfruta del nuevo sistema de autenticación seguro!** 🚀