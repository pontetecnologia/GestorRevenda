import { Injectable, NotFoundException, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { SyncService } from '../sync/sync.service';

export interface ContractFilterDto {
  search?: string;
  idStatus?: number;       // filtro único legado
  idStatuses?: number[];   // múltiplos status (novo padrão)
  tipoContrato?: string;
  serverId?: string;
  onlyMigrated?: boolean;
  page?: number;
  limit?: number;
}

export interface UpdateFinancialDto {
  valorVenda?: number;
  valorVendaTef?: number;
  valorVendaServidor?: number;
  outrasReceitas?: number;
  custoTef?: number;
  outrosCustos?: number;
  // custoServidor, valorCustoIntelidata e custoUniplus são AUTOMÁTICOS
  observacao?: string;
}

export interface CreateMigrationDto {
  oldContractId: string;
  newContractId: string;
  motivoMigracao?: string;
  dataMigracao?: string;
}

function calcFinancials(data: {
  valorCustoIntelidata: Decimal | number;
  valorVenda: Decimal | number;
  valorVendaTef: Decimal | number;
  valorVendaServidor: Decimal | number;
  outrasReceitas: Decimal | number;
  custoTef: Decimal | number;
  custoServidor: Decimal | number;
  outrosCustos: Decimal | number;
}) {
  const receita =
    Number(data.valorVenda) +
    Number(data.valorVendaTef) +
    Number(data.valorVendaServidor) +
    Number(data.outrasReceitas);

  const custo =
    Number(data.valorCustoIntelidata) +
    Number(data.custoTef) +
    Number(data.custoServidor) +
    Number(data.outrosCustos);

  const valorLiquido = receita - custo;
  const margemPercentual = receita > 0 ? (valorLiquido / receita) * 100 : 0;

  return {
    valorLiquido: Math.round(valorLiquido * 100) / 100,
    margemValor: Math.round(valorLiquido * 100) / 100,
    margemPercentual: Math.round(margemPercentual * 100) / 100,
  };
}

@Injectable()
export class ContractsService {
  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(forwardRef(() => SyncService)) private syncService?: SyncService,
  ) {}

  async findAll(filters: ContractFilterDto) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.search) {
      where.OR = [
        { clienteFinal: { contains: filters.search, mode: 'insensitive' } },
        { cpfCnpj: { contains: filters.search } },
        { cpfCnpjDigits: { contains: filters.search } },
      ];
    }

    // Prioridade: idStatuses[] > idStatus único
    if (filters.idStatuses && filters.idStatuses.length > 0) {
      where.idStatus = { in: filters.idStatuses };
    } else if (filters.idStatus !== undefined) {
      where.idStatus = filters.idStatus;
    } else {
      // Padrão: Aberto (1) + Bloqueado (3) + Encerramento (2 com diasParaEncerrar>0) + Degustação (5)
      where.OR = [
        { idStatus: { in: [1, 3, 5] } },
        { idStatus: 2, diasParaEncerrar: { gt: 0 } },
      ];
    }

    if (filters.tipoContrato) {
      where.tipoContrato = { equals: filters.tipoContrato, mode: 'insensitive' };
    }

    if (filters.serverId) {
      where.contractServers = { some: { serverId: filters.serverId } };
    }

    // Somente migrados: contratos que aparecem como oldContract em alguma migração
    if (filters.onlyMigrated) {
      where.migrations = { some: {} };
    }

    const [total, contracts] = await Promise.all([
      this.prisma.contract.count({ where }),
      this.prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { clienteFinal: 'asc' },
        include: {
          financial: true,
          contractServers: { include: { server: { select: { id: true, name: true } } } },
          migrations: {
            include: {
              // migrations → "NewContract" → este é o NEW → queremos o OLD (quem foi substituído)
              oldContract: { select: { id: true, clienteFinal: true, cpfCnpj: true } },
            },
          },
          oldMigrations: {
            include: {
              // oldMigrations → "OldContract" → este é o OLD → queremos o NEW (quem substituiu)
              newContract: { select: { id: true, clienteFinal: true, cpfCnpj: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: contracts,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        financial: true,
        contractServers: { include: { server: true } },
        migrations: {
          include: {
            newContract: { select: { id: true, clienteFinal: true, cpfCnpj: true } },
            createdByUser: { select: { id: true, name: true } },
          },
        },
        oldMigrations: {
          include: {
            oldContract: { select: { id: true, clienteFinal: true, cpfCnpj: true } },
            createdByUser: { select: { id: true, name: true } },
          },
        },
        accessLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { id: true, name: true } } },
        },
        blockHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { createdByUser: { select: { id: true, name: true } } },
        },
        accessData: true,
      },
    });

    if (!contract) throw new NotFoundException('Contrato não encontrado');
    return contract;
  }

  async updateFinancial(contractId: string, dto: UpdateFinancialDto, userId: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        financial: true,
        contractServers: { include: { server: true } },
      },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');

    const currentFinancial = contract.financial as any;

    // valorCustoIntelidata = sempre valortotal da API (automático)
    const valorCustoIntelidata = Number(contract.valortotal);

    // custoServidor = calculado automaticamente pelo servidor vinculado
    const custoServidor = await this.calcCustoServidor(contractId);

    const merged = {
      valorCustoIntelidata,
      valorVenda:         dto.valorVenda         ?? Number(currentFinancial?.valorVenda         ?? 0),
      valorVendaTef:      dto.valorVendaTef       ?? Number(currentFinancial?.valorVendaTef      ?? 0),
      valorVendaServidor: dto.valorVendaServidor  ?? Number(currentFinancial?.valorVendaServidor ?? 0),
      outrasReceitas:     dto.outrasReceitas      ?? Number(currentFinancial?.outrasReceitas     ?? 0),
      custoTef:           dto.custoTef            ?? Number(currentFinancial?.custoTef           ?? 0),
      outrosCustos:       dto.outrosCustos        ?? Number(currentFinancial?.outrosCustos       ?? 0),
      custoServidor,
    };

    const calcs = calcFinancials(merged);

    return this.prisma.contractFinancial.upsert({
      where: { contractId },
      create: {
        contractId,
        ...merged,
        ...calcs,
        observacao: dto.observacao,
        updatedByUserId: userId,
      } as any,
      update: {
        valorCustoIntelidata: merged.valorCustoIntelidata,
        valorVenda:           merged.valorVenda,
        valorVendaTef:        merged.valorVendaTef,
        valorVendaServidor:   merged.valorVendaServidor,
        custoTef:             merged.custoTef,
        custoServidor:        merged.custoServidor,
        ...calcs,
        ...(dto.observacao !== undefined && { observacao: dto.observacao }),
        updatedByUserId: userId,
        ...({ outrasReceitas: merged.outrasReceitas, outrosCustos: merged.outrosCustos } as any),
      } as any,
    });
  }

  // Status considerados ativos para rateio do custo do servidor
  private readonly ACTIVE_STATUS_IDS = [1, 3, 5]; // Aberto, Bloqueado, Degustação

  // Calcula o custo proporcional do servidor para um contrato específico
  private async calcCustoServidor(contractId: string): Promise<number> {
    const link = await this.prisma.contractServer.findFirst({
      where: { contractId },
      include: { server: true },
    });
    if (!link) return 0;

    // Contar apenas contratos ATIVOS vinculados ao mesmo servidor
    const totalAtivos = await this.prisma.contractServer.count({
      where: {
        serverId: link.serverId,
        contract: { idStatus: { in: this.ACTIVE_STATUS_IDS } },
      },
    });

    if (totalAtivos === 0) return 0;
    const custo = Number(link.server.monthlyCost) / totalAtivos;
    return Math.round(custo * 100) / 100;
  }

  // Recalcula custoServidor de TODOS os contratos vinculados a um servidor
  private async recalcAllServerCosts(serverId: string): Promise<void> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) return;

    // Buscar todos os vínculos com status do contrato
    const links = await this.prisma.contractServer.findMany({
      where: { serverId },
      include: { contract: { select: { id: true, idStatus: true, valortotal: true, financial: true } } },
    });

    // Apenas ativos participam do rateio
    const ativos = links.filter(l => this.ACTIVE_STATUS_IDS.includes(l.contract.idStatus));
    const qtdAtivos = ativos.length;
    const custoUnitario = qtdAtivos > 0
      ? Math.round((Number(server.monthlyCost) / qtdAtivos) * 100) / 100
      : 0;

    // Atualizar todos os contratos vinculados
    for (const link of links) {
      const contract = link.contract;
      const isAtivo = this.ACTIVE_STATUS_IDS.includes(contract.idStatus);

      // Encerrados/migrados recebem custoServidor = 0
      const custoServidor = isAtivo ? custoUnitario : 0;
      const valorCustoIntelidata = Number(contract.valortotal);
      const currentF = contract.financial as any;

      const merged = {
        valorCustoIntelidata,
        valorVenda:         Number(currentF?.valorVenda         ?? 0),
        valorVendaTef:      Number(currentF?.valorVendaTef      ?? 0),
        valorVendaServidor: Number(currentF?.valorVendaServidor ?? 0),
        outrasReceitas:     Number(currentF?.outrasReceitas     ?? 0),
        custoTef:           Number(currentF?.custoTef           ?? 0),
        outrosCustos:       Number(currentF?.outrosCustos       ?? 0),
        custoServidor,
      };

      const calcs = calcFinancials(merged);

      await this.prisma.contractFinancial.upsert({
        where: { contractId: contract.id },
        create: { contractId: contract.id, ...merged, ...calcs } as any,
        update: { custoServidor, valorCustoIntelidata, ...calcs } as any,
      });
    }
  }

  async createMigration(dto: CreateMigrationDto, userId: string) {
    const [oldContract, newContract] = await Promise.all([
      this.prisma.contract.findUnique({ where: { id: dto.oldContractId } }),
      this.prisma.contract.findUnique({ where: { id: dto.newContractId } }),
    ]);

    if (!oldContract) throw new NotFoundException('Contrato antigo não encontrado');
    if (!newContract) throw new NotFoundException('Contrato novo não encontrado');

    return this.prisma.contractMigration.create({
      data: {
        oldContractId: dto.oldContractId,
        newContractId: dto.newContractId,
        motivoMigracao: dto.motivoMigracao,
        dataMigracao: dto.dataMigracao ? new Date(dto.dataMigracao) : new Date(),
        createdByUserId: userId,
      },
    });
  }

  async logAccess(contractId: string, userId: string, ip: string, userAgent: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato não encontrado');

    return this.prisma.contractAccessLog.create({
      data: { contractId, userId, ip, userAgent },
    });
  }

  async getHistory(contractId: string) {
    const [accessLogs, blockHistory] = await Promise.all([
      this.prisma.contractAccessLog.findMany({
        where: { contractId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { name: true } } },
      }),
      this.prisma.contractBlockHistory.findMany({
        where: { contractId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { createdByUser: { select: { name: true } } },
      }),
    ]);
    return { accessLogs, blockHistory };
  }

  async linkServer(contractId: string, serverId: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato não encontrado');

    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Servidor não encontrado');

    // Desvincular servidor anterior se existir (contrato só pode ter 1 servidor)
    const existing = await this.prisma.contractServer.findFirst({
      where: { contractId },
    });
    if (existing && existing.serverId !== serverId) {
      await this.prisma.contractServer.delete({ where: { id: existing.id } });
      // Recalcular custos do servidor anterior
      await this.recalcAllServerCosts(existing.serverId);
    }

    // Vincular novo servidor
    await this.prisma.contractServer.upsert({
      where: { contractId_serverId: { contractId, serverId } },
      create: { contractId, serverId },
      update: {},
    });

    // Recalcular custos de todos os contratos deste servidor
    await this.recalcAllServerCosts(serverId);

    return { contractId, serverId, message: 'Servidor vinculado e custos recalculados.' };
  }

  async unlinkServer(contractId: string, serverId: string) {
    await this.prisma.contractServer.deleteMany({ where: { contractId, serverId } });

    // Zerar custo do servidor neste contrato
    await this.prisma.contractFinancial.updateMany({
      where: { contractId },
      data: { custoServidor: 0 },
    });

    // Recalcular custos dos contratos que ainda estão no servidor
    await this.recalcAllServerCosts(serverId);

    return { contractId, serverId, message: 'Servidor desvinculado e custos recalculados.' };
  }

  async createAccessData(contractId: string, data: any) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato não encontrado');

    return this.prisma.contractAccessData.create({
      data: {
        contractId,
        externalId: data.externalId?.trim() || null,
        computerName: data.computerName?.trim() || null,
        description: data.description?.trim() || null,
      },
    });
  }

  async updateAccessData(accessDataId: string, data: any) {
    const existing = await this.prisma.contractAccessData.findUnique({
      where: { id: accessDataId },
    });
    if (!existing) throw new NotFoundException('Dado técnico não encontrado');

    return this.prisma.contractAccessData.update({
      where: { id: accessDataId },
      data: {
        externalId: data.externalId?.trim() ?? existing.externalId,
        computerName: data.computerName?.trim() ?? existing.computerName,
        description: data.description?.trim() ?? existing.description,
      },
    });
  }

  async deleteAccessData(accessDataId: string) {
    const existing = await this.prisma.contractAccessData.findUnique({
      where: { id: accessDataId },
    });
    if (!existing) throw new NotFoundException('Dado técnico não encontrado');

    return this.prisma.contractAccessData.delete({
      where: { id: accessDataId },
    });
  }

  async getAccessData(contractId: string) {
    return this.prisma.contractAccessData.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Bloqueio / Desbloqueio via API Intelidata ───────────────────────────────

  async bloquearContrato(contractId: string, userId: string) {
    return this.executarAcaoIntelidata(contractId, 'bloquear', userId);
  }

  async desbloquearContrato(contractId: string, userId: string) {
    return this.executarAcaoIntelidata(contractId, 'desbloquear', userId);
  }

  private async executarAcaoIntelidata(
    contractId: string,
    acao: 'bloquear' | 'desbloquear',
    userId: string,
  ) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');

    // Buscar credenciais da API Intelidata
    const settingsService = this.prisma['$settingsService'];
    const baseUrlSetting = await this.prisma.appSetting.findUnique({
      where: { key: 'INTELIDATA_BASE_URL' },
    });
    const tokenSetting = await this.prisma.appSetting.findUnique({
      where: { key: 'INTELIDATA_TOKEN' },
    });

    if (!baseUrlSetting?.valueEncrypted || !tokenSetting?.valueEncrypted) {
      throw new Error('API Intelidata não configurada. Configure em Configurações.');
    }

    const { decrypt } = await import('../../common/utils/crypto.util');
    const baseUrl = decrypt(baseUrlSetting.valueEncrypted);
    const token   = decrypt(tokenSetting.valueEncrypted);

    if (!baseUrl || !token) {
      throw new Error('Token ou URL da Intelidata não configurados.');
    }

    const cpfCnpjDigits = contract.cpfCnpjDigits;
    const endpoint = `${baseUrl.replace(/\/$/, '')}/${acao}-contrato/${cpfCnpjDigits}`;

    const axios = (await import('axios')).default;

    let resposta: string;
    let sucesso: boolean;

    try {
      const response = await axios.post(endpoint, null, {
        headers: { token },
        timeout: 15000,
      });
      resposta = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);
      sucesso = true;
    } catch (err: any) {
      const status = err?.response?.status;
      resposta = err?.response?.data
        ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data))
        : err.message;
      sucesso = false;

      if (!sucesso) {
        return {
          success: false,
          message: `Erro ${status || ''}: ${resposta}`,
        };
      }
    }

    // Registrar no histórico de bloqueio
    await this.prisma.contractBlockHistory.create({
      data: {
        contractId,
        action: acao === 'bloquear' ? 'BLOCK' : 'UNBLOCK',
        oldStatus: contract.status,
        newStatus: acao === 'bloquear' ? 'BLOQUEIO_AGENDADO' : 'DESBLOQUEADO',
        description: `${acao === 'bloquear' ? 'Bloqueio' : 'Desbloqueio'} via API: ${resposta}`,
        createdByUserId: userId,
      },
    });

    // Agendar sync parcial após 5 segundos (aguarda Intelidata processar)
    if (this.syncService) {
      setTimeout(async () => {
        try {
          await this.syncService.syncContrato(contract.cpfCnpjDigits);
        } catch (err: any) {
          // Log silencioso — não deve quebrar o fluxo principal
        }
      }, 5000);
    }

    return {
      success: true,
      message: resposta,
      acao,
      syncAgendado: true,
    };
  }
}
