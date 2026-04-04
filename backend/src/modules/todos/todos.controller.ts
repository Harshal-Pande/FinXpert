import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TodosService } from './todos.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Public()
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  findAll(@CurrentUser('id') advisorId?: string) {
    return this.todosService.findAll(advisorId);
  }

  @Post()
  create(
    @Body() dto: CreateTodoDto,
    @CurrentUser('id') advisorId: string,
  ) {
    // Fallback advisorId for public access
    const id = advisorId && advisorId !== 'undefined' ? advisorId : 'system';
    return this.todosService.create(dto, id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTodoDto,
  ) {
    return this.todosService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.todosService.remove(id);
  }
}
