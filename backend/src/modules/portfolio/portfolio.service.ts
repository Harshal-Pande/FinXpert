import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async getByClient(clientId: string, assetType?: string) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { client_id: clientId },
      include: {
        assets: assetType
          ? { where: { asset_type: assetType } }
          : true,
      },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');

    // Compute allocation breakdown
    const allAssets = await this.prisma.asset.findMany({
      where: { portfolio_id: portfolio.id },
    });

    const totalValue = allAssets.reduce((sum, a) => sum + a.value, 0);
    const allocation: Record<string, { value: number; percentage: number }> = {};
    for (const asset of allAssets) {
      const type = asset.asset_type;
      if (!allocation[type]) {
        allocation[type] = { value: 0, percentage: 0 };
      }
      allocation[type].value += asset.value;
    }
    for (const type of Object.keys(allocation)) {
      allocation[type].percentage =
        totalValue > 0
          ? Math.round((allocation[type].value / totalValue) * 1000) / 10
          : 0;
    }

    return {
      ...portfolio,
      allocation,
    };
  }
}
