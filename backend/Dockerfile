FROM node:20-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY prisma ./prisma

RUN npx prisma generate

COPY . .

RUN npm run build

# Debug do build
RUN echo "=== Arquivos gerados ===" \
 && find /app/dist -type f


# =========================
# Production
# =========================

FROM node:20-bookworm AS production

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Debug final
RUN echo "=== Conteúdo final dist ===" \
 && find /app/dist -type f

EXPOSE 3333

CMD ["sh", "-c", "\
npx prisma migrate deploy && \
if [ -f dist/src/main.js ]; then \
  echo 'Iniciando: dist/src/main.js'; \
  node dist/src/main.js; \
elif [ -f dist/main.js ]; then \
  echo 'Iniciando: dist/main.js'; \
  node dist/main.js; \
else \
  echo 'ERRO: Nenhum main.js encontrado!'; \
  find /app/dist -type f; \
  exit 1; \
fi"]