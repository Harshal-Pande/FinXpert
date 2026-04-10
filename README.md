# FinXpert

AI-enabled financial advisory and portfolio management platform for financial advisors.

## Structure

- **backend/** ? NestJS API (REST, JWT, Prisma, PostgreSQL)
- **frontend/** ? Next.js App Router, React, TypeScript, TailwindCSS

## Quick start

### Full website (API + Next.js)

From the **repository root** (requires PostgreSQL and `backend/.env`):

```bash
npm run simulate
```

- **Next.js dev server runs on port 3020** (`npm run dev` in `frontend/`) so it never steals **3001**, which is reserved for the Nest API. If Next binds to 3001, the API will crash with `EADDRINUSE` and the dashboard will show "Internal Server Error" / proxy failures.
- App: http://localhost:3020/dashboard  
- API: http://localhost:3001/api  
- Ensure `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:3001/api` (see `frontend/.env.example`).
- **NewsAPI:** use only `NEWS_API_KEY` in `backend/.env`. `NEWS_MARKET_QUERY` must be a search phrase (e.g. `Indian stock market`), not a second API key.

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with DATABASE_URL and secrets
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

API: http://localhost:3001

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App: http://localhost:3000

### Docker (backend + DB)

```bash
cd backend
docker-compose up -d db   # dev: PostgreSQL only
# or
docker-compose up         # API + PostgreSQL
```

## Modules

- **Auth** ? Advisor login, JWT, role-ready
- **Clients** ? CRUD, search, filter
- **Portfolio & Assets** ? Stocks, mutual funds, crypto, debt
- **Health Score** ? Configurable factor weights, 1?10 score
- **Stress Test** ? Stock/crypto/bear scenarios
- **Rebalancing** ? Target allocation recommendations
- **Market Insights** ? News + Alpha Vantage + Binance ? Gemini AI insights
