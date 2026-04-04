import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(advisorId?: string) {
    const where: Record<string, unknown> = {};
    if (advisorId && advisorId !== 'undefined') {
      where.advisor_id = advisorId;
    }

    return this.prisma.todoItem.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ status: 'asc' }, { due_date: 'asc' }, { created_at: 'desc' }],
    });
  }

  async create(dto: CreateTodoDto, advisorId: string) {
    return this.prisma.todoItem.create({
      data: {
        title: dto.title,
        description: dto.description,
        client_id: dto.client_id,
        due_date: dto.due_date ? new Date(dto.due_date) : null,
        advisor_id: advisorId,
      },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateTodoDto) {
    const existing = await this.prisma.todoItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Todo with ID ${id} not found`);

    return this.prisma.todoItem.update({
      where: { id },
      data: {
        ...dto,
        due_date: dto.due_date ? new Date(dto.due_date) : undefined,
      },
      include: { client: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.todoItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Todo with ID ${id} not found`);

    return this.prisma.todoItem.delete({ where: { id } });
  }
}
