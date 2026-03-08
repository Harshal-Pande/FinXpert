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

@Controller('portfolio/:portfolioId/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  create(
    @Param('portfolioId', ParseUUIDPipe) portfolioId: string,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetsService.create(portfolioId, dto);
  }

  @Get()
  findAll(@Param('portfolioId', ParseUUIDPipe) portfolioId: string) {
    return this.assetsService.findAll(portfolioId);
  }

  @Get(':id')
  findOne(
    @Param('portfolioId', ParseUUIDPipe) portfolioId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.findOne(portfolioId, id);
  }

  @Put(':id')
  update(
    @Param('portfolioId', ParseUUIDPipe) portfolioId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(portfolioId, id, dto);
  }

  @Delete(':id')
  remove(
    @Param('portfolioId', ParseUUIDPipe) portfolioId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.remove(portfolioId, id);
  }
}
