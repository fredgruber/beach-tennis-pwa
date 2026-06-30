#!/bin/bash

# Parar e remover container anterior se existir
echo "Parando containers antigos..."
docker stop beach-tennis-pwa-app 2>/dev/null || true
docker rm beach-tennis-pwa-app 2>/dev/null || true

# Criar diretório de dados local para persistência do banco H2
mkdir -p data
chmod 777 data

# Construir a imagem Docker
echo "Construindo a imagem Docker (isso pode levar alguns minutos na primeira execução)..."
docker build -t beach-tennis-pwa .

# Executar o container
echo "Iniciando o container com volume de dados persistente..."
docker run -d \
  -p 8080:8080 \
  --name beach-tennis-pwa-app \
  -v "$(pwd)/data:/app/data" \
  beach-tennis-pwa

echo "--------------------------------------------------"
echo "Sucesso! Aplicação rodando em: http://localhost:8080"
echo "Para ver os logs do container, execute: docker logs -f beach-tennis-pwa-app"
echo "--------------------------------------------------"
