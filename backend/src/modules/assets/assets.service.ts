import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(portfolioId: string, dto: CreateAssetDto) {
    return this.prisma.asset.create({
      data: { portfolio_id: portfolioId, ...dto },
    });
  }

  async findAll(portfolioId: string) {
    return this.prisma.asset.findMany({
      where: { portfolio_id: portfolioId },
    });
  }

  async findOne(portfolioId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, portfolio_id: portfolioId },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async update(portfolioId: string, id: string, dto: UpdateAssetDto) {
    await this.findOne(portfolioId, id);
    return this.prisma.asset.update({
      where: { id },
      data: dto,
    });
  }

  async remove(portfolioId: string, id: string) {
    await this.findOne(portfolioId, id);
    return this.prisma.asset.delete({ where: { id } });
  }
}
