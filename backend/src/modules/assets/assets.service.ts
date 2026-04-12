import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { InvestmentCategory, InvestmentType } from '@prisma/client';

function normalizeInvestmentType(value: 'Stock' | 'Crypto' | 'Debt' | 'Mutual Fund'): InvestmentType {
  return value === 'Mutual Fund' ? 'Mutual_Fund' : value;
}

function mapSimpleCategory(
  raw: string,
): { investment_type: InvestmentType; category: InvestmentCategory } {
  const c = raw.toLowerCase();
  if (c === 'equity') return { investment_type: 'Stock', category: 'STOCK' };
  if (c === 'debt') return { investment_type: 'Debt', category: 'MUTUAL_FUND' };
  if (c === 'cash') return { investment_type: 'Debt', category: 'CASH' };
  if (c === 'gold') return { investment_type: 'Mutual_Fund', category: 'GOLD' };
  return { investment_type: 'Stock', category: 'STOCK' };
}

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  private getPerformanceData(investment: {
    category: InvestmentCategory;
    quantity: number;
    avg_buy_price: number;
    current_price: number;
  }) {
    if (investment.category === 'CASH') {
      return {
        invested_amount: 0,
        current_value: 0,
        absolute_pnl: 0,
        pnl_percentage: 0,
      };
    }

    const invested_amount = investment.quantity * investment.avg_buy_price;
    const current_value = investment.quantity * investment.current_price;
    const absolute_pnl = current_value - invested_amount;
    const pnl_percentage =
      invested_amount > 0 ? (absolute_pnl / invested_amount) * 100 : 0;

    return {
      invested_amount,
      current_value,
      absolute_pnl,
      pnl_percentage,
    };
  }

  private async recalcClientAumAndSnapshot(clientId: string): Promise<number> {
    const agg = await this.prisma.investment.aggregate({
      where: { client_id: clientId },
      _sum: { total_value: true },
    });
    const total = agg._sum.total_value ?? 0;

    await this.prisma.$transaction([
      this.prisma.client.update({
        where: { id: clientId },
        data: { total_aum: total },
      }),
      this.prisma.portfolioSnapshot.create({
        data: {
          client_id: clientId,
          total_value: total,
        },
      }),
    ]);

    return total;
  }

  async create(clientId: string, dto: CreateAssetDto) {
    await this.prisma.client.findUniqueOrThrow({ where: { id: clientId } });

    const { investment_type, category } = mapSimpleCategory(dto.category);
    const value = dto.value;
    const boughtAt = dto.bought_at ? new Date(dto.bought_at) : new Date();

    const created = await this.prisma.investment.create({
      data: {
        client_id: clientId,
        investment_type,
        category,
        instrument_name: dto.instrument_name.trim(),
        quantity: 1,
        avg_buy_price: value,
        current_price: value,
        buy_rate: value,
        total_value: value,
        bought_at: boughtAt,
      },
    });

    await this.recalcClientAumAndSnapshot(clientId);

    return { ...created, performance: this.getPerformanceData(created) };
  }

  async findAll(clientId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { client_id: clientId },
    });
    return investments.map((investment) => ({
      ...investment,
      performance: this.getPerformanceData(investment),
    }));
  }

  async findOne(clientId: string, id: string) {
    const asset = await this.prisma.investment.findFirst({
      where: { id, client_id: clientId },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return { ...asset, performance: this.getPerformanceData(asset) };
  }

  async update(clientId: string, id: string, dto: UpdateAssetDto) {
    const existing = await this.findOne(clientId, id);
    const quantity = dto.quantity ?? existing.quantity;
    const buyRate = dto.buy_rate ?? existing.buy_rate;
    const avgBuyPrice = dto.avg_buy_price ?? existing.avg_buy_price;
    const currentPrice = dto.current_price ?? existing.current_price;
    const normalizedType = dto.investment_type
      ? normalizeInvestmentType(dto.investment_type)
      : existing.investment_type;

    const updated = await this.prisma.investment.update({
      where: { id },
      data: {
        investment_type: normalizedType,
        category: dto.category ?? existing.category,
        instrument_name: dto.instrument_name,
        quantity,
        avg_buy_price: avgBuyPrice,
        current_price: currentPrice,
        buy_rate: buyRate,
        total_value: quantity * currentPrice,
        bought_at: dto.bought_at ? new Date(dto.bought_at) : undefined,
      },
    });
    await this.recalcClientAumAndSnapshot(clientId);
    return { ...updated, performance: this.getPerformanceData(updated) };
  }

  async remove(clientId: string, id: string) {
    await this.findOne(clientId, id);
    const deleted = await this.prisma.investment.delete({ where: { id } });
    await this.recalcClientAumAndSnapshot(clientId);
    return deleted;
  }
}
