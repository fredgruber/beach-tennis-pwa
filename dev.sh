#!/bin/bash
# =====================================================
# dev.sh — Sobe o ambiente de desenvolvimento local
# Uso: ./dev.sh
# =====================================================

set -e

echo ""
echo "🏖️  Arena Beach Tennis — Ambiente de Desenvolvimento"
echo "======================================================"

# Criar pasta de dados se não existir
mkdir -p data

# Parar container anterior se existir
echo "🔄 Parando ambiente anterior (se existir)..."
docker compose down 2>/dev/null || true

# Construir e subir
echo "🔨 Construindo a imagem..."
docker compose build

echo "🚀 Subindo o servidor..."
docker compose up -d

echo ""
echo "✅ Servidor rodando em: http://localhost:8080"
echo "📊 H2 Console:         http://localhost:8080/h2-console"
echo "   JDBC URL:           jdbc:h2:file:./data/beachtennis"
echo ""
echo "📋 Comandos úteis:"
echo "   Logs:   docker compose logs -f"
echo "   Parar:  docker compose down"
echo "======================================================"
