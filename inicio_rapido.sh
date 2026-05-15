#!/bin/bash

# Colores para el terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

clear

echo -e "${BLUE}"
echo "========================================"
echo "  SISTEMA CUENTA CORRIENTE MAYORISTA"
echo "========================================"
echo -e "${NC}"
echo ""
echo "Iniciando el sistema..."
echo ""

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js no está instalado${NC}"
    echo ""
    echo "Por favor instala Node.js desde: https://nodejs.org"
    echo "Descarga la versión LTS (recomendada)"
    echo ""
    read -p "Presiona Enter para salir..."
    exit 1
fi

# Verificar si las dependencias están instaladas
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias del sistema..."
    echo "Esto puede tomar 1-2 minutos..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}ERROR: No se pudieron instalar las dependencias${NC}"
        echo ""
        read -p "Presiona Enter para salir..."
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}"
echo "=========================================="
echo "  SISTEMA INICIADO CORRECTAMENTE"
echo "=========================================="
echo -e "${NC}"
echo ""
echo "Tu sistema está funcionando en:"
echo ""
echo -e "    ${YELLOW}http://localhost:5173${NC}"
echo ""
echo "- El navegador se abrirá automáticamente"
echo "- Para CERRAR el sistema: presiona Ctrl+C"
echo ""
echo "=========================================="
echo ""

# Abrir navegador automáticamente (funciona en Mac y Linux)
if command -v open &> /dev/null; then
    # macOS
    open http://localhost:5173
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:5173
fi

# Iniciar el sistema
npm run dev:full