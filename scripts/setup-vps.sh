#!/bin/bash
# ============================================================
# RevendaHub - Script de instalação para VPS Ubuntu
# Execute como root ou com sudo
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}======================================"
echo "  RevendaHub - Setup VPS Ubuntu"
echo "======================================${NC}"

# 1. Atualizar sistema
echo -e "\n${YELLOW}[1/6] Atualizando sistema...${NC}"
apt-get update -y && apt-get upgrade -y

# 2. Instalar Docker
echo -e "\n${YELLOW}[2/6] Instalando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker instalado!${NC}"
else
    echo -e "${GREEN}Docker já instalado!${NC}"
fi

# 3. Instalar Docker Compose
echo -e "\n${YELLOW}[3/6] Verificando Docker Compose...${NC}"
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi
echo -e "${GREEN}Docker Compose OK!${NC}"

# 4. Criar diretório da aplicação
echo -e "\n${YELLOW}[4/6] Configurando diretório...${NC}"
APP_DIR="/opt/revendahub"
mkdir -p $APP_DIR
echo -e "${GREEN}Diretório: $APP_DIR${NC}"

# 5. Criar .env se não existir
echo -e "\n${YELLOW}[5/6] Configurando variáveis de ambiente...${NC}"
if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/.env.example" ]; then
        cp $APP_DIR/.env.example $APP_DIR/.env
        echo -e "${YELLOW}⚠ Arquivo .env criado. EDITE-O antes de continuar!${NC}"
        echo -e "   ${RED}nano $APP_DIR/.env${NC}"
    else
        echo -e "${RED}ERRO: .env.example não encontrado!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}.env já existe${NC}"
fi

# 6. Configurar firewall básico
echo -e "\n${YELLOW}[6/6] Configurando firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp     # SSH
    ufw allow 80/tcp     # HTTP
    ufw allow 443/tcp    # HTTPS
    ufw --force enable
    echo -e "${GREEN}Firewall configurado!${NC}"
fi

echo -e "\n${GREEN}======================================"
echo "  Setup concluído!"
echo "======================================"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "1. Copie o código para $APP_DIR"
echo "2. Edite o arquivo .env:"
echo "   nano $APP_DIR/.env"
echo "3. Suba a aplicação:"
echo "   cd $APP_DIR && docker compose up -d --build"
echo "4. Execute o seed inicial:"
echo "   docker compose exec backend npx ts-node prisma/seed.ts"
echo ""
echo -e "${GREEN}Login padrão: admin@revendahub.com / Admin@123${NC}"
echo -e "${RED}⚠ MUDE A SENHA APÓS O PRIMEIRO ACESSO!${NC}"
echo ""
