/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pan_number]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InvestmentCategory" AS ENUM ('STOCK', 'MUTUAL_FUND', 'CRYPTO', 'CASH');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "email" TEXT,
ADD COLUMN     "pan_number" TEXT;

-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "avg_buy_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "category" "InvestmentCategory" NOT NULL DEFAULT 'STOCK',
ADD COLUMN     "current_price" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "total_value" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_client_id_date_idx" ON "PortfolioSnapshot"("client_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_pan_number_key" ON "Client"("pan_number");

-- AddForeignKey
ALTER TABLE "PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
