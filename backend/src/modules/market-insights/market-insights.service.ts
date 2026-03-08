import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiInsightService } from '../../services/ai-insight.service';

const MOCK_NEWS = 'Bitcoin drops 10% amid regulatory concerns.';

@Injectable()
export class MarketInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiInsightService: AiInsightService,
  ) {}

  async findAll(limit = 20) {
    return this.prisma.marketInsight.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Triggers AI analysis of market news, maps affected clients (crypto > 100k),
   * and persists the insight to the database.
   */
  async triggerAnalysis() {
    // 1. Fetch AI response for mock news
    const aiResponse = await this.aiInsightService.generateMarketInsight(
      MOCK_NEWS,
    );

    // 2. Find clients who have crypto assets with value > 100,000
    const cryptoAssetsOver100k = await this.prisma.asset.findMany({
      where: {
        asset_type: 'crypto',
        value: { gt: 100_000 },
      },
      include: {
        portfolio: {
          include: {
            client: true,
          },
        },
      },
    });

    const affectedClientNames = [
      ...new Set(
        cryptoAssetsOver100k.map((a) => a.portfolio.client.name),
      ),
    ];

    // 3. Save to MarketInsight with affected client names
    const insight = await this.prisma.marketInsight.create({
      data: {
        title: aiResponse.title,
        event_type: aiResponse.eventType,
        severity: aiResponse.severity,
        ai_summary: [aiResponse.summary, aiResponse.advice]
          .filter(Boolean)
          .join(' Advice: '),
        affected_clients: affectedClientNames,
      },
    });

    return insight;
  }
}
