/**
 * One-time: backdate investment created_at (~6 months), rebuild 12 × 15-day PortfolioHistory
 * with ~2–3% growth between checkpoints (per client, anchored to current total AUM).
 *
 * Usage: npx tsx scripts/backdate-portfolio-history.ts
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const inv = await prisma.investment.updateMany({
    data: { created_at: sixMonthsAgo },
  });
  console.log(`Updated created_at on ${inv.count} investments → ${sixMonthsAgo.toISOString()}`);

  const categoryFix = await prisma.$executeRaw`
    UPDATE "Investment"
    SET category = 'DEBT'::"InvestmentCategory"
    WHERE "investment_type" = 'Debt' AND category = 'MUTUAL_FUND'::"InvestmentCategory"
  `;
  console.log(`Aligned legacy Debt rows to DEBT category (rows updated): ${categoryFix}`);

  await prisma.portfolioHistory.deleteMany({});

  const clients = await prisma.client.findMany({
    select: { id: true },
  });

  const startAnchor = new Date(sixMonthsAgo);

  for (const { id: clientId } of clients) {
    const agg = await prisma.investment.aggregate({
      where: { client_id: clientId },
      _sum: { total_value: true },
    });
    const endAum = agg._sum.total_value ?? 0;
    if (endAum <= 0) continue;

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

  console.log(`PortfolioHistory: 12 checkpoints per client for ${clients.length} clients.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
