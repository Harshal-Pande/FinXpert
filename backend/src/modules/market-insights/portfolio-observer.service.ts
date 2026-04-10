import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

type PrismaMiddlewareParams = {
  model?: string;
  action: string;
  args?: any;
};
type PrismaMiddlewareNext = (params: PrismaMiddlewareParams) => Promise<any>;
type PrismaMiddleware = (
  params: PrismaMiddlewareParams,
  next: PrismaMiddlewareNext,
) => Promise<any>;

@Injectable()
export class PortfolioObserverService implements OnModuleInit {
  private readonly logger = new Logger(PortfolioObserverService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Prisma Driver Adapters may not expose `$use` on the generated TS type,
    // but the runtime client still supports middleware registration.
    (this.prisma as unknown as { $use: (middleware: PrismaMiddleware) => void }).$use(
      async (params: PrismaMiddlewareParams, next: PrismaMiddlewareNext) => {
      const result = await next(params);

      try {
        if (params.model === 'Client' && params.action === 'update') {
          const clientId = this.extractClientId(params.args?.where, result);
          if (clientId) {
            await this.evaluateClientTriggers(clientId);
          }
        }

        if (params.model === 'HealthScore' && params.action === 'create') {
          const clientId = this.extractClientId(params.args?.data, result);
          if (clientId) {
            await this.evaluateClientTriggers(clientId);
          }
        }
      } catch (err) {
        this.logger.error('PortfolioObserver trigger failed', err as Error);
      }

      return result;
      },
    );
  }

  private extractClientId(source: unknown, fallback: unknown): string | null {
    const s = source as Record<string, unknown> | undefined;
    const f = fallback as Record<string, unknown> | undefined;
    const id = (s?.id as string) ?? (s?.client_id as string) ?? (f?.id as string) ?? (f?.client_id as string);
    return typeof id === 'string' ? id : null;
  }

  private async evaluateClientTriggers(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    });

    if (!client) return;

    const [cashAggregate, latestHealthScore] = await Promise.all([
      this.prisma.investment.aggregate({
        where: { client_id: clientId, category: 'CASH' },
        _sum: { total_value: true },
      }),
      this.prisma.healthScore.findFirst({
        where: { client_id: clientId },
        orderBy: { calculated_at: 'desc' },
        select: { score: true },
      }),
    ]);

    const totalCash = cashAggregate._sum.total_value ?? 0;
    const latestScore = latestHealthScore?.score ?? null;

    if (totalCash > 500_000) {
      await this.createInsightIfNotDuplicate({
        clientId: client.id,
        clientName: client.name,
        eventType: 'IDLE_CASH',
        title: 'Idle Cash Alert',
        severity: 'medium',
        summary: `Idle cash for ${client.name} is ₹${Math.round(totalCash).toLocaleString('en-IN')}. Consider deployment.`,
      });
    }

    if (latestScore !== null && latestScore < 3.0) {
      await this.createInsightIfNotDuplicate({
        clientId: client.id,
        clientName: client.name,
        eventType: 'HIGH_RISK',
        title: 'High Risk Alert',
        severity: 'high',
        summary: `Latest health score for ${client.name} is ${latestScore.toFixed(1)}. Immediate review recommended.`,
      });
    }
  }

  private async createInsightIfNotDuplicate(input: {
    clientId: string;
    clientName: string;
    eventType: 'IDLE_CASH' | 'HIGH_RISK';
    title: string;
    severity: 'medium' | 'high';
    summary: string;
  }) {
    const existing = await this.prisma.marketInsight.findFirst({
      where: {
        event_type: input.eventType,
        affected_clients: { has: input.clientId },
      },
      orderBy: { created_at: 'desc' },
      select: { id: true, created_at: true },
    });

    // Cooldown window to prevent dashboard spam for repeated updates.
    if (existing) {
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      if (Date.now() - existing.created_at.getTime() < twelveHoursMs) {
        return;
      }
    }

    await this.prisma.marketInsight.create({
      data: {
        title: input.title,
        event_type: input.eventType,
        severity: input.severity,
        ai_summary: input.summary,
        affected_clients: [input.clientId],
      },
    });

    // Optional real-time signal requested.
    console.log(`🚀 Trigger Fired: New Insight generated for ${input.clientName}`);
  }
}

