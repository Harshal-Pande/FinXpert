import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { InvestmentCategory, InvestmentType } from '@prisma/client';
import { AiInsightService } from '../../services/ai-insight.service';

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
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly aiInsight?: AiInsightService,
  ) {}

  private getPerformanceData(investment: {
    category: InvestmentCategory;
    quantity: number;
    buyPrice: number;
    totalCost: number;
    cmp: number;
  }) {
    if (investment.category === 'CASH') {
      return {
        invested_amount: 0,
        current_value: 0,
        absolute_pnl: 0,
        pnl_percentage: 0,
      };
    }

    const invested_amount =
      investment.totalCost > 0 ? investment.totalCost : investment.quantity * investment.buyPrice;
    const current_value = investment.quantity * investment.cmp;
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

  private async recalcClientAum(clientId: string): Promise<number> {
    const agg = await this.prisma.investment.aggregate({
      where: { client_id: clientId },
      _sum: { total_value: true },
    });
    const total = agg._sum.total_value ?? 0;

    await this.prisma.client.update({
      where: { id: clientId },
      data: { total_aum: total },
    });

    return total;
  }

  async create(clientId: string, dto: CreateAssetDto) {
    await this.prisma.client.findUniqueOrThrow({ where: { id: clientId } });

    let unitPrice: number;
    let qty: number;
    if (dto.value != null && dto.value > 0) {
      unitPrice = dto.value;
      qty = 1;
    } else if (dto.price != null && dto.quantity != null) {
      unitPrice = dto.price;
      qty = dto.quantity;
    } else {
      throw new BadRequestException('Provide price and quantity, or legacy value.');
    }

    const totalCost = unitPrice * qty;
    const { investment_type, category } = mapSimpleCategory(dto.category);
    const boughtAt = dto.bought_at ? new Date(dto.bought_at) : new Date();

    let cmp = unitPrice;
    if (category !== 'CASH' && this.aiInsight) {
      const resolved = await this.aiInsight.resolveInstrumentCurrentPriceInr(dto.instrument_name.trim());
      if (resolved != null && resolved > 0) {
        cmp = resolved;
      }
    }

    const total_value = qty * cmp;

    const created = await this.prisma.investment.create({
      data: {
        client_id: clientId,
        investment_type,
        category,
        instrument_name: dto.instrument_name.trim(),
        quantity: qty,
        buyPrice: unitPrice,
        totalCost,
        cmp,
        buy_rate: unitPrice,
        total_value,
        bought_at: boughtAt,
      },
    });

    await this.recalcClientAum(clientId);

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
    const buyPrice = dto.buyPrice ?? existing.buyPrice;
    const cmp = dto.cmp ?? existing.cmp;
    const totalCost =
      dto.totalCost ??
      (quantity > 0 && buyPrice > 0 ? quantity * buyPrice : existing.totalCost);
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
        buyPrice,
        cmp,
        buy_rate: buyRate,
        totalCost,
        total_value: quantity * cmp,
        bought_at: dto.bought_at ? new Date(dto.bought_at) : undefined,
      },
    });
    await this.recalcClientAum(clientId);
    return { ...updated, performance: this.getPerformanceData(updated) };
  }

  async remove(clientId: string, id: string) {
    await this.findOne(clientId, id);
    const deleted = await this.prisma.investment.delete({ where: { id } });
    await this.recalcClientAum(clientId);
    return deleted;
  }
}
