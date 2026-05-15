@echo off
title Sistema Cuenta Corriente Mayorista
color 0A

echo.
echo ========================================
echo   SISTEMA CUENTA CORRIENTE MAYORISTA
echo ========================================
echo.
echo Iniciando el sistema...
echo.

REM Verificar si Node.js esta instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    echo.
    echo Por favor instala Node.js desde: https://nodejs.org
    echo Descarga la version LTS ^(recomendada^)
    echo.
    pause
    exit /b 1
)

REM Verificar si las dependencias estan instaladas
if not exist "node_modules" (
    echo Instalando dependencias del sistema...
    echo Esto puede tomar 1-2 minutos...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: No se pudieron instalar las dependencias
        echo.
        pause
        exit /b 1
    )
)

echo.
echo ==========================================
echo   SISTEMA INICIADO CORRECTAMENTE
echo ==========================================
echo.
echo Tu sistema esta funcionando en:
echo.
echo     http://localhost:5173
echo.
echo - El navegador se abrira automaticamente
echo - Para CERRAR el sistema: presiona Ctrl+C
echo.
echo ==========================================
echo.

REM Abrir navegador automaticamente
start http://localhost:5173

REM Iniciar el sistema
npm run dev:full