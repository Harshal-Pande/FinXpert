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
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('clients/:clientId/investments')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  create(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetsService.create(clientId, dto);
  }

  @Get()
  findAll(@Param('clientId', ParseUUIDPipe) clientId: string) {
    return this.assetsService.findAll(clientId);
  }

  @Get(':id')
  findOne(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.findOne(clientId, id);
  }

  @Put(':id')
  updateInvestment(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.updateInvestment(clientId, id, dto);
  }

  @Delete(':id')
  remove(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.remove(clientId, id);
  }
}
