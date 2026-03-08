-- CreateTable
CREATE TABLE "Advisor" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Advisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "occupation" TEXT NOT NULL,
    "annual_income" DOUBLE PRECISION NOT NULL,
    "monthly_expense" DOUBLE PRECISION NOT NULL,
    "emergency_fund" DOUBLE PRECISION,
    "insurance_coverage" DOUBLE PRECISION,
    "risk_profile" TEXT,
    "investment_horizon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "total_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "asset_name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthScore" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioTarget" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "stock_target" DOUBLE PRECISION NOT NULL,
    "mutual_fund_target" DOUBLE PRECISION NOT NULL,
    "crypto_target" DOUBLE PRECISION NOT NULL,
    "debt_target" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketInsight" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "ai_summary" TEXT,
    "affected_clients" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Advisor_email_key" ON "Advisor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_client_id_key" ON "Portfolio"("client_id");

-- CreateIndex
CREATE INDEX "Asset_portfolio_id_idx" ON "Asset"("portfolio_id");

-- CreateIndex
CREATE INDEX "Asset_asset_type_idx" ON "Asset"("asset_type");

-- CreateIndex
CREATE INDEX "HealthScore_client_id_idx" ON "HealthScore"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioTarget_client_id_key" ON "PortfolioTarget"("client_id");

-- CreateIndex
CREATE INDEX "MarketInsight_created_at_idx" ON "MarketInsight"("created_at");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthScore" ADD CONSTRAINT "HealthScore_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioTarget" ADD CONSTRAINT "PortfolioTarget_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
