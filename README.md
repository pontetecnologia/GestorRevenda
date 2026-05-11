# RevendaHub

Sistema completo de gestão de revenda SaaS — contratos, financeiro, servidores, CRM e integração com Intelidata/Uniplus.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | NestJS + Fastify + Prisma |
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Banco | PostgreSQL 16 |
| Deploy | Docker + Docker Compose |
| Auth | JWT + Bcrypt |

---

## Funcionalidades

- **Dashboard** com cards financeiros, metas e gráficos
- **Contratos** sincronizados da API Intelidata com dados financeiros manuais
- **Cálculos automáticos** de receita, custo, margem e ticket médio
- **Acesso Web** com log de quem acessou cada sistema de cliente
- **Servidores** com CRUD e vínculo aos contratos
- **Relatórios**: SaaS, Curva ABC, Lucratividade, Cancelamentos, Geral
- **Perfis de acesso**: Suporte, Gestor, Administrador
- **Configurações** de API, metas e usuários
- **Tokens criptografados** no banco (AES-256-CBC)

---

## Instalação em Windows (Desenvolvimento)

### Pré-requisitos

- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/)
- Git

### Passo a passo

```bash
# 1. Clone o projeto
git clone <seu-repositorio> revendahub
cd revendahub

# 2. Configure o banco de dados (PostgreSQL via Docker)
docker run -d \
  --name revendahub-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=revendahub \
  -p 5432:5432 \
  postgres:16-alpine

# 3. Configure o backend
cd backend
copy .env.example .env
# Edite o .env com as configurações desejadas

# 4. Instale dependências e configure o banco
npm install
npx prisma generate
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts

# 5. Inicie o backend
npm run start:dev

# 6. Em outro terminal, configure o frontend
cd ../frontend
npm install
npm run dev
```

### Acesso local

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3333/api
- **Swagger**: http://localhost:3333/api/docs

**Login padrão**: `admin@revendahub.com` / `Admin@123`

---

## Deploy em VPS Ubuntu

### 1. Preparar a VPS

```bash
# Execute como root
curl -fsSL https://raw.githubusercontent.com/seuuser/revendahub/main/scripts/setup-vps.sh | bash
```

Ou manualmente:

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | bash
systemctl enable docker && systemctl start docker

# Instalar Docker Compose Plugin
apt-get install -y docker-compose-plugin
```

### 2. Copiar o projeto para a VPS

```bash
# Via SCP da sua máquina local
scp -r ./revendahub root@seu-ip:/opt/revendahub

