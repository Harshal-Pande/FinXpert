import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async getByClient(clientId: string) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { client_id: clientId },
      include: { assets: true },
    });
    if (!portfolio) throw new NotFoundException('Portfolio not found');
    return portfolio;
  }
}
