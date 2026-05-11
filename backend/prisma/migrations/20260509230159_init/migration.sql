-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPPORT', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BlockHistoryAction" AS ENUM ('BLOCK', 'UNBLOCK', 'STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'ERROR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SUPPORT',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "cpfCnpjDigits" TEXT NOT NULL,
    "clienteFinal" TEXT NOT NULL,
    "idStatus" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "descricaoStatus" TEXT NOT NULL,
    "versaoSistema" TEXT NOT NULL DEFAULT '',
    "valortotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dataCriacao" TIMESTAMP(3),
    "usuarios" INTEGER NOT NULL DEFAULT 0,
    "build" TEXT NOT NULL DEFAULT '',
    "ultimoAcessoWs" TIMESTAMP(3),
    "diasParaEncerrar" INTEGER NOT NULL DEFAULT 0,
    "dataEncerramento" TIMESTAMP(3),
    "databloqueio" TIMESTAMP(3),
    "dataMigracao" TIMESTAMP(3),
    "diasBloqueado" INTEGER NOT NULL DEFAULT 0,
    "diasParaBloqueio" INTEGER NOT NULL DEFAULT 0,
    "tipoLicenciamento" TEXT NOT NULL DEFAULT '',
    "tipoContrato" TEXT NOT NULL DEFAULT '',
    "tenant" TEXT,
    "webAccessUrl" TEXT,
    "directAccessUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_financials" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "valorCustoIntelidata" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorVenda" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorVendaTef" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorVendaServidor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "custoTef" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "custoUniplus" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "custoServidor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorLiquido" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "margemValor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "margemPercentual" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_financials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_migrations" (
    "id" TEXT NOT NULL,
    "oldContractId" TEXT NOT NULL,
    "newContractId" TEXT NOT NULL,
    "motivoMigracao" TEXT,
    "dataMigracao" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_access_logs" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'WEB_ACCESS',
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_block_history" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "action" "BlockHistoryAction" NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "description" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_block_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_access_data" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "externalId" TEXT,
    "computerName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_access_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "publicIp" TEXT,
    "ramGb" INTEGER NOT NULL DEFAULT 0,
    "vcpu" INTEGER NOT NULL DEFAULT 0,
    "storageGb" INTEGER NOT NULL DEFAULT 0,
    "monthlyCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "monthlyRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "ServerStatus" NOT NULL DEFAULT 'ACTIVE',
    "observation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_servers" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "desiredActiveContracts" INTEGER NOT NULL DEFAULT 0,
    "desiredIntelidataCostValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "desiredSalesValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueEncrypted" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "totalReceived" INTEGER NOT NULL DEFAULT 0,
    "totalCreated" INTEGER NOT NULL DEFAULT 0,
    "totalUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "contracts_cpfCnpj_idx" ON "contracts"("cpfCnpj");

-- CreateIndex
CREATE INDEX "contracts_idStatus_idx" ON "contracts"("idStatus");

-- CreateIndex
CREATE INDEX "contracts_tipoContrato_idx" ON "contracts"("tipoContrato");

-- CreateIndex
CREATE UNIQUE INDEX "contract_financials_contractId_key" ON "contract_financials"("contractId");

-- CreateIndex
CREATE INDEX "contract_access_logs_contractId_idx" ON "contract_access_logs"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contract_servers_contractId_serverId_key" ON "contract_servers"("contractId", "serverId");

-- CreateIndex
CREATE UNIQUE INDEX "goals_year_month_key" ON "goals"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- AddForeignKey
ALTER TABLE "contract_financials" ADD CONSTRAINT "contract_financials_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_financials" ADD CONSTRAINT "contract_financials_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_migrations" ADD CONSTRAINT "contract_migrations_oldContractId_fkey" FOREIGN KEY ("oldContractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_migrations" ADD CONSTRAINT "contract_migrations_newContractId_fkey" FOREIGN KEY ("newContractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_migrations" ADD CONSTRAINT "contract_migrations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_access_logs" ADD CONSTRAINT "contract_access_logs_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_access_logs" ADD CONSTRAINT "contract_access_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_block_history" ADD CONSTRAINT "contract_block_history_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_block_history" ADD CONSTRAINT "contract_block_history_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_access_data" ADD CONSTRAINT "contract_access_data_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_servers" ADD CONSTRAINT "contract_servers_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_servers" ADD CONSTRAINT "contract_servers_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
