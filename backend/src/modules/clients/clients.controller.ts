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
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create({ ...dto });
  }

  @Get()
  findAll(@Query() query: ListClientsQueryDto) {
    return this.clientsService.findAll({ ...query });
  }

  @Get('aum-history')
  getAumHistory() {
    return this.clientsService.getAdvisorAumHistory();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.findOne(id);
  }

  @Get(':id/history')
  getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.clientsService.getPortfolioHistory(id);
  }

  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }
}
