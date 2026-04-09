import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { InvestmentCategory, InvestmentType } from '@prisma/client';

function normalizeInvestmentType(value: 'Stock' | 'Crypto' | 'Debt' | 'Mutual Fund'): InvestmentType {
  return value === 'Mutual Fund' ? 'Mutual_Fund' : value;
}

function defaultCategoryFromType(type: InvestmentType): InvestmentCategory {
  if (type === 'Stock') return 'STOCK';
  if (type === 'Crypto') return 'CRYPTO';
  if (type === 'Mutual_Fund') return 'MUTUAL_FUND';
  return 'CASH';
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

  async create(clientId: string, dto: CreateAssetDto) {
    const normalizedType = normalizeInvestmentType(dto.investment_type);
    const avgBuyPrice = dto.avg_buy_price ?? dto.buy_rate;
    const currentPrice = dto.current_price ?? avgBuyPrice;
    const totalValue = dto.quantity * currentPrice;

    const created = await this.prisma.investment.create({
      data: {
        client_id: clientId,
        investment_type: normalizedType,
        category: dto.category ?? defaultCategoryFromType(normalizedType),
        instrument_name: dto.instrument_name,
        quantity: dto.quantity,
        avg_buy_price: avgBuyPrice,
        current_price: currentPrice,
        buy_rate: dto.buy_rate,
        total_value: totalValue,
        bought_at: new Date(dto.bought_at),
      },
    });
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
    return { ...updated, performance: this.getPerformanceData(updated) };
  }

  async remove(clientId: string, id: string) {
    await this.findOne(clientId, id);
    return this.prisma.investment.delete({ where: { id } });
  }
}
