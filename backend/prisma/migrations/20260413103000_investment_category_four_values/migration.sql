-- Replace InvestmentCategory with STOCK | DEBT | CRYPTO | MUTUAL_FUND
-- Data: CASH -> DEBT, GOLD -> MUTUAL_FUND; other values map by name.

CREATE TYPE "InvestmentCategory_new" AS ENUM ('STOCK', 'DEBT', 'CRYPTO', 'MUTUAL_FUND');

ALTER TABLE "Investment" ALTER COLUMN "category" DROP DEFAULT;

ALTER TABLE "Investment" ALTER COLUMN "category" TYPE "InvestmentCategory_new" USING (
  CASE "category"::text
    WHEN 'CASH' THEN 'DEBT'::"InvestmentCategory_new"
    WHEN 'GOLD' THEN 'MUTUAL_FUND'::"InvestmentCategory_new"
    ELSE "category"::text::"InvestmentCategory_new"
  END
);

ALTER TABLE "Investment" ALTER COLUMN "category" SET DEFAULT 'STOCK'::"InvestmentCategory_new";

DROP TYPE "InvestmentCategory";

ALTER TYPE "InvestmentCategory_new" RENAME TO "InvestmentCategory";
