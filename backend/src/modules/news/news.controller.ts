import { Controller, Get, Query } from '@nestjs/common';
import { NewsService, type NewsScope } from './news.service';
import { Public } from '../../common/decorators/public.decorator';

const SCOPES = new Set<NewsScope>(['All', 'Global', 'Domestic', 'Sector-wise']);

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Public()
  @Get('market')
  getMarket(@Query('limit') limit?: string, @Query('scope') scopeRaw?: string) {
    const n = limit != null && limit !== '' ? parseInt(limit, 10) : 10;
    const capped = Math.min(30, Math.max(1, Number.isFinite(n) ? n : 10));
    const scope: NewsScope =
      scopeRaw && SCOPES.has(scopeRaw as NewsScope) ? (scopeRaw as NewsScope) : 'All';
    return this.newsService.getMarketNews(capped, scope);
  }
}
