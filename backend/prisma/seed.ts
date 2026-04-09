import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { InvestmentType, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

type SeedInvestment = {
  investment_type: string;
  instrument_name: string;
  quantity: number;
  buy_rate: number;
  bought_at: string;
};

type SeedClient = {
  name: string;
  age: number;
  occupation: string;
  annual_income: number;
  monthly_expense: number;
  emergency_fund: number;
  insurance_coverage: number;
  risk_profile: string;
  investment_horizon: string;
  investments: SeedInvestment[];
};

function loadSeedClients(): SeedClient[] {
  const seedPath = path.join(__dirname, 'data', 'clients.seed.json');
  const raw = fs.readFileSync(seedPath, 'utf-8');
  return JSON.parse(raw) as SeedClient[];
}

function normalizeInvestmentType(input: string): InvestmentType {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'stock') return InvestmentType.Stock;
  if (normalized === 'crypto') return InvestmentType.Crypto;
  if (normalized === 'debt') return InvestmentType.Debt;
  if (normalized === 'mutual_fund') return InvestmentType.Mutual_Fund;

  throw new Error(`Unsupported investment_type in seed JSON: "${input}"`);
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
  await prisma.investment.deleteMany({
    where: {
      client: {
        advisor_id: advisor.id,
      },
    },
  });
  await prisma.todoItem.deleteMany({ where: { advisor_id: advisor.id } });
  await prisma.client.deleteMany({ where: { advisor_id: advisor.id } });

  // 2. Create Clients with direct investments from normalized dataset
  const clientsData = loadSeedClients().slice(0, 15);
  const createdClients: { id: string; name: string }[] = [];

  for (const data of clientsData) {
    const investments = data.investments.map((item) => {
      const quantity = Number(item.quantity);
      const buyRate = Number(item.buy_rate);
      return {
        investment_type: normalizeInvestmentType(item.investment_type),
        instrument_name: item.instrument_name,
        quantity,
        buy_rate: buyRate,
        total_value: quantity * buyRate,
        bought_at: new Date(item.bought_at),
      };
    });

    const client = await prisma.client.create({
      data: {
        advisor_id: advisor.id,
        name: data.name,
        age: data.age,
        occupation: data.occupation,
        annual_income: data.annual_income,
        monthly_expense: data.monthly_expense,
        risk_profile: data.risk_profile,
        investment_horizon: data.investment_horizon,
        emergency_fund: data.emergency_fund,
        insurance_coverage: data.insurance_coverage,
        investments: {
          create: investments,
        },
      },
    });
    createdClients.push({ id: client.id, name: client.name });
    console.log(`👤 Created client: ${client.name}`);
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