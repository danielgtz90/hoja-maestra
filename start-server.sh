#!/bin/bash

# ================================================
# Script para Probar la PWA Localmente
# ================================================

echo "🚀 Iniciando servidor local para PWA..."
echo ""
echo "📱 Instrucciones:"
echo "1. El servidor se iniciará en http://localhost:8000"
echo "2. Abre Chrome o Edge en esa URL"
echo "3. Busca el ícono ➕ en la barra de direcciones"
echo "4. Click en 'Instalar' para probar la PWA"
echo ""
echo "⚠️  NOTA: Para funcionalidad completa de PWA, necesitas HTTPS"
echo "   En localhost funciona para testing básico"
echo ""
echo "🛑 Para detener el servidor: Ctrl+C"
echo ""
echo "================================================"
echo ""

# Ir al directorio de la app
cd "$(dirname "$0")"

# Iniciar servidor Python
if command -v python3 &> /dev/null; then
    echo "✅ Usando Python 3"
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "✅ Usando Python 2"
    python -m SimpleHTTPServer 8000
else
    echo "❌ Error: Python no encontrado"
    echo "   Instala Python para continuar"
    exit 1
fi
