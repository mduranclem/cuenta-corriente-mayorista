-- Script SQL COMPLETO para sistema de usuarios en Supabase
-- Solo agrega las tablas que faltan (usuarios y auditoría)

-- ========================================
-- 1. TABLA DE USUARIOS (NUEVA)
-- ========================================
CREATE TABLE IF NOT EXISTS public.usuarios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username varchar(50) UNIQUE NOT NULL,
    email varchar(100) NOT NULL,
    password_hash text NOT NULL,
    rol varchar(20) CHECK (rol IN ('admin', 'usuario')) DEFAULT 'usuario',
    estado varchar(20) CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')) DEFAULT 'pendiente',
    creado_por uuid REFERENCES public.usuarios(id),
    aprobado_por uuid REFERENCES public.usuarios(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ========================================
-- 2. TABLA DE AUDITORÍA (NUEVA)
-- ========================================
CREATE TABLE IF NOT EXISTS public.auditoria (
    id SERIAL PRIMARY KEY,
    usuario varchar(50) NOT NULL,
    accion varchar(100) NOT NULL,
    entidad varchar(20) CHECK (entidad IN ('cliente', 'producto', 'factura', 'pago')) NOT NULL,
    entidad_id varchar(50),
    detalles text,
    fecha timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- ========================================
-- 3. ÍNDICES PARA RENDIMIENTO
-- ========================================
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON public.usuarios(username);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON public.usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON public.auditoria(usuario);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON public.auditoria(entidad);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria(fecha);

-- ========================================
-- 4. HABILITAR ROW LEVEL SECURITY
-- ========================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 5. POLÍTICAS DE SEGURIDAD PARA USUARIOS
-- ========================================

-- Permitir que todos puedan insertar usuarios (para registro)
DROP POLICY IF EXISTS "Allow insert for registration" ON public.usuarios;
CREATE POLICY "Allow insert for registration" ON public.usuarios
    FOR INSERT WITH CHECK (true);

-- Permitir que todos lean usuarios aprobados
DROP POLICY IF EXISTS "Allow read approved users" ON public.usuarios;
CREATE POLICY "Allow read approved users" ON public.usuarios
    FOR SELECT USING (estado = 'aprobado');

-- Solo admins pueden actualizar usuarios (aprobar/rechazar)
DROP POLICY IF EXISTS "Allow admins to update users" ON public.usuarios;
CREATE POLICY "Allow admins to update users" ON public.usuarios
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            WHERE u.username = current_setting('request.jwt.claims', true)::json->>'username'
            AND u.rol = 'admin'
            AND u.estado = 'aprobado'
        )
    );

-- ========================================
-- 6. POLÍTICAS DE SEGURIDAD PARA AUDITORÍA
-- ========================================

-- Permitir insertar auditoría para todos
DROP POLICY IF EXISTS "Allow insert audit" ON public.auditoria;
CREATE POLICY "Allow insert audit" ON public.auditoria
    FOR INSERT WITH CHECK (true);

-- Solo admins pueden leer auditoría
DROP POLICY IF EXISTS "Allow admins read audit" ON public.auditoria;
CREATE POLICY "Allow admins read audit" ON public.auditoria
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            WHERE u.username = current_setting('request.jwt.claims', true)::json->>'username'
            AND u.rol = 'admin'
            AND u.estado = 'aprobado'
        )
    );

-- ========================================
-- 7. FUNCIÓN PARA UPDATED_AT AUTOMÁTICO
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- 8. TRIGGERS PARA UPDATED_AT
-- ========================================
DROP TRIGGER IF EXISTS handle_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER handle_usuarios_updated_at
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- ========================================
-- 9. COMENTARIOS EXPLICATIVOS
-- ========================================
COMMENT ON TABLE public.usuarios IS 'Tabla de usuarios del sistema con autenticación y roles';
COMMENT ON COLUMN public.usuarios.id IS 'UUID único del usuario';
COMMENT ON COLUMN public.usuarios.username IS 'Nombre de usuario único';
COMMENT ON COLUMN public.usuarios.email IS 'Email del usuario';
COMMENT ON COLUMN public.usuarios.password_hash IS 'Hash de la contraseña (base64)';
COMMENT ON COLUMN public.usuarios.rol IS 'Rol del usuario: admin o usuario';
COMMENT ON COLUMN public.usuarios.estado IS 'Estado: pendiente, aprobado o rechazado';
COMMENT ON COLUMN public.usuarios.creado_por IS 'Usuario que creó esta cuenta (opcional)';
COMMENT ON COLUMN public.usuarios.aprobado_por IS 'Admin que aprobó/rechazó la cuenta';

COMMENT ON TABLE public.auditoria IS 'Tabla de auditoría para registrar todas las acciones del sistema';
COMMENT ON COLUMN public.auditoria.usuario IS 'Usuario que realizó la acción';
COMMENT ON COLUMN public.auditoria.accion IS 'Descripción de la acción realizada';
COMMENT ON COLUMN public.auditoria.entidad IS 'Tipo de entidad afectada';
COMMENT ON COLUMN public.auditoria.entidad_id IS 'ID de la entidad afectada';
COMMENT ON COLUMN public.auditoria.detalles IS 'Información adicional de la acción';

-- ========================================
-- 10. VERIFICACIÓN FINAL
-- ========================================
-- Mostrar que las tablas se crearon correctamente
SELECT 'TABLA USUARIOS CREADA' as status, count(*) as registros FROM public.usuarios;
SELECT 'TABLA AUDITORÍA CREADA' as status, count(*) as registros FROM public.auditoria;

-- ========================================
-- ¡LISTO! EL SISTEMA DE USUARIOS ESTÁ CONFIGURADO
-- ========================================