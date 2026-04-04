import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

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

  // 2. Create Clients with Portfolios
  const clientsData = [
    { name: 'Rahul Sharma', age: 34, risk: 'aggressive', income: 1800000, color: 'Stocks' },
    { name: 'Anita Patel', age: 45, risk: 'moderate', income: 2500000, color: 'Mutual Funds' },
    { name: 'Kevin Dsouza', age: 28, risk: 'aggressive', income: 1200000, color: 'Crypto' },
  ];

  const createdClients: { id: string; name: string }[] = [];

  for (const data of clientsData) {
    const client = await prisma.client.create({
      data: {
        advisor_id: advisor.id,
        name: data.name,
        age: data.age,
        occupation: 'Software Engineer',
        annual_income: data.income,
        monthly_expense: data.income / 24, // 50% savings rate
        risk_profile: data.risk,
        emergency_fund: data.income / 4,
        insurance_coverage: data.income * 5, // 5x annual income
        portfolio: {
          create: {
            total_value: 1000000,
            assets: {
              create: [
                { asset_type: 'stock', asset_name: 'Reliance Industries', value: 400000 },
                { asset_type: 'mutual_fund', asset_name: 'HDFC Index Fund', value: 300000 },
                { asset_type: 'crypto', asset_name: 'Bitcoin', value: 200000 },
                { asset_type: 'debt', asset_name: 'Govt Bonds', value: 100000 },
              ]
            }
          }
        },
        portfolioTarget: {
          create: {
            stock_target: 0.5,
            mutual_fund_target: 0.3,
            crypto_target: 0.1,
            debt_target: 0.1
          }
        }
      }
    });
    createdClients.push({ id: client.id, name: client.name });
    console.log(`👤 Created client: ${client.name}`);
  }

  // 3. Create sample TodoItems for the advisor
  const todoItems = [
    {
      advisor_id: advisor.id,
      client_id: createdClients[0]?.id,
      title: 'Review Rahul\'s portfolio rebalancing',
      description: 'Check if stock allocation needs adjustment after recent market changes',
      status: 'pending',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    },
    {
      advisor_id: advisor.id,
      client_id: createdClients[1]?.id,
      title: 'Schedule Anita\'s quarterly review',
      description: 'Discuss mutual fund performance and investment horizon',
      status: 'pending',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
    },
    {
      advisor_id: advisor.id,
      client_id: createdClients[2]?.id,
      title: 'Assess Kevin\'s crypto exposure risk',
      description: 'Kevin has aggressive risk profile with high crypto allocation — needs review',
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