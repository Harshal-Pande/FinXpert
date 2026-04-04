export const envConfig = () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'finxpert-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  externalApis: {
    alphaVantageKey: process.env.ALPHA_VANTAGE_API_KEY,
    binanceBaseUrl: process.env.BINANCE_API_URL ?? 'https://api.binance.com',
    newsApiKey: process.env.NEWS_API_KEY,
    mfapiBaseUrl: process.env.MFAPI_BASE_URL ?? 'https://api.mfapi.in',
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
  },
});

export type EnvConfig = ReturnType<typeof envConfig>;
