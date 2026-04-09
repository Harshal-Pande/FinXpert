/*
  Warnings:

  - You are about to drop the `Asset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Portfolio` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('Stock', 'Crypto', 'Debt', 'Mutual_Fund');

-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_portfolio_id_fkey";

-- DropForeignKey
ALTER TABLE "Portfolio" DROP CONSTRAINT "Portfolio_client_id_fkey";

-- DropTable
DROP TABLE "Asset";

-- DropTable
DROP TABLE "Portfolio";

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "investment_type" "InvestmentType" NOT NULL,
    "instrument_name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "buy_rate" DOUBLE PRECISION NOT NULL,
    "total_value" DOUBLE PRECISION NOT NULL,
    "bought_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Investment_client_id_idx" ON "Investment"("client_id");

-- CreateIndex
CREATE INDEX "Investment_investment_type_idx" ON "Investment"("investment_type");

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
