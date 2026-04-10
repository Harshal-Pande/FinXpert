import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface ComplianceItem {
  id: string;
  name: string;
  dueDate: string;
  status: 'pending' | 'urgent';
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upcoming obligations from DB, nearest due date first.
   * Optional advisorId scopes to one advisor; otherwise all obligations (demo / internal tools).
   * If the table is missing (migration not applied), returns [] so the rest of the API still works.
   */
  async getUpcoming(advisorId?: string): Promise<ComplianceItem[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    try {
      const rows = await this.prisma.complianceObligation.findMany({
        where: {
          due_date: { gte: start },
          ...(advisorId && advisorId !== 'undefined' ? { advisor_id: advisorId } : {}),
        },
        orderBy: { due_date: 'asc' },
      });

      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        dueDate: r.due_date.toISOString(),
        status: r.status === 'urgent' ? 'urgent' : 'pending',
      }));
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2021') {
        this.logger.warn(
          'ComplianceObligation table missing. Run: cd backend && npx prisma db push   OR   npx prisma migrate reset',
        );
        return [];
      }
      throw e;
    }
  }
}
