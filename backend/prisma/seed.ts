import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(key.padEnd(32).slice(0, 32)),
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  const encryptionKey = process.env.ENCRYPTION_KEY || 'chave_padrao_32_chars_mudar_prod';

  // Criar usuário admin
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@revendahub.com' },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@revendahub.com',
        passwordHash,
        role: 'ADMIN',
        active: true,
      },
    });
    console.log('✅ Usuário admin criado: admin@revendahub.com / Admin@123');
  } else {
    console.log('ℹ️  Usuário admin já existe');
  }

  // Configurações padrão da Intelidata
  const settings = [
    {
      key: 'INTELIDATA_BASE_URL',
      value: 'https://canal.intelidata.inf.br/public-api',
      description: 'URL base da API pública Intelidata',
    },
    {
      key: 'INTELIDATA_TOKEN',
      value: '',
      description: 'Token de autenticação da API Intelidata',
    },
    {
      key: 'UNIPLUS_BASE_URL',
      value: '',
      description: 'URL base do servidor Uniplus do cliente',
    },
    {
      key: 'UNIPLUS_TENANT',
      value: '',
      description: 'Tenant/conta do Uniplus',
    },
    {
      key: 'UNIPLUS_TOKEN',
      value: '',
      description: 'Token de acesso Bearer do Uniplus',
    },
  ];

  for (const setting of settings) {
    const existing = await prisma.appSetting.findUnique({
      where: { key: setting.key },
    });
    if (!existing) {
      await prisma.appSetting.create({
        data: {
          key: setting.key,
          valueEncrypted: encrypt(setting.value, encryptionKey),
          description: setting.description,
        },
      });
      console.log(`✅ Configuração criada: ${setting.key}`);
    }
  }

  // Meta inicial do mês atual
  const now = new Date();
  const existingGoal = await prisma.goal.findUnique({
    where: { year_month: { year: now.getFullYear(), month: now.getMonth() + 1 } },
  });

  if (!existingGoal) {
    await prisma.goal.create({
      data: {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        desiredActiveContracts: 100,
        desiredIntelidataCostValue: 10000,
        desiredSalesValue: 15000,
      },
    });
    console.log('✅ Meta inicial criada');
  }

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
