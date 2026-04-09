-- CreateTable
CREATE TABLE "HealthScoreFormula" (
    "id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthScoreFormula_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthScoreFormula_advisor_id_key" ON "HealthScoreFormula"("advisor_id");

-- CreateIndex
CREATE INDEX "HealthScoreFormula_advisor_id_idx" ON "HealthScoreFormula"("advisor_id");

-- AddForeignKey
ALTER TABLE "HealthScoreFormula" ADD CONSTRAINT "HealthScoreFormula_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
