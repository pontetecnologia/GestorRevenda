-- AlterTable: adicionar outrasReceitas e outrosCustos em contract_financials
ALTER TABLE "contract_financials" 
  ADD COLUMN IF NOT EXISTS "outrasReceitas" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "outrosCustos"   DECIMAL(10,2) NOT NULL DEFAULT 0;
