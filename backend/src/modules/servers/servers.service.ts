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
              },
            },
          },
        },
      },
    });

    const summary = await this.getSummary();
    return { servers, summary };
  }

  async getSummary() {
    const servers = await this.prisma.server.findMany({
      where: { status: 'ACTIVE' },
    });

    const total = await this.prisma.server.count();
    const totalActive = servers.length;
    const totalCost = servers.reduce((acc, s) => acc + Number(s.monthlyCost), 0);
    const totalRevenue = servers.reduce((acc, s) => acc + Number(s.monthlyRevenue), 0);
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
