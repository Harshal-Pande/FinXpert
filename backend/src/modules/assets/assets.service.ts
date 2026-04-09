import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { InvestmentType } from '@prisma/client';

function normalizeInvestmentType(value: 'Stock' | 'Crypto' | 'Debt' | 'Mutual Fund'): InvestmentType {
  return value === 'Mutual Fund' ? 'Mutual_Fund' : value;
}

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clientId: string, dto: CreateAssetDto) {
    const totalValue = dto.quantity * dto.buy_rate;
    return this.prisma.investment.create({
      data: {
        client_id: clientId,
        investment_type: normalizeInvestmentType(dto.investment_type),
        instrument_name: dto.instrument_name,
        quantity: dto.quantity,
        buy_rate: dto.buy_rate,
        total_value: totalValue,
        bought_at: new Date(dto.bought_at),
      },
    });
  }

  async findAll(clientId: string) {
    return this.prisma.investment.findMany({
      where: { client_id: clientId },
    });
  }

  async findOne(clientId: string, id: string) {
    const asset = await this.prisma.investment.findFirst({
      where: { id, client_id: clientId },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async update(clientId: string, id: string, dto: UpdateAssetDto) {
    const existing = await this.findOne(clientId, id);
    const quantity = dto.quantity ?? existing.quantity;
    const buyRate = dto.buy_rate ?? existing.buy_rate;

    return this.prisma.investment.update({
      where: { id },
      data: {
        investment_type: dto.investment_type
          ? normalizeInvestmentType(dto.investment_type)
          : undefined,
        instrument_name: dto.instrument_name,
        quantity,
        buy_rate: buyRate,
        total_value: quantity * buyRate,
        bought_at: dto.bought_at ? new Date(dto.bought_at) : undefined,
      },
    });
  }

  async remove(clientId: string, id: string) {
    await this.findOne(clientId, id);
    return this.prisma.investment.delete({ where: { id } });
  }
}
