import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Status IDs ativos: 1=Aberto, 3=Bloqueado, 5=Degustação
const ACTIVE_STATUS_IDS = [1, 3, 5];

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const [
      allContracts,
      activeContracts,
      serversActive,
      currentGoal,
    ] = await Promise.all([
      this.prisma.contract.findMany({
        include: { financial: true },
      }),
      this.prisma.contract.findMany({
        where: { idStatus: { in: ACTIVE_STATUS_IDS } },
        include: { financial: true },
      }),
      this.prisma.server.findMany({ where: { status: 'ACTIVE' } }),
      this.getCurrentGoal(),
    ]);

    // Cards de Vendas
    const totalVenda = activeContracts.reduce((acc, c) => {
      const f = c.financial;
      if (!f) return acc;
      return acc + Number(f.valorVenda) + Number(f.valorVendaTef) + Number(f.valorVendaServidor);
    }, 0);

    const totalCusto = activeContracts.reduce((acc, c) => {
      const f = c.financial;
      const custoBase = Number(c.valortotal);
      if (!f) return acc + custoBase;
      return acc + Number(f.valorCustoIntelidata) + Number(f.custoTef) + Number(f.custoUniplus) + Number(f.custoServidor);
    }, 0);

    const valorLiquido = totalVenda - totalCusto;
    const margemPercentual = totalVenda > 0 ? (valorLiquido / totalVenda) * 100 : 0;
    const contratosComVenda = activeContracts.filter(c => c.financial && Number(c.financial.valorVenda) > 0);
    const ticketMedioVenda = contratosComVenda.length > 0 ? totalVenda / contratosComVenda.length : 0;

    // Cards Intelidata
    const totalCustoLicencas = activeContracts.reduce((acc, c) => acc + Number(c.valortotal), 0);
    const ticketMedioCusto = activeContracts.length > 0 ? totalCustoLicencas / activeContracts.length : 0;
    const totalCustoTef = activeContracts.reduce((acc, c) => acc + (c.financial ? Number(c.financial.custoTef) : 0), 0);

    const contratosAbertos = allContracts.filter(c => c.idStatus === 1).length;
    const contratosBloqueados = allContracts.filter(c => c.idStatus === 3).length;
    const contratosEncerrados = allContracts.filter(c => c.idStatus === 2).length;
    const contratosDegustacao = allContracts.filter(c => c.idStatus === 5).length;
    const contratosMigrados = allContracts.filter(c => c.idStatus === 4).length;

    // Cards Servidores
    const totalCustoServidores = serversActive.reduce((acc, s) => acc + Number(s.monthlyCost), 0);
    const totalReceitaServidores = serversActive.reduce((acc, s) => acc + Number(s.monthlyRevenue), 0);
    const margemServidores = totalReceitaServidores > 0
      ? ((totalReceitaServidores - totalCustoServidores) / totalReceitaServidores) * 100
      : 0;

    return {
      vendas: {
        totalVenda: round(totalVenda),
        valorLiquido: round(valorLiquido),
        margemPercentual: round(margemPercentual),
        ticketMedioVenda: round(ticketMedioVenda),
        totalContratosAtivos: activeContracts.length,
      },
      intelidata: {
        totalCustoLicencas: round(totalCustoLicencas),
        totalContratosAtivos: activeContracts.length,
        ticketMedioCusto: round(ticketMedioCusto),
        totalCustoTef: round(totalCustoTef),
        contratosAbertos,
        contratosBloqueados,
        contratosEncerrados,
        contratosDegustacao,
        contratosMigrados,
      },
      servidores: {
        totalServidores: serversActive.length,
        totalCusto: round(totalCustoServidores),
        totalReceita: round(totalReceitaServidores),
        margemPercentual: round(margemServidores),
      },
      metas: currentGoal
        ? {
            ...currentGoal,
            contratosAtivos: activeContracts.length,
            custoIntelidataAtual: round(totalCustoLicencas),
            vendaAtual: round(totalVenda),
          }
        : null,
    };
  }

  private async getCurrentGoal() {
    const now = new Date();
    return this.prisma.goal.findUnique({
      where: { year_month: { year: now.getFullYear(), month: now.getMonth() + 1 } },
    });
  }

  async getCharts(year?: number, yearNovos?: number) {
    const targetYear = year || new Date().getFullYear();
    const targetYearNovos = yearNovos || new Date().getFullYear();

    const [allContracts, byStatus] = await Promise.all([
      this.prisma.contract.findMany({
        select: {
          id: true,
          idStatus: true,
          status: true,
          dataCriacao: true,
          dataEncerramento: true,
          dataMigracao: true,
          valortotal: true,
          financial: { select: { valorVenda: true } },
          migrations: { select: { oldContractId: true } }, // este é o NEW
        },
      }),
      this.prisma.contract.groupBy({
        by: ['idStatus', 'status', 'descricaoStatus'],
        _count: { id: true },
      }),
    ]);

    // IDs de contratos que são "antigos" (foram substituídos por migração)
    // contract.migrations → "NewContract" → este é o NEW → os oldContractId são os ANTIGOS
    const idsSubstituidos = new Set(
      allContracts.flatMap(c => c.migrations.map((m: any) => m.oldContractId))
    );

    // Contratos por status (pizza)
    const contratosPorStatus = byStatus.map(b => ({
      idStatus: b.idStatus,
      status: b.status,
      descricao: b.descricaoStatus,
      total: b._count.id,
    }));

    // ── Novos vs Cancelamentos Reais por mês do ano selecionado ──────────────
    const mesesNovos = [];
    for (let mes = 1; mes <= 12; mes++) {
      mesesNovos.push({
        label: new Date(targetYearNovos, mes - 1).toLocaleDateString('pt-BR', { month: 'short' }),
        mes,
        novos: 0,
        cancelados: 0, // cancelamentos REAIS (encerrados que não são migração)
      });
    }

    for (const c of allContracts) {
      // Novos: criados no ano selecionado
      if (c.dataCriacao) {
        const d = new Date(c.dataCriacao);
        if (d.getFullYear() === targetYearNovos) {
          const m = mesesNovos[d.getMonth()];
          if (m) m.novos++;
        }
      }
      // Cancelados reais: encerrados no ano selecionado que NÃO são migrados
      if (c.dataEncerramento && c.idStatus === 2 && !idsSubstituidos.has(c.id)) {
        const d = new Date(c.dataEncerramento);
        if (d.getFullYear() === targetYearNovos) {
          const m = mesesNovos[d.getMonth()];
          if (m) m.cancelados++;
        }
      }
    }

    // Ativos por mês no ano selecionado
    const ativosPorMes = [];
    for (let mes = 1; mes <= 12; mes++) {
      const mesRef = new Date(targetYear, mes - 1, 1);
      const ativos = allContracts.filter(c => {
        if (!c.dataCriacao) return false;
        const criado = new Date(c.dataCriacao);
        if (criado > mesRef) return false;
        if (c.dataEncerramento) {
          const encerrado = new Date(c.dataEncerramento);
          if (encerrado < mesRef) return false;
        }
        return true;
      });
      ativosPorMes.push({
        mes,
        label: new Date(targetYear, mes - 1).toLocaleDateString('pt-BR', { month: 'short' }),
        ativos: ativos.length,
      });
    }

    // Custo vs Venda por status
    const custoVendaPorStatus = contratosPorStatus.map(s => {
      const contratos = allContracts.filter(c => c.idStatus === s.idStatus);
      const custo = contratos.reduce((acc, c) => acc + Number(c.valortotal), 0);
      const venda = contratos.reduce((acc, c) => acc + (c.financial ? Number(c.financial.valorVenda) : 0), 0);
      return { ...s, custo: round(custo), venda: round(venda) };
    });

    return {
      contratosPorStatus,
      novosPorMes: mesesNovos,
      ativosPorMes,
      custoVendaPorStatus,
      anoNovos: targetYearNovos,
    };
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