# Ou via Git
git clone <seu-repositorio> /opt/revendahub
```

### 3. Configurar variáveis de ambiente

```bash
cd /opt/revendahub
cp .env.example .env
nano .env
```

**Variáveis obrigatórias para produção:**

```env
POSTGRES_PASSWORD=senha_muito_segura_aqui
JWT_SECRET=chave_jwt_com_minimo_32_caracteres_aqui
ENCRYPTION_KEY=chave_32_chars_exatos_aqui_____
WEB_ORIGIN=https://seudominio.com.br
NODE_ENV=production
```

> ⚠️ **IMPORTANTE**: `ENCRYPTION_KEY` deve ter **exatamente 32 caracteres**

### 4. Subir os containers

```bash
cd /opt/revendahub
docker compose up -d --build
```

### 5. Executar seed inicial

```bash
# Aguarde o backend estar pronto (~30 segundos)
docker compose exec backend npx ts-node prisma/seed.ts
```

### 6. Verificar status

```bash
docker compose ps
docker compose logs -f backend
```

---

## Proxy Reverso (Nginx Proxy Manager)

### Com Nginx Proxy Manager (recomendado)

1. Acesse o painel do Nginx Proxy Manager
2. Crie um **Proxy Host** apontando para `frontend:80`
3. Configure seu domínio e SSL (Let's Encrypt)
4. O frontend já proxeia `/api` para o backend automaticamente

### Com Nginx nativo

```nginx
server {
    listen 443 ssl;
    server_name seudominio.com.br;

    ssl_certificate /etc/letsencrypt/live/seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com.br/privkey.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Configuração inicial do sistema

### 1. Primeiro acesso

1. Acesse o sistema no navegador
2. Login: `admin@revendahub.com` / `Admin@123`
3. **Troque a senha imediatamente** em Configurações → Usuários

### 2. Configurar a API Intelidata

1. Vá em **Configurações → Intelidata**
2. Preencha a **URL Base**: `https://canal.intelidata.inf.br/public-api`
3. Preencha o **Token** gerado no Portal Comercial da Intelidata
4. Clique em **Testar Conexão**
5. Se OK, clique em **Sincronizar Contratos**

### 3. Configurar metas

1. Vá em **Configurações → Metas**
2. Selecione o mês e ano
3. Informe as metas desejadas

---

## API — Exemplos de uso (curl)

```bash
# Login
curl -X POST http://localhost:3333/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@revendahub.com","password":"Admin@123"}'

# Listar contratos (com token)
TOKEN="eyJ..."
curl http://localhost:3333/api/contracts \
  -H "Authorization: Bearer $TOKEN"

# Testar conexão Intelidata
curl -X POST http://localhost:3333/api/settings/intelidata/test \
  -H "Authorization: Bearer $TOKEN"

# Sincronizar contratos
curl -X POST http://localhost:3333/api/settings/intelidata/sync \
  -H "Authorization: Bearer $TOKEN"

# Dashboard
curl http://localhost:3333/api/dashboard/summary \
  -H "Authorization: Bearer $TOKEN"
```

---

## Perfis de acesso

| Funcionalidade | Suporte | Gestor | Admin |
|---|:---:|:---:|:---:|
| Visualizar contratos | ✅ | ✅ | ✅ |
| Acessar sistema web do cliente | ✅ | ✅ | ✅ |
| Editar dados financeiros | ❌ | ✅ | ✅ |
| Cadastrar servidores | ❌ | ✅ | ✅ |
| Visualizar relatórios | ❌ | ✅ | ✅ |
| Editar metas | ❌ | ✅ | ✅ |
| Configurar tokens de API | ❌ | ❌ | ✅ |
| Gerenciar usuários | ❌ | ❌ | ✅ |
| Sincronizar contratos | ❌ | ❌ | ✅ |
| Excluir registros | ❌ | ❌ | ✅ |

---

## Estrutura de pastas

```
revendahub/
├── backend/                   # NestJS API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # Autenticação JWT
│   │   │   ├── users/         # Gestão de usuários
│   │   │   ├── contracts/     # Contratos
│   │   │   ├── servers/       # Servidores
│   │   │   ├── dashboard/     # Dashboard
│   │   │   ├── reports/       # Relatórios
│   │   │   ├── settings/      # Configurações
│   │   │   ├── sync/          # Sincronização Intelidata
│   │   │   └── prisma/        # Prisma service
│   │   └── common/
│   │       ├── guards/        # JWT + Roles guards
│   │       ├── decorators/    # @Roles decorator
│   │       └── utils/         # Crypto util
│   ├── prisma/
│   │   ├── schema.prisma      # Schema do banco
│   │   └── seed.ts            # Seed inicial
│   └── Dockerfile
├── frontend/                  # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── dashboard/
│   │   │   ├── contracts/
│   │   │   ├── servers/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   ├── components/
│   │   │   ├── layout/        # Layout + Sidebar
│   │   │   └── ui/            # Componentes reutilizáveis
│   │   ├── store/             # Zustand (auth)
│   │   └── services/          # Axios API client
│   ├── nginx.conf
│   └── Dockerfile
├── scripts/
│   ├── setup-vps.sh
│   └── deploy.sh
├── docker-compose.yml
└── .env.example
```

---

## Manutenção

### Backup do banco de dados

```bash
# Fazer backup
docker compose exec postgres pg_dump -U postgres revendahub > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker compose exec -T postgres psql -U postgres revendahub < backup_20260101.sql
```

### Atualizar o sistema

```bash
cd /opt/revendahub
git pull
bash scripts/deploy.sh
```

### Ver logs

```bash
docker compose logs -f          # Todos os serviços
docker compose logs -f backend  # Só o backend
docker compose logs -f frontend # Só o frontend
```

---

## Segurança

- Tokens de API armazenados com **AES-256-CBC**
- Senhas com **bcrypt** (12 rounds)
- **JWT** com expiração de 8h
- **Rate limiting** via ThrottlerModule do NestJS
- **CORS** configurável por variável de ambiente
- **ORM** Prisma protege contra SQL Injection
- Tokens nunca retornados completos ao frontend (mascarados)

---

## Suporte

Para dúvidas sobre a API Intelidata, consulte:
- https://canal.intelidata.inf.br/public-api

Para a API Uniplus, consulte a documentação interna da Intelidata.
