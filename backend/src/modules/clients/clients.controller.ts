import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
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
    @CurrentUser('id') advisorId: string,
  ) {
    return this.clientsService.findAll({ ...query, advisorId });
  }

  @Get('aum-history')
  getAumHistory(@CurrentUser('id') advisorId: string) {
    return this.clientsService.getAdvisorAumHistory(advisorId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') advisorId: string,
  ) {
    return this.clientsService.findOne(id, advisorId);
  }

  @Get(':id/history')
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') advisorId: string,
  ) {
    return this.clientsService.getPortfolioHistory(id, advisorId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser('id') advisorId: string,
  ) {
    return this.clientsService.update(id, advisorId, dto);
  }
}