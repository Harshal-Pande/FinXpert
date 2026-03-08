import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Public() // This opens all routes in this controller to the public
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(
    @Body() dto: CreateClientDto,
    @CurrentUser('id') advisorId: string,
  ) {
    return this.clientsService.create({ ...dto, advisorId });
  }

  @Get()
  findAll(
    @Query() query: ListClientsQueryDto,
    @CurrentUser('id') advisorId?: string, // Marked as optional for public access
  ) {
    // We pass advisorId (which will be undefined if not logged in)
    return this.clientsService.findAll({ ...query, advisorId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, dto);
  }
}