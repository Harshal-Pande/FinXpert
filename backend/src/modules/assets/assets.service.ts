import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
  const u = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if (u === 'STOCK' || raw.toLowerCase() === 'equity') return { investment_type: 'Stock', category: 'STOCK' };
  if (u === 'DEBT' || raw.toLowerCase() === 'cash') return { investment_type: 'Debt', category: 'DEBT' };
  if (u === 'CRYPTO') return { investment_type: 'Crypto', category: 'CRYPTO' };
  if (u === 'MUTUAL_FUND' || u === 'MUTUALFUND' || raw.toLowerCase() === 'gold')
    return { investment_type: 'Mutual_Fund', category: 'MUTUAL_FUND' };
  return { investment_type: 'Stock', category: 'STOCK' };
}

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiInsight: AiInsightService,
  ) {}

  private getPerformanceData(investment: {
    category: InvestmentCategory;
    quantity: number;
    buyPrice: number;
    totalCost: number;
    cmp: number;
  }) {
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
    const resolved = await this.aiInsight.resolveInstrumentCurrentPriceInr(
      dto.instrument_name.trim(),
      category,
    );
    if (resolved != null && resolved > 0) {
      cmp = resolved;
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

  /**
   * AI-validated edit: FinXpert Portfolio Synchronizer resolves officialName + CMP (INR);
   * falls back to buy price as CMP when Gemini fails.
   */
  async updateInvestment(clientId: string, id: string, dto: UpdateAssetDto) {
    const existing = await this.prisma.investment.findFirst({
      where: { id, client_id: clientId },
    });
    if (!existing) throw new NotFoundException('Asset not found');

    const instrument_name = dto.instrument_name?.trim() ?? existing.instrument_name;
    if (!instrument_name) {
      throw new BadRequestException('instrument_name is required');
    }

    const categoryKey = (dto.category ?? existing.category) as string;
    const quantity = dto.quantity ?? existing.quantity;
    const buyPrice =
      dto.buyPrice ?? dto.buy_rate ?? existing.buyPrice ?? existing.buy_rate;

    if (!(quantity > 0) || !(buyPrice > 0)) {
      throw new BadRequestException('quantity and buyPrice must be positive numbers');
    }

    const { investment_type, category } = mapSimpleCategory(categoryKey);
    const totalCost = quantity * buyPrice;

    let officialName = instrument_name;
    let cmp = buyPrice;

    const sync = await this.aiInsight.verifyPortfolioInstrumentCmp(instrument_name, category);
    if (sync) {
      if (sync.officialName?.trim()) {
        officialName = sync.officialName.trim();
      }
      if (Number.isFinite(sync.cmp) && sync.cmp > 0) {
        cmp = sync.cmp;
      }
    }

    await this.prisma.investment.update({
      where: { id },
      data: {
        investment_type,
        category,
        instrument_name: officialName,
        quantity,
        buyPrice,
        buy_rate: buyPrice,
        totalCost,
        cmp,
        total_value: quantity * cmp,
        bought_at: dto.bought_at ? new Date(dto.bought_at) : undefined,
      },
    });

    await this.recalcClientAum(clientId);
    return this.findOne(clientId, id);
  }

  async remove(clientId: string, id: string) {
    await this.findOne(clientId, id);
    const deleted = await this.prisma.investment.delete({ where: { id } });
    await this.recalcClientAum(clientId);
    return deleted;
  }
}
