import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 1. Setup the connection pool using your .env variable
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL 
    });
    
    // 2. Create the Prisma 7 Adapter
    const adapter = new PrismaPg(pool);
    
    // 3. Pass the adapter to the parent PrismaClient
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}