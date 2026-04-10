export const envConfig = () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  /** Force bind address (e.g. 0.0.0.0). Leave unset in local dev for IPv4+IPv6. */
  listenHost: process.env.LISTEN_HOST,
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
    newsMarketQuery: process.env.NEWS_MARKET_QUERY ?? 'Indian stock market',
    mfapiBaseUrl: process.env.MFAPI_BASE_URL ?? 'https://api.mfapi.in',
    /** When true (default), Nifty/Sensex/gold use Yahoo Finance chart API (no key). Set false to use demo numbers only. */
    useYahooIndices:
      process.env.MARKET_USE_YAHOO !== '0' && process.env.MARKET_USE_YAHOO !== 'false',
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
  },
});

export type EnvConfig = ReturnType<typeof envConfig>;
