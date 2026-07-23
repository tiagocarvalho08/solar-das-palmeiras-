#!/bin/bash
# ==============================================================================
# Script de Automação de Instalação e Deploy do Solar das Palmeiras na AWS EC2
# ==============================================================================
set -e

echo "🚀 Iniciando automação do ambiente Solar das Palmeiras na AWS..."

# 1. Atualizar o sistema e instalar o Docker + Git
echo "📦 1/4 Instalando Docker, Docker Compose e Git..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg git docker.io docker-compose-v2

# 2. Configurar permissões do Docker
echo "🔑 2/4 Configurando permissões do usuário..."
sudo usermod -aG docker ubuntu || true
sudo systemctl enable --now docker

# 3. Clonar ou atualizar o repositório do GitHub
echo "📂 3/4 Baixando o código do Solar das Palmeiras..."
cd /home/ubuntu
if [ -d "solar-das-palmeiras-" ]; then
    cd solar-das-palmeiras-
    git fetch --all
    git checkout core || git checkout main
    git pull
else
    git clone https://github.com/tiagocarvalho08/solar-das-palmeiras-.git
    cd solar-das-palmeiras-
    git checkout core || git checkout main
fi

# 4. Subir os containers Docker
echo "🐳 4/4 Compilando e iniciando os containers Docker..."
sudo docker compose up --build -d

echo "=============================================================================="
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "🌐 A aplicação Solar das Palmeiras está no ar na sua AWS!"
echo "=============================================================================="
