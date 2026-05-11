import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import axios from 'axios';

interface IntelidataContract {
  cpfCnpj: string;
  clienteFinal: string;
  idStatus: number;
  status: string;
  descricaoStatus: string;
  versaoSistema: string;
  valortotal: number;
  dataCriacao: string;
  usuarios: number;
  build: string;
  ultimoAcessoWs: string;
  diasParaEncerrar: number;
  dataEncerramento: string | null;
  databloqueio: string | null;
  dataMigracao: string | null;
  diasBloqueado: number;
  diasParaBloqueio: number;
  tipoLicenciamento: string;
  tipoContrato: string;
}

function extractDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatCnpjCpf(value: string): string {
  const digits = extractDigits(value);
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return value;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  // ─── Cron automático — a cada 60 minutos ────────────────────────────────────
  @Cron('0 */60 * * * *')
  async syncAutomatico() {
    this.logger.log('⏰ Sincronização automática iniciada (60 min)');
    const result = await this.syncContracts();
    if (result.success) {
      this.logger.log(`✅ Sync automático: ${result.totalCreated} criados, ${result.totalUpdated} atualizados`);
    } else {
      this.logger.error(`❌ Sync automático falhou: ${result.errorMessage}`);
    }
  }

  // ─── Sync parcial de um contrato específico por CNPJ ────────────────────────
  async syncContrato(cpfCnpjDigits: string): Promise<void> {
    this.logger.log(`🔄 Sync parcial do contrato ${cpfCnpjDigits}...`);
    try {
      const { baseUrl, token } = await this.settingsService.getIntelidataCredentials();
      if (!baseUrl || !token) return;

      // Buscar em todos os status para pegar o estado atualizado
      const statusIds = [1, 2, 3, 4, 5, 6];
      for (const statusId of statusIds) {
        try {
          const url = `${baseUrl.replace(/\/$/, '')}/contratos/${statusId}`;
          const response = await axios.get<IntelidataContract[]>(url, {
            headers: { token },
            timeout: 15000,
          });

          if (!Array.isArray(response.data)) continue;

          // Filtrar apenas o contrato pelo CNPJ
          const contrato = response.data.find(
            c => extractDigits(c.cpfCnpj) === cpfCnpjDigits,
          );

          if (!contrato) continue;

          // Atualizar no banco
          const digits = extractDigits(contrato.cpfCnpj);
          const tenant = digits;
          const webAccessUrl = `https://canal.intelidata.inf.br/acesso/${tenant}`;

          const data = {
            cpfCnpj: formatCnpjCpf(contrato.cpfCnpj),
            cpfCnpjDigits: digits,
            clienteFinal: contrato.clienteFinal?.trim() || '',
            idStatus: contrato.idStatus,
            status: contrato.status || '',
            descricaoStatus: contrato.descricaoStatus || '',
            versaoSistema: contrato.versaoSistema || '',
            valortotal: contrato.valortotal || 0,
            dataCriacao: contrato.dataCriacao ? new Date(contrato.dataCriacao) : null,
            usuarios: contrato.usuarios || 0,
            build: contrato.build || '',
            ultimoAcessoWs: contrato.ultimoAcessoWs ? new Date(contrato.ultimoAcessoWs) : null,
            diasParaEncerrar: contrato.diasParaEncerrar || 0,
            dataEncerramento: contrato.dataEncerramento ? new Date(contrato.dataEncerramento) : null,
            databloqueio: contrato.databloqueio ? new Date(contrato.databloqueio) : null,
            dataMigracao: contrato.dataMigracao ? new Date(contrato.dataMigracao) : null,
            diasBloqueado: contrato.diasBloqueado || 0,
            diasParaBloqueio: contrato.diasParaBloqueio || 0,
            tipoLicenciamento: contrato.tipoLicenciamento || '',
            tipoContrato: contrato.tipoContrato || '',
            tenant,
            webAccessUrl,
            lastSyncedAt: new Date(),
          };

          await this.prisma.contract.updateMany({
            where: { cpfCnpjDigits: digits },
            data,
          });

          this.logger.log(`✅ Contrato ${digits} atualizado — status: ${contrato.idStatus} (${contrato.descricaoStatus})`);
          return; // Encontrou, parar loop
        } catch {
          // Status não retornou este contrato, continuar
        }
      }
    } catch (err: any) {
      this.logger.error(`Erro no sync parcial de ${cpfCnpjDigits}: ${err.message}`);
    }
  }

  async syncContracts(): Promise<{
    success: boolean;
    totalReceived: number;
    totalCreated: number;
    totalUpdated: number;
    errorMessage?: string;
    duration: number;
  }> {
    const startedAt = new Date();
    this.logger.log('🔄 Iniciando sincronização de contratos...');

    let totalReceived = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let errorMessage: string | undefined;
    let success = false;

    try {
      const { baseUrl, token } = await this.settingsService.getIntelidataCredentials();

      if (!baseUrl || !token) {
        throw new Error('API Intelidata não configurada. Configure a URL e o Token em Configurações.');
      }

      // Buscar todos os status (1 a 6)
      const allContracts: IntelidataContract[] = [];
      const statusIds = [1, 2, 3, 4, 5, 6];

      for (const statusId of statusIds) {
        try {
          const url = `${baseUrl.replace(/\/$/, '')}/contratos/${statusId}`;
          const response = await axios.get<IntelidataContract[]>(url, {
            headers: { token },
            timeout: 30000,
          });
          if (Array.isArray(response.data)) {
            allContracts.push(...response.data);
          }
        } catch (err: any) {
          this.logger.warn(`Status ${statusId}: ${err.message}`);
        }
      }

      // Remover duplicatas por CNPJ+status
      const uniqueMap = new Map<string, IntelidataContract>();
      for (const c of allContracts) {
        const key = `${extractDigits(c.cpfCnpj)}_${c.idStatus}`;
        uniqueMap.set(key, c);
      }
      const uniqueContracts = Array.from(uniqueMap.values());
      totalReceived = uniqueContracts.length;

      this.logger.log(`📦 ${totalReceived} contratos recebidos`);

      // Processar cada contrato
      for (const contract of uniqueContracts) {
        try {
          const digits = extractDigits(contract.cpfCnpj);
          const cpfCnpjFormatado = formatCnpjCpf(contract.cpfCnpj);
          const tenant = digits; // tenant = apenas dígitos do CNPJ

          const webAccessUrl = `https://canal.intelidata.inf.br/acesso/${tenant}`;

          const data = {
            cpfCnpj: cpfCnpjFormatado,
            cpfCnpjDigits: digits,
            clienteFinal: contract.clienteFinal?.trim() || '',
            idStatus: contract.idStatus,
            status: contract.status || '',
            descricaoStatus: contract.descricaoStatus || '',
            versaoSistema: contract.versaoSistema || '',
            valortotal: contract.valortotal || 0,
            dataCriacao: contract.dataCriacao ? new Date(contract.dataCriacao) : null,
            usuarios: contract.usuarios || 0,
            build: contract.build || '',
            ultimoAcessoWs: contract.ultimoAcessoWs ? new Date(contract.ultimoAcessoWs) : null,
            diasParaEncerrar: contract.diasParaEncerrar || 0,
            dataEncerramento: contract.dataEncerramento ? new Date(contract.dataEncerramento) : null,
            databloqueio: contract.databloqueio ? new Date(contract.databloqueio) : null,
            dataMigracao: contract.dataMigracao ? new Date(contract.dataMigracao) : null,
            diasBloqueado: contract.diasBloqueado || 0,
            diasParaBloqueio: contract.diasParaBloqueio || 0,
            tipoLicenciamento: contract.tipoLicenciamento || '',
            tipoContrato: contract.tipoContrato || '',
            tenant,
            webAccessUrl,
            lastSyncedAt: new Date(),
          };

          // Verificar se existe pelo CNPJ + status
          const existing = await this.prisma.contract.findFirst({
            where: {
              cpfCnpjDigits: digits,
              idStatus: contract.idStatus,
            },
          });

          if (existing) {
            await this.prisma.contract.update({
              where: { id: existing.id },
              data,
            });

            // Atualizar custo Intelidata no financeiro se existir
            await this.prisma.contractFinancial.updateMany({
              where: { contractId: existing.id },
              data: { valorCustoIntelidata: contract.valortotal || 0 },
            });

            totalUpdated++;
          } else {
            await this.prisma.contract.create({ data });
            totalCreated++;
          }
        } catch (err: any) {
          this.logger.error(`Erro ao processar ${contract.cpfCnpj}: ${err.message}`);
        }
      }

      success = true;
      this.logger.log(`✅ Sync concluído: ${totalCreated} criados, ${totalUpdated} atualizados`);
    } catch (err: any) {
      errorMessage = err.message;
      this.logger.error(`❌ Erro na sincronização: ${err.message}`);
    }

    const finishedAt = new Date();
    const duration = finishedAt.getTime() - startedAt.getTime();

    // Registrar log
    await this.prisma.syncLog.create({
      data: {
        source: 'INTELIDATA',
        status: success ? (totalUpdated > 0 || totalCreated > 0 ? 'SUCCESS' : 'PARTIAL') : 'ERROR',
        totalReceived,
        totalCreated,
        totalUpdated,
        errorMessage,
        startedAt,
        finishedAt,
      },
    });

    return { success, totalReceived, totalCreated, totalUpdated, errorMessage, duration };
  }
}
