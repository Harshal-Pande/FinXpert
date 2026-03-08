# FinXpert

AI-enabled financial advisory and portfolio management platform for financial advisors.

## Structure

- **backend/** ? NestJS API (REST, JWT, Prisma, PostgreSQL)
- **frontend/** ? Next.js App Router, React, TypeScript, TailwindCSS

## Quick start

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
