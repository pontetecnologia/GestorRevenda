import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_STATUS_IDS = [1, 3, 5];
const round = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSaasIndicators(startDate?: string, endDate?: string) {
    const where: any = { idStatus: { in: ACTIVE_STATUS_IDS } };
    if (startDate || endDate) {
      where.dataCriacao = {};
      if (startDate) where.dataCriacao.gte = new Date(startDate);
      if (endDate) where.dataCriacao.lte = new Date(endDate);
    }

    const [activeContracts, allContracts] = await Promise.all([
      this.prisma.contract.findMany({
        where: { idStatus: { in: ACTIVE_STATUS_IDS } },
        include: { financial: true },
      }),
      this.prisma.contract.findMany({ include: { financial: true, migrations: true } }),
    ]);

    // MRR = soma das receitas mensais dos contratos ativos
    const mrr = activeContracts.reduce((acc, c) => {
      if (!c.financial) return acc;
      return acc + Number(c.financial.valorVenda) + Number(c.financial.valorVendaTef) + Number(c.financial.valorVendaServidor);
    }, 0);

    const arr = mrr * 12;
    const ticketMedio = activeContracts.length > 0 ? mrr / activeContracts.length : 0;

    // Novos contratos (últimos 30 dias)
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    const novos30 = allContracts.filter(c => c.dataCriacao && new Date(c.dataCriacao) >= last30);

    // Cancelamentos reais (encerrados que NÃO são migrados)
    const migradosIds = new Set(
      allContracts.flatMap(c => c.migrations.map(m => m.oldContractId))
    );
    const canceladosReais = allContracts.filter(c =>
      c.idStatus === 2 && !migradosIds.has(c.id)
    );

    // Churn rate
    const totalAnterior = activeContracts.length + canceladosReais.length;
    const churnRate = totalAnterior > 0 ? (canceladosReais.length / totalAnterior) * 100 : 0;

    // Evolução MRR mensal
    const mrrEvolucao = await this.getMrrEvolucao(allContracts);

    return {
      mrr: round(mrr),
      arr: round(arr),
      contratosAtivos: activeContracts.length,
      ticketMedio: round(ticketMedio),
      novosUltimos30: novos30.length,
      canceladosReais: canceladosReais.length,
      churnRate: round(churnRate),
      mrrEvolucao,
    };
  }

  private async getMrrEvolucao(allContracts: any[]) {
    const now = new Date();
    const meses = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ativos = allContracts.filter(c => {
        if (!c.dataCriacao) return false;
        const criado = new Date(c.dataCriacao);
        if (criado > d) return false;
        if (c.dataEncerramento) {
          const enc = new Date(c.dataEncerramento);
          if (enc < d) return false;
        }
        return ACTIVE_STATUS_IDS.includes(c.idStatus) || (c.dataEncerramento && new Date(c.dataEncerramento) > d);
      });
      const mrr = ativos.reduce((acc, c) => {
        if (!c.financial) return acc;
        return acc + Number(c.financial.valorVenda) + Number(c.financial.valorVendaTef) + Number(c.financial.valorVendaServidor);
      }, 0);
      meses.push({
        label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        mrr: round(mrr),
        contratos: ativos.length,
      });
    }
    return meses;
  }

  async getAbcCurve() {
    const contracts = await this.prisma.contract.findMany({
      where: { idStatus: { in: ACTIVE_STATUS_IDS } },
      include: { financial: true },
    });

    const clientes = contracts.map(c => ({
      id: c.id,
      cliente: c.clienteFinal,
      cpfCnpj: c.cpfCnpj,
      receita: c.financial
        ? round(Number(c.financial.valorVenda) + Number(c.financial.valorVendaTef) + Number(c.financial.valorVendaServidor))
        : 0,
    })).sort((a, b) => b.receita - a.receita);

    const totalReceita = clientes.reduce((acc, c) => acc + c.receita, 0);
    let acumulado = 0;

    const resultado = clientes.map(c => {
      acumulado += c.receita;
      const participacao = totalReceita > 0 ? (c.receita / totalReceita) * 100 : 0;
      const participacaoAcumulada = totalReceita > 0 ? (acumulado / totalReceita) * 100 : 0;
      const classe = participacaoAcumulada <= 80 ? 'A' : participacaoAcumulada <= 95 ? 'B' : 'C';
      return {
        ...c,
        participacao: round(participacao),
        participacaoAcumulada: round(participacaoAcumulada),
        classe,
      };
    });

    return {
      totalReceita: round(totalReceita),
      clientes: resultado,
      resumo: {
        classeA: resultado.filter(c => c.classe === 'A').length,
        classeB: resultado.filter(c => c.classe === 'B').length,
        classeC: resultado.filter(c => c.classe === 'C').length,
      },
    };
  }

  async getProfitability(orderBy?: string) {
    const contracts = await this.prisma.contract.findMany({
      where: { idStatus: { in: ACTIVE_STATUS_IDS } },
      include: { financial: true },
    });

    const ranking = contracts.map(c => {
      const f = c.financial;
      const receita = f ? round(Number(f.valorVenda) + Number(f.valorVendaTef) + Number(f.valorVendaServidor)) : 0;
      const custo = f ? round(Number(f.valorCustoIntelidata) + Number(f.custoTef) + Number(f.custoUniplus) + Number(f.custoServidor)) : round(Number(c.valortotal));
      const margem = receita - custo;
      const margemPct = receita > 0 ? (margem / receita) * 100 : 0;
      return {
        id: c.id,
        cliente: c.clienteFinal,
        cpfCnpj: c.cpfCnpj,
        receita,
        custo,
        margem: round(margem),
        margemPct: round(margemPct),
      };
    });

    const sorted = [...ranking];
    if (orderBy === 'margem_pct') sorted.sort((a, b) => b.margemPct - a.margemPct);
    else if (orderBy === 'receita') sorted.sort((a, b) => b.receita - a.receita);
    else if (orderBy === 'custo') sorted.sort((a, b) => b.custo - a.custo);
    else sorted.sort((a, b) => b.margem - a.margem);

    const top5 = sorted.slice(0, 5);
    const totalReceita = round(ranking.reduce((acc, r) => acc + r.receita, 0));
    const totalCusto = round(ranking.reduce((acc, r) => acc + r.custo, 0));
    const totalMargem = round(totalReceita - totalCusto);
    const totalMargemPct = totalReceita > 0 ? round((totalMargem / totalReceita) * 100) : 0;

    return {
      resumo: { totalReceita, totalCusto, totalMargem, totalMargemPct },
      top5,
      ranking: sorted.map((r, i) => ({ posicao: i + 1, ...r })),
    };
  }

  async getCancellations(startDate?: string, endDate?: string) {
    const allContracts = await this.prisma.contract.findMany({
      include: { financial: true, migrations: true, oldMigrations: true },
    });

    const migradosIds = new Set(
      allContracts.flatMap(c => c.migrations.map(m => m.oldContractId))
    );

    let encerrados = allContracts.filter(c => c.idStatus === 2);
    if (startDate) encerrados = encerrados.filter(c => c.dataEncerramento && new Date(c.dataEncerramento) >= new Date(startDate));
    if (endDate) encerrados = encerrados.filter(c => c.dataEncerramento && new Date(c.dataEncerramento) <= new Date(endDate));

    const cancelados = encerrados.filter(c => !migradosIds.has(c.id));
    const migrados = encerrados.filter(c => migradosIds.has(c.id));

    const receitaPerdida = cancelados.reduce((acc, c) => {
      if (!c.financial) return acc;
      return acc + Number(c.financial.valorVenda) + Number(c.financial.valorVendaTef) + Number(c.financial.valorVendaServidor);
    }, 0);

    const custosEliminados = cancelados.reduce((acc, c) => acc + Number(c.valortotal), 0);

    // Por mês
    const porMes: Record<string, number> = {};
    for (const c of cancelados) {
      if (c.dataEncerramento) {
        const key = new Date(c.dataEncerramento).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        porMes[key] = (porMes[key] || 0) + 1;
      }
    }

    return {
      totalCancelados: cancelados.length,
      totalMigrados: migrados.length,
      receitaPerdida: round(receitaPerdida),
      custosEliminados: round(custosEliminados),
      impactoLiquido: round(receitaPerdida - custosEliminados),
      cancelados: cancelados.map(c => ({
        id: c.id,
        cliente: c.clienteFinal,
        cpfCnpj: c.cpfCnpj,
        dataEncerramento: c.dataEncerramento,
      })),
      migrados: migrados.map(c => ({
        id: c.id,
        cliente: c.clienteFinal,
        cpfCnpj: c.cpfCnpj,
        dataMigracao: c.dataMigracao,
      })),
      evolucaoPorMes: Object.entries(porMes).map(([mes, total]) => ({ mes, total })),
    };
  }

  async getGeneral() {
    const allContracts = await this.prisma.contract.findMany({
      include: { financial: true, contractServers: true },
    });

    const ativos = allContracts.filter(c => ACTIVE_STATUS_IDS.includes(c.idStatus));
    const semValorVenda = ativos.filter(c => !c.financial || Number(c.financial.valorVenda) === 0);
    const margemNegativa = ativos.filter(c => c.financial && Number(c.financial.valorLiquido) < 0);
    const semServidor = ativos.filter(c => c.contractServers.length === 0 && c.tipoContrato?.toLowerCase() === 'web');
    const emRiscoBloqueio = ativos.filter(c => c.diasParaBloqueio > 0 && c.diasParaBloqueio <= 7);

    const totalReceita = ativos.reduce((acc, c) => {
      if (!c.financial) return acc;
      return acc + Number(c.financial.valorVenda) + Number(c.financial.valorVendaTef) + Number(c.financial.valorVendaServidor);
    }, 0);

    const ticketMedio = ativos.length > 0 ? totalReceita / ativos.length : 0;

    return {
      totalAtivos: ativos.length,
      totalReceita: round(totalReceita),
      ticketMedio: round(ticketMedio),
      alertas: {
        semValorVenda: semValorVenda.length,
        margemNegativa: margemNegativa.length,
        semServidor: semServidor.length,
        emRiscoBloqueio: emRiscoBloqueio.length,
        contratosBloqueados: ativos.filter(c => c.idStatus === 3).length,
      },
      semValorVendaLista: semValorVenda.map(c => ({ id: c.id, cliente: c.clienteFinal, cpfCnpj: c.cpfCnpj })),
      margemNegativaLista: margemNegativa.map(c => ({
        id: c.id,
        cliente: c.clienteFinal,
        cpfCnpj: c.cpfCnpj,
        margem: c.financial ? round(Number(c.financial.valorLiquido)) : 0,
      })),
      emRiscoBloqueioLista: emRiscoBloqueio.map(c => ({
        id: c.id,
        cliente: c.clienteFinal,
        diasParaBloqueio: c.diasParaBloqueio,
      })),
    };
  }
}
