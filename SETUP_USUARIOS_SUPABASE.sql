-- Script SQL para crear la tabla de usuarios en Supabase
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- 1. Crear la tabla de usuarios
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

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON public.usuarios(username);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON public.usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios(rol);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad
-- Permitir que todos puedan insertar usuarios (para el registro)
CREATE POLICY "Allow insert for registration" ON public.usuarios
    FOR INSERT WITH CHECK (true);

-- Permitir que los usuarios vean solo usuarios aprobados y sus propios datos
CREATE POLICY "Allow read approved users" ON public.usuarios
    FOR SELECT USING (
        estado = 'aprobado' OR
        auth.uid()::text = id::text
    );

-- Solo admins pueden actualizar usuarios (aprobar/rechazar)
CREATE POLICY "Allow admins to update users" ON public.usuarios
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE id::text = auth.uid()::text
            AND rol = 'admin'
            AND estado = 'aprobado'
        )
    );

-- 5. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Crear trigger para updated_at
CREATE TRIGGER handle_usuarios_updated_at
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- 7. Comentarios explicativos
COMMENT ON TABLE public.usuarios IS 'Tabla de usuarios del sistema con autenticación y roles';
COMMENT ON COLUMN public.usuarios.id IS 'UUID único del usuario';
COMMENT ON COLUMN public.usuarios.username IS 'Nombre de usuario único';
COMMENT ON COLUMN public.usuarios.email IS 'Email del usuario';
COMMENT ON COLUMN public.usuarios.password_hash IS 'Hash de la contraseña (base64 simple)';
COMMENT ON COLUMN public.usuarios.rol IS 'Rol del usuario: admin o usuario';
COMMENT ON COLUMN public.usuarios.estado IS 'Estado: pendiente, aprobado o rechazado';
COMMENT ON COLUMN public.usuarios.creado_por IS 'Usuario que creó esta cuenta (opcional)';
COMMENT ON COLUMN public.usuarios.aprobado_por IS 'Admin que aprobó/rechazó la cuenta';