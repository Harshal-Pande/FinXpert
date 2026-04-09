import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

type SeedAsset = {
  assetType: 'stock' | 'mutual_fund' | 'crypto' | 'debt';
  assetName: string;
  value: number;
};

type SeedClient = {
  clientCode: number;
  name: string;
  age: number;
  occupation: string;
  annualIncome: number;
  monthlyExpense: number;
  riskProfile: string;
  investmentHorizon: string;
  emergencyFund: number;
  insuranceCoverage: number;
  portfolioTotalValue: number;
  portfolioTarget: {
    stock: number;
    mutual_fund: number;
    crypto: number;
    debt: number;
  };
  assets: SeedAsset[];
};

function loadSeedClients(): SeedClient[] {
  const seedPath = path.join(__dirname, 'data', 'clients.seed.json');
  const raw = fs.readFileSync(seedPath, 'utf-8');
  return JSON.parse(raw) as SeedClient[];
}

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create an Advisor
  const advisor = await prisma.advisor.upsert({
    where: { email: 'advisor@finxpert.com' },
    update: {},
    create: {
      email: 'advisor@finxpert.com',
      password: hashedPassword,
    },
  });

  console.log('✅ Advisor created: advisor@finxpert.com');

  // Keep seed idempotent for this advisor: reset only advisor-scoped data.
  await prisma.todoItem.deleteMany({ where: { advisor_id: advisor.id } });
  await prisma.client.deleteMany({ where: { advisor_id: advisor.id } });

  // 2. Create Clients with Portfolios from normalized dataset
  const clientsData = loadSeedClients();
  const createdClients: { id: string; name: string }[] = [];

  for (const data of clientsData) {
    const client = await prisma.client.create({
      data: {
        advisor_id: advisor.id,
        name: data.name,
        age: data.age,
        occupation: data.occupation,
        annual_income: data.annualIncome,
        monthly_expense: data.monthlyExpense,
        risk_profile: data.riskProfile,
        investment_horizon: data.investmentHorizon,
        emergency_fund: data.emergencyFund,
        insurance_coverage: data.insuranceCoverage,
        portfolio: {
          create: {
            total_value: data.portfolioTotalValue,
            assets: {
              create: data.assets.map((asset) => ({
                asset_type: asset.assetType,
                asset_name: asset.assetName,
                value: asset.value,
              })),
            },
          },
        },
        portfolioTarget: {
          create: {
            stock_target: data.portfolioTarget.stock,
            mutual_fund_target: data.portfolioTarget.mutual_fund,
            crypto_target: data.portfolioTarget.crypto,
            debt_target: data.portfolioTarget.debt,
          },
        },
      },
    });
    createdClients.push({ id: client.id, name: client.name });
    console.log(`👤 Created client: ${client.name} (${data.clientCode})`);
  }

  // 3. Create sample TodoItems for the advisor
  const client1 = createdClients[0];
  const client2 = createdClients[1];
  const client3 = createdClients[2];
  const todoItems = [
    {
      advisor_id: advisor.id,
      client_id: client1?.id,
      title: `Review ${client1?.name ?? 'client'} portfolio rebalancing`,
      description: 'Check if stock allocation needs adjustment after recent market changes',
      status: 'pending',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    },
    {
      advisor_id: advisor.id,
      client_id: client2?.id,
      title: `Schedule ${client2?.name ?? 'client'} quarterly review`,
      description: 'Discuss mutual fund performance and investment horizon',
      status: 'pending',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
    },
    {
      advisor_id: advisor.id,
      client_id: client3?.id,
      title: `Assess ${client3?.name ?? 'client'} crypto exposure risk`,
      description: `${client3?.name ?? 'Client'} has aggressive risk profile with high crypto allocation and needs review`,
      status: 'in_progress',
      due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
    },
    {
      advisor_id: advisor.id,
      title: 'Update market outlook report',
      description: 'Prepare weekly market analysis based on latest economic data',
      status: 'pending',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
    },
  ];

  for (const todo of todoItems) {
    await prisma.todoItem.create({ data: todo });
  }

  console.log(`✅ Created ${todoItems.length} todo items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });