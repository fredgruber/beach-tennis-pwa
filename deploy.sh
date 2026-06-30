#!/bin/bash
# =====================================================
# deploy.sh — Build e publicação da imagem Docker
# 
# Uso:
#   ./deploy.sh                          # Build local apenas
#   ./deploy.sh --push                   # Build + push para registry
#   ./deploy.sh --push --tag v1.0        # Com tag específica
#
# Variáveis de ambiente (configurar antes de usar):
#   REGISTRY      — ex: gru.ocir.io/mytenancy/beach-tennis
#   IMAGE_TAG     — padrão: latest
# =====================================================

set -e

# --- Configurações ---
APP_NAME="beach-tennis-pwa"
REGISTRY="${REGISTRY:-}"             # ex: gru.ocir.io/mytenancy/beach-tennis-pwa
IMAGE_TAG="${IMAGE_TAG:-latest}"
PUSH_IMAGE=false

# --- Parse de argumentos ---
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --push)   PUSH_IMAGE=true ;;
        --tag)    IMAGE_TAG="$2"; shift ;;
        *) echo "Argumento desconhecido: $1"; exit 1 ;;
    esac
    shift
done

FULL_IMAGE="${REGISTRY:-$APP_NAME}:${IMAGE_TAG}"

echo ""
echo "🏖️  Arena Beach Tennis — Deploy"
echo "======================================================"
echo "📦 Imagem: ${FULL_IMAGE}"
echo "📤 Push:   ${PUSH_IMAGE}"
echo ""

# --- Build da imagem de produção ---
echo "🔨 [1/3] Construindo imagem Docker de produção..."
docker build \
  --build-arg SPRING_PROFILES_ACTIVE=prod \
  -t "${APP_NAME}:latest" \
  -t "${APP_NAME}:${IMAGE_TAG}" \
  .

if [ -n "$REGISTRY" ]; then
    docker tag "${APP_NAME}:${IMAGE_TAG}" "${FULL_IMAGE}"
fi

echo "✅ Imagem construída: ${FULL_IMAGE}"

# --- Push para o registry ---
if [ "$PUSH_IMAGE" = true ]; then
    if [ -z "$REGISTRY" ]; then
        echo ""
        echo "❌ Erro: defina a variável REGISTRY antes de usar --push"
        echo "   Exemplo: REGISTRY=gru.ocir.io/mytenancy/beach-tennis-pwa ./deploy.sh --push"
        exit 1
    fi
    
    echo ""
    echo "📤 [2/3] Enviando imagem para o registry..."
    docker push "${FULL_IMAGE}"
    echo "✅ Push concluído: ${FULL_IMAGE}"
fi

# --- Instruções finais ---
echo ""
echo "======================================================"
echo "✅ Build concluído!"
echo ""
echo "Para rodar em produção localmente:"
echo "  docker compose -f docker-compose.prod.yml up -d"
echo ""

if [ "$PUSH_IMAGE" = true ] && [ -n "$REGISTRY" ]; then
    echo "Para fazer deploy no OCI Container Instance:"
    echo "  Imagem: ${FULL_IMAGE}"
    echo "  Porta:  8080"
    echo "  Variável: SPRING_PROFILES_ACTIVE=prod"
fi
echo "======================================================"
