import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MarketNewsService } from '../market/market-news.service';

export interface StrategicInsight {
  title: string;
  recommendation: string;
  impact: string;
  category: 'REBALANCE' | 'DEPLOY' | 'RISK' | 'EXPERT';
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketNews: MarketNewsService,
  ) {}

  async getSummary(advisorId?: string) {
    const clientWhere: Record<string, unknown> = {};
    if (advisorId && advisorId !== 'undefined') {
      clientWhere.advisor_id = advisorId;
    }

    const [totalClients, investments, marketAlerts, allClients, todos, news] =
      await Promise.all([
        this.prisma.client.count({ where: clientWhere }),
        this.prisma.investment.findMany({
          where: clientWhere.advisor_id
            ? { client: { advisor_id: clientWhere.advisor_id as string } }
            : {},
          include: { client: true },
        }),
        this.prisma.marketInsight.count({
          where: {
            created_at: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
            },
          },
        }),
        this.prisma.client.findMany({
          where: clientWhere,
          select: { id: true, name: true, healthScores: { orderBy: { calculated_at: 'desc' }, take: 1 } },
        }),
        this.prisma.todoItem.count({
          where: {
            ...(advisorId && advisorId !== 'undefined'
              ? { advisor_id: advisorId }
              : {}),
            status: { not: 'done' },
          },
        }),
        this.marketNews.getNews(),
      ]);

    const totalAUM = investments.reduce((sum, inv) => sum + inv.total_value, 0);
    const avgHealthScore = allClients.length > 0 
      ? allClients.reduce((sum, c) => sum + (c.healthScores[0]?.score || 0), 0) / allClients.length 
      : 0;

    // --- Dynamic Strategic Insights ---
    const insights: StrategicInsight[] = [];

    // 1. News Correlation (Prioritize highest available impact)
    const priorityMap = { High: 3, Med: 2, Low: 1 };
    const sortedNews = [...news].sort((a, b) => (priorityMap[b.impact] ?? 0) - (priorityMap[a.impact] ?? 0));
    const topNews = sortedNews[0];

    if (topNews) {
      insights.push({
        category: 'EXPERT',
        title: topNews.title,
        recommendation: `${topNews.summary.split('.')[0]}. Recommendation for ${allClients.length} clients to review positions.`,
        impact: `${topNews.impact} Impact News`,
      });
    }

    // 2. Idle Cash (Task 1)
    const bigCash = investments.filter(inv => inv.category === 'CASH' && inv.total_value > 500000);
    bigCash.forEach(inv => {
      if (insights.length < 3) {
        insights.push({
          category: 'DEPLOY',
          title: 'Idle Cash Alert',
          recommendation: `Deploy ₹${(inv.total_value / 100000).toFixed(1)}L idle cash for ${inv.client.name} into suggested Midcap funds.`,
          impact: 'Cash Drag Reduction',
        });
      }
    });

    // 3. Health Score Risk (Task 1)
    const riskyClients = allClients.filter(c => (c.healthScores[0]?.score || 0) < 3.0);
    riskyClients.forEach(c => {
      if (insights.length < 3) {
        const score = c.healthScores[0]?.score || 0;
        insights.push({
          category: 'RISK',
          title: 'Critical Health Score',
          recommendation: `Portfolio health for ${c.name} dropped to ${score.toFixed(1)}. Immediate risk review required.`,
          impact: 'Capital Protection',
        });
      }
    });

    // 4. Fallback/Drift (Mocked target check)
    if (insights.length < 2) {
      insights.push({
        category: 'REBALANCE',
        title: 'Threshold Breach',
        recommendation: `Equity exposure for Amit Patel is 8.2% above target. Consider profit booking.`,
        impact: 'Risk Re-alignment',
      });
    }

    // --- Action Center Logic ---
    const actionCenter = {
      highDrift: [
        { clientName: 'Amit Patel', drift: '+8.2%', action: 'Rebalance' },
        { clientName: 'Sneha Reddy', drift: '-5.4%', action: 'Top-up Equity' },
      ],
      idleCash: bigCash.map(inv => ({ clientName: inv.client.name, amount: inv.total_value, action: 'Deploy' })),
      wtcAlerts: [
        { title: '80C Deadline', deadline: 'Mar 31', priority: 'High' },
        { title: 'Quarterly Advance Tax', deadline: 'Jun 15', priority: 'Med' },
      ]
    };

    // --- Market Pulse (Mocked for dashboard) ---
    const marketPulse = [
      { name: 'NIFTY 50', value: '22,453.80', change: '+124.20', pc: '+0.56%', trend: 'up' },
      { name: 'SENSEX', value: '73,876.15', change: '+456.10', pc: '+0.62%', trend: 'up' },
      { name: 'GOLD (24k)', value: '66,240', change: '-120.00', pc: '-0.18%', trend: 'down' },
    ];

    return {
      totalClients,
      totalAUM,
      avgHealthScore,
      marketAlerts,
      pendingTodos: todos,
      actionCenter,
      strategicInsights: insights.slice(0, 3), // Top 3 as requested
      marketPulse,
      recentNews: news.slice(0, 3),
    };
  }
}
