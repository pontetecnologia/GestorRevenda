// users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: 'SUPPORT' | 'MANAGER' | 'ADMIN';
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: 'SUPPORT' | 'MANAGER' | 'ADMIN';
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) throw new ConflictException('Email já cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        role: dto.role,
      },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email.toLowerCase().trim() }),
        ...(dto.role && { role: dto.role }),
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
  }

  async activate(id: string) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { active: true },
      select: { id: true, active: true },
    });
  }

  async deactivate(id: string, requesterId: string) {
    if (id === requesterId) throw new ForbiddenException('Você não pode desativar sua própria conta');
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { active: false },
      select: { id: true, active: true },
    });
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findById(id);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: { id: true },
    });
  }
}
