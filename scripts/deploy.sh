#!/bin/bash
# ============================================================
# RevendaHub - Script de Deploy/Atualização
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}RevendaHub - Deploy${NC}"

# Build e subida
echo -e "${YELLOW}Parando containers...${NC}"
docker compose down

echo -e "${YELLOW}Fazendo build...${NC}"
docker compose build --no-cache

echo -e "${YELLOW}Subindo serviços...${NC}"
docker compose up -d

echo -e "${YELLOW}Aguardando banco de dados...${NC}"
sleep 15

echo -e "${YELLOW}Executando migrations...${NC}"
docker compose exec -T backend npx prisma migrate deploy

echo -e "${GREEN}Deploy concluído!${NC}"
docker compose ps
