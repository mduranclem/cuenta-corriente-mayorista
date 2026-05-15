@echo off
title Actualizar Sistema Cuenta Corriente
color 0E

echo.
echo ========================================
echo   ACTUALIZACION DEL SISTEMA
echo ========================================
echo.

REM Verificar si Git está instalado
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Git no esta instalado.
    echo.
    echo OPCION A: Instala Git desde https://git-scm.com
    echo OPCION B: Descarga manualmente los archivos actualizados
    echo.
    pause
    exit /b 1
)

REM Verificar si es un repositorio Git
if not exist ".git" (
    echo Configurando repositorio por primera vez...
    echo.
    echo Ingresa la URL del repositorio de tu desarrollador:
    set /p repo_url="URL del repositorio: "

    REM Respaldar archivos actuales
    if exist "backup_antes_update" rmdir /s /q "backup_antes_update"
    mkdir backup_antes_update
    xcopy "server\data" "backup_antes_update\data\" /E /I /H /Y >nul 2>&1

    REM Inicializar Git y conectar al repositorio
    git init
    git remote add origin %repo_url%
    git fetch origin
    git checkout -b main origin/main
) else (
    echo Verificando actualizaciones...
    echo.

    REM Respaldar datos del cliente antes de actualizar
    if exist "backup_antes_update" rmdir /s /q "backup_antes_update"
    mkdir backup_antes_update
    xcopy "server\data" "backup_antes_update\data\" /E /I /H /Y >nul 2>&1

    REM Obtener actualizaciones
    git fetch origin

    REM Verificar si hay actualizaciones disponibles
    for /f %%i in ('git rev-list HEAD..origin/main --count') do set UPDATE_COUNT=%%i

    if %UPDATE_COUNT%==0 (
        echo ✅ Tu sistema esta actualizado
        echo No hay nuevas versiones disponibles.
        echo.
        pause
        exit /b 0
    )

    echo 🔄 Se encontraron %UPDATE_COUNT% actualizaciones disponibles
    echo.
    choice /M "¿Deseas actualizar ahora"
    if errorlevel 2 (
        echo Actualización cancelada.
        pause
        exit /b 0
    )

    echo.
    echo Descargando actualizaciones...
    git pull origin main
)

echo.
echo Instalando dependencias actualizadas...
npm install

echo.
echo Restaurando tus datos...
if exist "backup_antes_update\data" (
    xcopy "backup_antes_update\data\*" "server\data\" /E /I /H /Y >nul 2>&1
    echo ✅ Datos restaurados correctamente
)

echo.
echo ==========================================
echo   ✅ SISTEMA ACTUALIZADO CORRECTAMENTE
echo ==========================================
echo.
echo Tu sistema ha sido actualizado con las últimas mejoras.
echo Tus datos se mantuvieron intactos.
echo.
echo Puedes iniciar el sistema normalmente.
echo.
pause