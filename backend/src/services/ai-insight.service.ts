import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface MarketInsightAiResponse {
  title: string;
  summary: string;
  severity: string;
  eventType: string;
  advice: string;
}

@Injectable()
export class AiInsightService {
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

    // UPDATED: Using 'gemini-2.5-flash' which is the current stable name for this SDK
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const context = data ? `Additional context: ${JSON.stringify(data)}` : '';

    const prompt = `You are a financial analyst. Analyze this news and return a JSON object ONLY. 
    Use keys: "title", "summary", "severity", "eventType", "advice".
    
    News: ${news}
    ${context}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Robust JSON extraction
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No valid JSON found in AI response');
      
      const parsed = JSON.parse(jsonMatch[0]) as MarketInsightAiResponse;
      return parsed;
    } catch (error) {
      console.error('AI Insight Error:', error);
      throw error;
    }
  }
}