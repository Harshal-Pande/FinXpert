import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async getByClient(clientId: string, assetType?: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        investments: assetType
          ? { where: { investment_type: assetType as any } }
          : true,
      },
    });
    if (!client) throw new NotFoundException('Client not found');

    const allInvestments = client.investments;

    const totalValue = allInvestments.reduce(
      (sum, investment) => sum + investment.total_value,
      0,
    );
    const allocation: Record<string, { value: number; percentage: number }> = {};
    for (const investment of allInvestments) {
      const type = investment.investment_type;
      if (!allocation[type]) {
        allocation[type] = { value: 0, percentage: 0 };
      }
      allocation[type].value += investment.total_value;
    }
    for (const type of Object.keys(allocation)) {
      allocation[type].percentage =
        totalValue > 0
          ? Math.round((allocation[type].value / totalValue) * 1000) / 10
          : 0;
    }

    return {
      client_id: client.id,
      investments: allInvestments,
      total_value: totalValue,
      allocation,
    };
  }
}
