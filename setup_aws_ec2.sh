#!/bin/bash
# ==============================================================================
# Script de Automação de Instalação e Deploy do Solar das Palmeiras (Debian / Ubuntu)
# ==============================================================================
set -e

echo "🚀 Iniciando automação do ambiente Solar das Palmeiras na AWS..."

CURRENT_USER=$(whoami)
echo "👤 Usuário ativo: $CURRENT_USER"

# 1. Configurar safe.directory para o Git
git config --global --add safe.directory "*" || true

# 2. Atualizar o sistema e instalar o Docker + Git
echo "📦 1/4 Instalando Docker, Docker Compose e Git..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg git docker.io docker-compose-v2

# 3. Configurar permissões do Docker para o usuário ativo
echo "🔑 2/4 Configurando permissões do usuário ($CURRENT_USER)..."
sudo usermod -aG docker "$CURRENT_USER" || true
sudo systemctl enable --now docker

# 4. Ajustar permissões da pasta de destino ou recriar
echo "📂 3/4 Baixando o código do Solar das Palmeiras..."
TARGET_DIR="$HOME/solar-das-palmeiras-"

if [ -d "$TARGET_DIR" ]; then
    sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$TARGET_DIR" || true
    cd "$TARGET_DIR"
    git config --global --add safe.directory "$TARGET_DIR" || true
    git fetch --all || (cd .. && sudo rm -rf "$TARGET_DIR" && git clone https://github.com/tiagocarvalho08/solar-das-palmeiras-.git && cd "$TARGET_DIR")
    git checkout core || git checkout main
    git pull || true
else
    cd "$HOME"
    git clone https://github.com/tiagocarvalho08/solar-das-palmeiras-.git
    cd "$TARGET_DIR"
    git config --global --add safe.directory "$TARGET_DIR" || true
    git checkout core || git checkout main
fi

# 5. Subir os containers Docker
echo "🐳 4/4 Compilando e iniciando os containers Docker..."
sudo docker compose up --build -d

echo "=============================================================================="
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO NO DEBIAN / UBUNTU!"
echo "🌐 A aplicação Solar das Palmeiras está no ar!"
echo "=============================================================================="
