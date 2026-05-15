@echo off
title Actualizar Sistema - Manual
color 0B

echo.
echo ========================================
echo   ACTUALIZAR SISTEMA MANUALMENTE
echo ========================================
echo.
echo Este script te ayuda a actualizar cuando recibes
echo nuevos archivos de tu desarrollador.
echo.

REM Respaldar datos importantes
echo 📦 Respaldando tus datos...
if exist "backup_datos" rmdir /s /q "backup_datos"
mkdir backup_datos

REM Respaldar datos del servidor
if exist "server\data" (
    xcopy "server\data" "backup_datos\data\" /E /I /H /Y >nul 2>&1
    echo ✅ Datos del servidor respaldados
)

REM Respaldar configuraciones
if exist ".env" (
    copy ".env" "backup_datos\.env" >nul 2>&1
    echo ✅ Configuraciones respaldadas
)

echo.
echo 📂 INSTRUCCIONES PARA ACTUALIZAR:
echo.
echo 1. Descarga los archivos actualizados de tu desarrollador
echo 2. Extrae SOLO estos archivos sobre tu carpeta actual:
echo    - src/
echo    - server/ (excepto server/data)
echo    - package.json
echo    - vite.config.ts
echo    - tailwind.config.js
echo    - tsconfig.json
echo    - index.html
echo.
echo 3. NO reemplaces:
echo    - server/data/ (tus datos)
echo    - .env (tu configuración)
echo.
echo 4. Presiona cualquier tecla cuando hayas terminado...
pause >nul

echo.
echo 🔄 Instalando actualizaciones...
npm install

echo.
echo 📊 Restaurando tus datos...
if exist "backup_datos\data" (
    if not exist "server\data" mkdir "server\data"
    xcopy "backup_datos\data\*" "server\data\" /E /I /H /Y >nul 2>&1
    echo ✅ Datos restaurados
)

if exist "backup_datos\.env" (
    copy "backup_datos\.env" ".env" >nul 2>&1
    echo ✅ Configuraciones restauradas
)

echo.
echo ==========================================
echo   ✅ ACTUALIZACIÓN COMPLETADA
echo ==========================================
echo.
echo Tu sistema está actualizado y tus datos intactos.
echo Ya puedes usar el sistema normalmente.
echo.
pause