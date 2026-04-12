import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { AiInsightService } from '../../services/ai-insight.service';

@Injectable()
export class PortfolioPriceRefreshCron {
  private readonly logger = new Logger(PortfolioPriceRefreshCron.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly aiInsight?: AiInsightService,
  ) {}

  @Cron('0 */6 * * *')
  async refreshAllCmpAndAum() {
    await this.prisma.investment.updateMany({ data: { cmp: 0 } });

    if (!this.aiInsight) {
      this.logger.warn('GEMINI_API_KEY missing — CMP refresh skipped after wipe.');
      return;
    }

    const rows = await this.prisma.investment.findMany({
      select: {
        id: true,
        client_id: true,
        instrument_name: true,
        quantity: true,
        buyPrice: true,
        category: true,
      },
    });

    const clientIds = new Set<string>();

    for (const inv of rows) {
      let cmp = inv.buyPrice;
      const resolved = await this.aiInsight.resolveInstrumentCurrentPriceInr(
        inv.instrument_name,
        inv.category,
      );
      if (resolved != null && resolved > 0) {
        cmp = resolved;
      }

      const total_value = inv.quantity * cmp;
      await this.prisma.investment.update({
        where: { id: inv.id },
        data: { cmp, total_value },
      });
      clientIds.add(inv.client_id);
    }

    for (const clientId of clientIds) {
      const agg = await this.prisma.investment.aggregate({
        where: { client_id: clientId },
        _sum: { total_value: true },
      });
      const total = agg._sum.total_value ?? 0;
      await this.prisma.client.update({
        where: { id: clientId },
        data: { total_aum: total },
      });
    }

    this.logger.log(`CMP refresh complete for ${rows.length} investments, ${clientIds.size} clients.`);
  }
}
