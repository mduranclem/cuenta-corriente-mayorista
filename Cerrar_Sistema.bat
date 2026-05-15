@echo off
title Cerrando Sistema Cuenta Corriente
color 0C

echo.
echo ========================================
echo   CERRANDO SISTEMA CUENTA CORRIENTE
echo ========================================
echo.

REM Cerrar Node.js y npm processes
echo Cerrando procesos del sistema...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.cmd >nul 2>&1
taskkill /f /im conhost.exe >nul 2>&1

echo.
echo ✅ Sistema cerrado correctamente
echo.
echo Puedes cerrar esta ventana.
echo.

timeout /t 3 >nul