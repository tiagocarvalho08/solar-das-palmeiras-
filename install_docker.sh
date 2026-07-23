#!/bin/bash
set -e

echo "=== Atualizando repositórios e instalando dependências ==="
apt-get update
apt-get install -y ca-certificates curl gnupg

echo "=== Adicionando chave GPG oficial do Docker ==="
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
chmod a+r /etc/apt/keyrings/docker.gpg

echo "=== Configurando repositório do Docker ==="
ARCH=$(dpkg --print-architecture)
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list

echo "=== Instalando Docker CE ==="
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "=== Adicionando usuário 'usuario' ao grupo docker ==="
usermod -aG docker usuario || true

echo "=== Habilitando e iniciando o serviço Docker ==="
systemctl enable --now docker

echo "=== Instalação concluída com sucesso! ==="
docker --version
