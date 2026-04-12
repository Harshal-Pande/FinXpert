import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { InvestmentCategory, InvestmentType, Prisma, PrismaClient } from '@prisma/client';
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

function mapCategory(type: InvestmentType): InvestmentCategory {
  if (type === 'Stock') return 'STOCK';
  if (type === 'Crypto') return 'CRYPTO';
  if (type === 'Mutual_Fund') return 'MUTUAL_FUND';
  return 'DEBT';
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
  try {
    await prisma.complianceObligation.deleteMany({ where: { advisor_id: advisor.id } });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2021')) {
      throw e;
    }
    console.warn(
      '⚠️  Skipping compliance cleanup — table missing. Apply schema: npx prisma db push  (dev) or npx prisma migrate deploy',
    );
  }
  await prisma.client.deleteMany({ where: { advisor_id: advisor.id } });

  // 2. Create Clients with direct investments from normalized dataset
  const clientsData = loadSeedClients().slice(0, 15);
  const createdClients: { id: string; name: string }[] = [];

  for (const data of clientsData) {
    const investments = data.investments.map((item) => {
      const quantity = Number(item.quantity);
      const buyRate = Number(item.buy_rate);
      const type = normalizeInvestmentType(item.investment_type);
      const currentPrice = buyRate * 1.08;
      return {
        investment_type: type,
        category: mapCategory(type),
        instrument_name: item.instrument_name,
        quantity,
        buyPrice: buyRate,
        totalCost: quantity * buyRate,
        cmp: currentPrice,
        buy_rate: buyRate,
        total_value: quantity * currentPrice,
        bought_at: new Date(item.bought_at),
      };
    });

    const totalAumSeed = investments.reduce((s, i) => s + i.total_value, 0);

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
        total_aum: totalAumSeed,
        investments: {
          create: investments,
        },
      },
    });
    createdClients.push({ id: client.id, name: client.name });
    console.log(`👤 Created client: ${client.name}`);

    if (client.name === 'Ishita Sen') {
      const overrides = [
        {
          instrument_name: 'Nykaa',
          quantity: 400,
          buyPrice: 155,
          cmp: 178,
        },
        {
          instrument_name: 'Zomato',
          quantity: 800,
          buyPrice: 195,
          cmp: 182,
        },
        {
          instrument_name: 'Bitcoin',
          quantity: 0.12,
          buyPrice: 5_500_000,
          cmp: 6_200_000,
        },
        {
          instrument_name: 'HDFC MF',
          quantity: 500,
          buyPrice: 120,
          cmp: 145,
        },
      ] as const;

      for (const item of overrides) {
        const result = await prisma.investment.updateMany({
          where: {
            client_id: client.id,
            instrument_name: item.instrument_name,
          },
          data: {
            quantity: item.quantity,
            buyPrice: item.buyPrice,
            totalCost: item.quantity * item.buyPrice,
            cmp: item.cmp,
            buy_rate: item.buyPrice,
            total_value: item.quantity * item.cmp,
          },
        });

        if (result.count === 0) {
          const investment_type =
            item.instrument_name === 'Bitcoin'
              ? 'Crypto'
              : item.instrument_name === 'HDFC MF'
                ? 'Mutual_Fund'
                : 'Stock';
          const category =
            item.instrument_name === 'Bitcoin'
              ? 'CRYPTO'
              : item.instrument_name === 'HDFC MF'
                ? 'MUTUAL_FUND'
                : 'STOCK';

          await prisma.investment.create({
            data: {
              client_id: client.id,
              investment_type,
              category,
              instrument_name: item.instrument_name,
              quantity: item.quantity,
              buyPrice: item.buyPrice,
              totalCost: item.quantity * item.buyPrice,
              cmp: item.cmp,
              buy_rate: item.buyPrice,
              total_value: item.quantity * item.cmp,
              bought_at: new Date(),
            },
          });
        }
      }

      const ishitaAum = await prisma.investment.aggregate({
        where: { client_id: client.id },
        _sum: { total_value: true },
      });
      await prisma.client.update({
        where: { id: client.id },
        data: { total_aum: ishitaAum._sum.total_value ?? 0 },
      });
    }
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

  const complianceRows = [
    {
      advisor_id: advisor.id,
      name: 'Quarterly Advance Tax Payment',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'urgent',
    },
    {
      advisor_id: advisor.id,
      name: 'Annual GST Return Filing',
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: 'pending',
    },
    {
      advisor_id: advisor.id,
      name: 'KYC Update — banking partners',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'urgent',
    },
    {
      advisor_id: advisor.id,
      name: 'Form 15G / 15H submission window',
      due_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      status: 'pending',
    },
  ];
  try {
    await prisma.complianceObligation.createMany({ data: complianceRows });
    console.log(`✅ Created ${complianceRows.length} compliance obligations`);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2021') {
      console.warn('⚠️  Skipping compliance seed — ComplianceObligation table does not exist yet.');
    } else {
      throw e;
    }
  }

  // 4. Seed 15-day PortfolioHistory checkpoints (~6 months, 12 points)
  await prisma.portfolioHistory.deleteMany({
    where: { client: { advisor_id: advisor.id } },
  });

  const NAMED_END_AUM: Record<string, number> = {
    'Aditi Rao': 9_100_000,
    'Ishita Sen': 5_300_000,
  };

  const startAnchor = new Date();
  startAnchor.setMonth(startAnchor.getMonth() - 6);

  for (const { id: clientId, name } of createdClients) {
    const endAum =
      NAMED_END_AUM[name] ??
      (await prisma.investment.aggregate({
        where: { client_id: clientId },
        _sum: { total_value: true },
      }))._sum.total_value ??
      1;

    const n = 12;
    const growthFactors = Array.from({ length: n - 1 }, () => 1.02 + Math.random() * 0.01);
    const product = growthFactors.reduce((a, b) => a * b, 1);
    let v = endAum / product;

    const rows: { client_id: string; date: Date; total_aum: number }[] = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(startAnchor);
      d.setDate(d.getDate() + i * 15);
      rows.push({ client_id: clientId, date: d, total_aum: Math.round(v) });
      if (i < n - 1) v *= growthFactors[i]!;
    }
    rows[n - 1]!.total_aum = Math.round(endAum);

    await prisma.portfolioHistory.createMany({
      data: rows.map((r) => ({
        client_id: r.client_id,
        date: r.date,
        total_aum: r.total_aum,
      })),
    });
  }

  console.log(
    `✅ Created portfolio history (12 × 15-day checkpoints) for ${createdClients.length} clients`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
