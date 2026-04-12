import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  armGeminiQuotaCooldown,
  isGeminiQuotaCooldownActive,
  isLikelyGeminiQuotaError,
  logGeminiQuotaThrottled,
} from './gemini-quota.util';

export interface MarketInsightAiResponse {
  title: string;
  summary: string;
  severity: string;
  eventType: string;
  advice: string;
}

export interface LiveMarketRate {
  symbol: string;
  name: string;
  price: string;
  change: string;
  pc: string;
  trend: 'up' | 'down' | 'flat';
  lastUpdated: string;
}

@Injectable()
export class AiInsightService {
  private readonly logger = new Logger(AiInsightService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ai.geminiApiKey');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateMarketInsight(
    news: string,
    data?: Record<string, unknown>,
  ): Promise<MarketInsightAiResponse> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    if (isGeminiQuotaCooldownActive()) {
      throw new Error('Gemini is temporarily unavailable (API quota cooldown).');
    }

    const context = data ? `Additional context: ${JSON.stringify(data)}` : '';
    const prompt = `You are a financial analyst. Analyze this news and return a JSON object ONLY. 
    Use keys: "title", "summary", "severity", "eventType", "advice".
    
    News: ${news}
    ${context}`;

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-pro',
    ];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No valid JSON found in AI response');
        return JSON.parse(jsonMatch[0]) as MarketInsightAiResponse;
      } catch (err) {
        lastError = err;
        if (isLikelyGeminiQuotaError(err)) {
          armGeminiQuotaCooldown();
          logGeminiQuotaThrottled(this.logger, 'Market insight');
          break;
        }
        this.logger.warn(`Model ${modelName} failed or not found, trying next...`);
      }
    }

    this.logger.error('All models failed for news insight');
    throw lastError;
  }

  /**
   * Fetches real-time market rates using Gemini's Google Search grounding.
   */
  async getLiveMarketRates(): Promise<LiveMarketRate[]> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    if (isGeminiQuotaCooldownActive()) {
      return [];
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const prompt = `Find the latest real-time rates for the following financial indicators in India as of today, ${dateStr}:
    1. BSE SENSEX
    2. NIFTY 50
    3. GOLD (24k per 10 grams in INR)
    4. Bitcoin (BTC/INR)
    5. A major Indian Mutual Fund (e.g., SBI Bluechip Fund NAV)

    Return the results as a JSON array of objects with keys: 
    "symbol", "name", "price", "change", "pc", "trend" (up/down/flat), "lastUpdated".
    Ensure the "price" is a string formatted with currency if applicable. 
    "pc" should be the percentage change string.
    ONLY return the JSON array.`;

    const modelsToTry = [
      { name: 'gemini-3.1-pro-preview', useTools: true },
      { name: 'gemini-2.5-flash', useTools: true },
      { name: 'gemini-2.0-flash', useTools: true },
      { name: 'gemini-1.5-flash', useTools: true },
      { name: 'gemini-1.5-flash', useTools: false },
    ];

    let stoppedForQuota = false;
    for (const entry of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: entry.name,
          tools: entry.useTools ? ([{ googleSearch: {} } as any]) : undefined,
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) continue;

        return JSON.parse(jsonMatch[0]) as LiveMarketRate[];
      } catch (err) {
        if (isLikelyGeminiQuotaError(err)) {
          armGeminiQuotaCooldown();
          logGeminiQuotaThrottled(this.logger, 'Live market rates (Gemini)');
          stoppedForQuota = true;
          break;
        }
        this.logger.debug(`Grounding check with ${entry.name} (tools:${entry.useTools}) failed`);
      }
    }

    if (!stoppedForQuota) {
      this.logger.debug('Live market rates: no Gemini JSON; using Yahoo-based indices.');
    }
    return [];
  }

  /**
   * Fuzzy-match an instrument name and return an approximate current price per unit in INR (CMP).
   */
  async resolveInstrumentCurrentPriceInr(
    instrumentName: string,
    investmentCategory?: string,
  ): Promise<number | null> {
    if (!this.genAI) {
      return null;
    }
    if (isGeminiQuotaCooldownActive()) {
      return null;
    }

    const cat =
      investmentCategory && investmentCategory.trim().length > 0
        ? investmentCategory.trim().toUpperCase()
        : 'UNKNOWN';
    const categoryHint =
      cat === 'STOCK'
        ? 'Treat as an Indian listed equity (NSE/BSE), ETF, or stock-like instrument.'
        : cat === 'DEBT'
          ? 'Treat as Indian fixed income: bonds, gilts, FD-like listed debt, or liquid/debt funds — price per unit or clean price as applicable.'
        : cat === 'CRYPTO'
          ? 'Treat as a major cryptocurrency quoted in INR (e.g. BTC/INR on Indian or global spot).'
          : cat === 'MUTUAL_FUND'
            ? 'Treat as an Indian mutual fund scheme — use latest NAV per unit in INR.'
            : 'Infer asset class from the name.';

    const prompt = `The advisor typed this Indian portfolio holding name (may have typos or abbreviations): "${instrumentName}".

InvestmentCategory from our system (authoritative context for asset class): "${cat}".
${categoryHint}

Identify the most likely real instrument consistent with that category.
Respond with JSON ONLY, no markdown: {"matchedName":"string","currentPriceINR":number}
where currentPriceINR is the best approximate current market price for ONE unit (one share, one NAV unit, one coin, or one bond unit as applicable) in INR, using 2 decimals when needed. If ambiguous, pick the most liquid match.`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];

    for (const modelName of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;
        const parsed = JSON.parse(jsonMatch[0]) as { currentPriceINR?: number };
        const n = Number(parsed.currentPriceINR);
        if (Number.isFinite(n) && n > 0) {
          return n;
        }
      } catch (err) {
        if (isLikelyGeminiQuotaError(err)) {
          armGeminiQuotaCooldown();
          logGeminiQuotaThrottled(this.logger, 'Instrument CMP (Gemini)');
          break;
        }
        this.logger.debug(`resolveInstrumentCurrentPriceInr: ${modelName} failed`);
      }
    }
    return null;
  }
}