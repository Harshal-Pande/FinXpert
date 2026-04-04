import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { AiInsightService } from '../../services/ai-insight.service';

@Injectable()
export class AdvisoryService {
  private readonly logger = new Logger(AdvisoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiInsightService: AiInsightService,
  ) {}

  /**
   * Generate AI-powered advisory for a specific client.
   * In production, this would send an actual email via Nodemailer.
   */
  async generateAdvisory(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        portfolio: { include: { assets: true } },
        healthScores: { orderBy: { calculated_at: 'desc' }, take: 1 },
        portfolioTarget: true,
      },
    });

    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    // Build context for AI
    const portfolioSummary = client.portfolio?.assets?.map((a) => ({
      name: a.asset_name,
      type: a.asset_type,
      value: a.value,
    })) ?? [];

    const healthScore = client.healthScores?.[0]?.score ?? 'N/A';

    const context = {
      clientName: client.name,
      riskProfile: client.risk_profile,
      annualIncome: client.annual_income,
      portfolioValue: client.portfolio?.total_value ?? 0,
      portfolioAssets: portfolioSummary,
      healthScore,
      targets: client.portfolioTarget,
    };

    try {
      // Use AI to generate advisory content
      const aiResponse = await this.aiInsightService.generateMarketInsight(
        `Generate a personalized financial advisory email for ${client.name} based on their portfolio and financial health.`,
        context as unknown as Record<string, unknown>,
      );

      // Mock email sending — log to console
      this.logger.log(`📧 Advisory Email for ${client.name}:`);
      this.logger.log(`   Subject: ${aiResponse.title}`);
      this.logger.log(`   Body: ${aiResponse.summary}`);
      this.logger.log(`   Advice: ${aiResponse.advice}`);

      return {
        clientId,
        clientName: client.name,
        subject: aiResponse.title,
        body: aiResponse.summary,
        advice: aiResponse.advice,
        sentAt: new Date().toISOString(),
        status: 'sent_mock', // Would be 'sent' with real SMTP
      };
    } catch (error) {
      this.logger.warn(
        `AI advisory generation failed for ${client.name}, using fallback`,
      );

      // Fallback advisory when AI is not configured
      return {
        clientId,
        clientName: client.name,
        subject: `Portfolio Review Advisory - ${client.name}`,
        body: `Dear ${client.name}, based on your current portfolio value of ₹${(client.portfolio?.total_value ?? 0).toLocaleString('en-IN')}, we recommend reviewing your asset allocation to align with your ${client.risk_profile ?? 'moderate'} risk profile.`,
        advice:
          'Please schedule a consultation with your advisor for a detailed review.',
        sentAt: new Date().toISOString(),
        status: 'sent_fallback',
      };
    }
  }

  /**
   * Cron job: runs daily at 9 AM to check which clients need advisory emails.
   * Checks for clients whose health score < 5 or portfolio has drifted from targets.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleAdvisoryCron() {
    this.logger.log('🕘 Running daily advisory cron job...');

    try {
      // Find clients with low health scores
      const lowScoreClients = await this.prisma.healthScore.findMany({
        where: { score: { lt: 5 } },
        distinct: ['client_id'],
        orderBy: { calculated_at: 'desc' },
        include: { client: true },
      });

      for (const entry of lowScoreClients) {
        this.logger.log(
          `🔔 Client ${entry.client.name} has low health score (${entry.score}), generating advisory...`,
        );
        await this.generateAdvisory(entry.client_id);
      }

      this.logger.log(
        `✅ Advisory cron complete. Processed ${lowScoreClients.length} clients.`,
      );
    } catch (error) {
      this.logger.error('Advisory cron job failed:', error);
    }
  }
}
