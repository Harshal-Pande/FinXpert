import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class KeepAliveService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/10 * * * *')
  async sendHeartbeat() {
    await this.prisma.client.count();
    console.log(`💓 Database Heartbeat sent at ${new Date().toISOString()}`);
  }
}

