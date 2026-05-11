// servers.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const servers = await this.prisma.server.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { contractServers: true } },
        contractServers: {
          include: {
            contract: {
              select: {
                id: true,
                clienteFinal: true,
                cpfCnpj: true,
                idStatus: true,
                status: true,
                financial: { select: { valorVendaServidor: true } },
              },
            },
          },
        },
      },
    });

    // Calcular receita real de cada servidor (soma de valorVendaServidor dos contratos vinculados)
    const serversComReceita = servers.map(s => {
      const receitaReal = s.contractServers.reduce((acc, cs) => {
        return acc + Number(cs.contract?.financial?.valorVendaServidor ?? 0);
      }, 0);
      return {
        ...s,
        receitaReal: Math.round(receitaReal * 100) / 100,
      };
    });

    const summary = await this.getSummary();
    return { servers: serversComReceita, summary };
  }

  async getSummary() {
    // Buscar servidores ativos com contratos e financeiro vinculados
    const servers = await this.prisma.server.findMany({
      where: { status: 'ACTIVE' },
      include: {
        contractServers: {
          include: {
            contract: {
              select: {
                financial: { select: { valorVendaServidor: true } },
              },
            },
          },
        },
      },
    });

    const total = await this.prisma.server.count();
    const totalActive = servers.length;
    const totalCost = servers.reduce((acc, s) => acc + Number(s.monthlyCost), 0);

    // Receita real = soma de valorVendaServidor de todos os contratos vinculados
    const totalRevenue = servers.reduce((accS, s) => {
      const receitaServidor = s.contractServers.reduce((accC, cs) => {
        return accC + Number(cs.contract?.financial?.valorVendaServidor ?? 0);
      }, 0);
      return accS + receitaServidor;
    }, 0);

    const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    return {
      total,
      totalActive,
      totalCost: Math.round(totalCost * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      margin: Math.round(margin * 100) / 100,
    };
  }

  async findById(id: string) {
    const server = await this.prisma.server.findUnique({
      where: { id },
      include: {
        contractServers: {
          include: {
            contract: {
              select: { id: true, clienteFinal: true, cpfCnpj: true, idStatus: true, status: true },
            },
          },
        },
      },
    });
    if (!server) throw new NotFoundException('Servidor não encontrado');
    return server;
  }

  async create(data: any) {
    return this.prisma.server.create({ data });
  }

  async update(id: string, data: any) {
    await this.findById(id);
    return this.prisma.server.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.findById(id);
    // Remover vínculos antes de deletar
    await this.prisma.contractServer.deleteMany({ where: { serverId: id } });
    return this.prisma.server.delete({ where: { id } });
  }
}
