-- Cost basis: buyPrice * quantity (stored alongside legacy avg_buy_price column).
ALTER TABLE "Investment" ADD COLUMN "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0;
UPDATE "Investment" SET "total_cost" = "quantity" * "avg_buy_price";

CREATE TABLE "PortfolioHistory" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "total_aum" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PortfolioHistory_client_id_date_idx" ON "PortfolioHistory"("client_id", "date");

ALTER TABLE "PortfolioHistory" ADD CONSTRAINT "PortfolioHistory_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
