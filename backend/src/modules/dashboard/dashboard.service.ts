import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(advisorId?: string) {
    const clientWhere: Record<string, unknown> = {};
    if (advisorId && advisorId !== 'undefined') {
      clientWhere.advisor_id = advisorId;
    }

    const [totalClients, investments, marketAlerts, recentInsights, todos] =
      await Promise.all([
        this.prisma.client.count({ where: clientWhere }),
        this.prisma.investment.findMany({
          where: clientWhere.advisor_id
            ? { client: { advisor_id: clientWhere.advisor_id as string } }
            : {},
          select: { total_value: true },
        }),
        this.prisma.marketInsight.count({
          where: {
            created_at: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
            },
          },
        }),
        this.prisma.marketInsight.findMany({
          take: 5,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.todoItem.count({
          where: {
            ...(advisorId && advisorId !== 'undefined'
              ? { advisor_id: advisorId }
              : {}),
            status: { not: 'done' },
          },
        }),
      ]);

    const totalAUM = investments.reduce((sum, investment) => sum + investment.total_value, 0);

    return {
      totalClients,
      totalAUM,
      marketAlerts,
      pendingTodos: todos,
      recentInsights,
    };
  }
}
