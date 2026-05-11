import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt, maskSecret } from '../../common/utils/crypto.util';
import axios from 'axios';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  private async getSetting(key: string): Promise<string> {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!setting) return '';
    return decrypt(setting.valueEncrypted);
  }

  private async setSetting(key: string, value: string, description?: string): Promise<void> {
    await this.prisma.appSetting.upsert({
      where: { key },
      create: { key, valueEncrypted: encrypt(value), description },
      update: { valueEncrypted: encrypt(value) },
    });
  }

  async getAllSettings() {
    const keys = [
      'INTELIDATA_BASE_URL',
      'INTELIDATA_TOKEN',
      'UNIPLUS_BASE_URL',
      'UNIPLUS_TENANT',
      'UNIPLUS_TOKEN',
    ];

    const result: Record<string, any> = {};
    for (const key of keys) {
      const value = await this.getSetting(key);
      // Mascarar tokens sensíveis
      if (key.includes('TOKEN')) {
        result[key] = value ? maskSecret(value) : '';
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  async updateIntelidata(baseUrl: string, token?: string) {
    await this.setSetting('INTELIDATA_BASE_URL', baseUrl, 'URL base da API Intelidata');
    if (token && !token.startsWith('*')) {
      await this.setSetting('INTELIDATA_TOKEN', token, 'Token API Intelidata');
    }
  }

  async updateUniplus(baseUrl: string, tenant: string, token?: string) {
    await this.setSetting('UNIPLUS_BASE_URL', baseUrl, 'URL base Uniplus');
    await this.setSetting('UNIPLUS_TENANT', tenant, 'Tenant Uniplus');
    if (token && !token.startsWith('*')) {
      await this.setSetting('UNIPLUS_TOKEN', token, 'Token Uniplus');
    }
  }

  async testIntelidataConnection() {
    const baseUrl = await this.getSetting('INTELIDATA_BASE_URL');
    const token = await this.getSetting('INTELIDATA_TOKEN');

    if (!baseUrl || !token) {
      return { success: false, message: 'URL ou Token não configurados' };
    }

    try {
      const url = baseUrl.endsWith('/') ? `${baseUrl}contratos` : `${baseUrl}/contratos`;
      const response = await axios.get(url, {
        headers: { token },
        timeout: 10000,
      });
      return {
        success: true,
        message: `Conexão bem-sucedida! ${Array.isArray(response.data) ? response.data.length : '?'} contratos encontrados`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erro: ${error?.response?.status ? `HTTP ${error.response.status}` : error.message}`,
      };
    }
  }

  async getIntelidataCredentials() {
    return {
      baseUrl: await this.getSetting('INTELIDATA_BASE_URL'),
      token: await this.getSetting('INTELIDATA_TOKEN'),
    };
  }

  async getUniplusCredentials() {
    return {
      baseUrl: await this.getSetting('UNIPLUS_BASE_URL'),
      tenant: await this.getSetting('UNIPLUS_TENANT'),
      token: await this.getSetting('UNIPLUS_TOKEN'),
    };
  }

  // Metas
  async getGoals(year?: number, month?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;

    return this.prisma.goal.findUnique({
      where: { year_month: { year: y, month: m } },
    });
  }

  async updateGoals(data: {
    year: number;
    month: number;
    desiredActiveContracts: number;
    desiredIntelidataCostValue: number;
    desiredSalesValue: number;
  }) {
    return this.prisma.goal.upsert({
      where: { year_month: { year: data.year, month: data.month } },
      create: data,
      update: {
        desiredActiveContracts: data.desiredActiveContracts,
        desiredIntelidataCostValue: data.desiredIntelidataCostValue,
        desiredSalesValue: data.desiredSalesValue,
      },
    });
  }

  async getSyncLogs() {
    return this.prisma.syncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
  }
}
