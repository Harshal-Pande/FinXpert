-- AlterEnum: add GOLD to InvestmentCategory
ALTER TYPE "InvestmentCategory" ADD VALUE 'GOLD';

-- Add cached AUM on Client (sum of investments.total_value; synced by AssetsService)
ALTER TABLE "Client" ADD COLUMN "total_aum" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "Client" AS c
SET "total_aum" = COALESCE(
  (SELECT SUM(i."total_value") FROM "Investment" AS i WHERE i."client_id" = c."id"),
  0
);
