import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    advisorId?: string;
    search?: string;
    riskProfile?: string;
    page?: number;
    limit?: number;
  }) {
    const { advisorId, search, riskProfile, page = 1, limit = 100 } = params;

    const where: Record<string, unknown> = {};

    // Filter by advisor
    if (advisorId && advisorId !== 'undefined' && advisorId !== 'null') {
      where.advisor_id = advisorId;
    }

    // Search by name (case-insensitive)
    if (search && search.trim()) {
      where.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    // Filter by risk profile
    if (riskProfile) {
      where.risk_profile = riskProfile;
    }

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: { portfolio: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        portfolio: {
          include: { assets: true },
        },
        healthScores: {
          orderBy: { calculated_at: 'desc' },
          take: 1,
        },
        portfolioTarget: true,
      },
    });

    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);
    return client;
  }

  async create(data: { advisorId: string; [key: string]: unknown }) {
    const { advisorId, ...rest } = data;
    return this.prisma.client.create({
      data: {
        ...rest,
        advisor_id: advisorId,
      } as any,
    });
  }

  async update(id: string, data: UpdateClientDto) {
    return this.prisma.client.update({
      where: { id },
      data,
    });
  }
}