import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface MutualFundNav {
  date: string;
  nav: string;
}

interface MutualFundData {
  meta: {
    fund_house: string;
    scheme_type: string;
    scheme_category: string;
    scheme_code: number;
    scheme_name: string;
  };
  data: MutualFundNav[];
}

/**
 * Service to fetch mutual fund NAV data from MFAPI (https://api.mfapi.in).
 * Free, no API key required.
 */
@Injectable()
export class MfapiService {
  private readonly logger = new Logger(MfapiService.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      this.config.get<string>('externalApis.mfapiBaseUrl') ??
      'https://api.mfapi.in';
  }

  /**
   * Fetch NAV data for a mutual fund scheme.
   * @param schemeCode - AMFI scheme code (e.g., 119551 for HDFC Index Fund)
   */
  async fetchNav(schemeCode: number): Promise<MutualFundData | null> {
    try {
      const res = await fetch(`${this.baseUrl}/mf/${schemeCode}`);
      if (!res.ok) {
        this.logger.warn(`MFAPI returned ${res.status} for scheme ${schemeCode}`);
        return null;
      }
      return (await res.json()) as MutualFundData;
    } catch (error) {
      this.logger.error(`MFAPI fetch failed for scheme ${schemeCode}:`, error);
      return null;
    }
  }

  /**
   * Search mutual fund schemes by name.
   */
  async searchSchemes(query: string): Promise<{ schemeCode: number; schemeName: string }[]> {
    try {
      const res = await fetch(`${this.baseUrl}/mf/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      return (await res.json()) as { schemeCode: number; schemeName: string }[];
    } catch (error) {
      this.logger.error(`MFAPI search failed:`, error);
      return [];
    }
  }
}
