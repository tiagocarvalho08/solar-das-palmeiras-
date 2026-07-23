#!/bin/bash
export PATH="$HOME/.local/bin:$PATH"
TOKEN=$(gh auth token)
URL="https://tiagocarvalho08:${TOKEN}@github.com/tiagocarvalho08/solar-das-palmeiras-.git"

echo "Enviando projeto para o GitHub..."
sg docker -c "docker run --rm -v $PWD:/repo alpine rm -rf /repo/frontend/.git /repo/backend/.git /repo/.git"
sg docker -c "docker run --rm -v $PWD:/repo -w /repo --entrypoint sh alpine/git -c \"git config --global safe.directory /repo && git init -b main && git config user.name 'Tiago Carvalho' && git config user.email 'tiagocarvalho08@github.com' && git add . && git commit -m 'Initial commit: Solar das Palmeiras PWA System' && git remote add origin ${URL} && git push -u origin main --force\""
