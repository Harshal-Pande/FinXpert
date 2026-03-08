import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { advisorId?: string; search?: string; page?: number; limit?: number }) {
    const { advisorId, search, page = 1, limit = 100 } = params;
    
    console.log('--- Client Fetch Debug ---');
    console.log('Params Received:', { advisorId, search });
  
    const where: any = {};
    
    // Force ignore advisorId if it's "undefined" (string) or null
    if (advisorId && advisorId !== 'undefined' && advisorId !== 'null') {
      where.advisor_id = advisorId;
    }
  
    try {
      const [items, total] = await Promise.all([
        this.prisma.client.findMany({
          where,
          include: { portfolio: true },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.client.count({ where }),
      ]);
  
      console.log(`DB Found ${items.length} clients out of ${total} total.`);
      return { items, total, page, limit };
    } catch (error) {
      console.error('Database Fetch Error:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        portfolio: {
          include: { assets: true }
        },
        healthScores: {
          orderBy: { calculated_at: 'desc' },
          take: 1
        }
      }
    });

    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);
    return client;
  }

  async create(data: any) {
    const { advisorId, ...rest } = data;
    return this.prisma.client.create({
      data: {
        ...rest,
        advisor_id: advisorId,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.client.update({
      where: { id },
      data,
    });
  }
}