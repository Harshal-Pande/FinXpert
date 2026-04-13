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

export interface PortfolioSynchronizerResult {
  officialName: string;
  cmp: number;
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

  /**
   * FinXpert Portfolio Synchronizer — verify display name and fetch CMP (INR per unit).
   * Returns null if Gemini is unavailable or parsing fails (caller should fall back to buy price).
   */
  async verifyPortfolioInstrumentCmp(
    instrumentName: string,
    investmentCategory: string,
  ): Promise<PortfolioSynchronizerResult | null> {
    if (!this.genAI) {
      return null;
    }
    if (isGeminiQuotaCooldownActive()) {
      return null;
    }

    const name = instrumentName?.trim() ?? '';
    const cat = (investmentCategory ?? '').trim().toUpperCase() || 'STOCK';
    if (!name) return null;

    const prompt = `You are the FinXpert Portfolio Synchronizer.

Verify the instrument name "${name.replace(/"/g, '\\"')}" and fetch the Current Market Price (CMP) for category "${cat}" in INR (price per single unit: one equity share, one mutual fund NAV unit, one crypto coin, or one debt unit as applicable for Indian markets where relevant).

Respond with JSON ONLY, no markdown code fences, exactly this shape:
{"officialName":"string","cmp":number}

Rules:
- officialName: canonical, human-readable instrument name (fix typos if obvious).
- cmp: positive number, INR per unit, use 2–4 decimal places if needed for NAV/crypto.
- Category is one of: STOCK, DEBT, CRYPTO, MUTUAL_FUND — stay consistent with it.`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];

    for (const modelName of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;
        const parsed = JSON.parse(jsonMatch[0]) as { officialName?: string; cmp?: number };
        const officialName = typeof parsed.officialName === 'string' ? parsed.officialName.trim() : '';
        const cmp = Number(parsed.cmp);
        if (!officialName || !Number.isFinite(cmp) || cmp <= 0) continue;
        return { officialName, cmp };
      } catch (err) {
        if (isLikelyGeminiQuotaError(err)) {
          armGeminiQuotaCooldown();
          logGeminiQuotaThrottled(this.logger, 'Portfolio synchronizer CMP');
          break;
        }
        this.logger.debug(`verifyPortfolioInstrumentCmp: ${modelName} failed`);
      }
    }
    return null;
  }

  /**
   * FinXpert AI Strategist: concise book-style plan (max ~150 words), INR-only, four asset classes.
   */
  async generateFinXpertStrategicPlan(contextBlock: string): Promise<string> {
    if (!this.genAI) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    if (isGeminiQuotaCooldownActive()) {
      throw new Error('Gemini is temporarily unavailable (API quota cooldown).');
    }

    const prompt = `You are the 'FinXpert AI Strategist', a high-level financial advisor. Produce a concise, data-driven strategic plan using ONLY the data below.

${contextBlock}

OUTPUT STRUCTURE (plain text, no markdown fences):
1) Line starting with ANALYZE: — one short paragraph comparing allocation to risk profile.
2) Line starting with OPTIMIZE: — then 3-4 bullet lines (each starting with "• ") with specific actions to improve the Health Score.
3) Line starting with MITIGATE: — exactly one sentence with one concrete move to reduce the projected stress loss.

RULES:
- Total output: 150 words or fewer.
- Always show money in ₹ (INR) using Indian grouping (e.g. ₹12,34,567 or lakhs/crores style).
- Mention asset classes ONLY as: Stock, Debt, Crypto, Mutual Fund (no other asset labels).
- Tone: professional, authoritative, data-centric. No disclaimers or filler.

Return ONLY the plan text.`;

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];
    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        if (text.length > 20) {
          return this.clampWordCount(text, 150);
        }
      } catch (err) {
        lastError = err;
        if (isLikelyGeminiQuotaError(err)) {
          armGeminiQuotaCooldown();
          logGeminiQuotaThrottled(this.logger, 'FinXpert strategic plan');
          break;
        }
        this.logger.warn(`Strategic plan model ${modelName} failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Strategic plan generation failed');
  }

  private clampWordCount(text: string, maxWords: number): string {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return text.trim();
    return `${words.slice(0, maxWords).join(' ')}…`;
  }
}