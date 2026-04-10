-- CreateTable
CREATE TABLE "ComplianceObligation" (
    "id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceObligation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceObligation_advisor_id_idx" ON "ComplianceObligation"("advisor_id");

-- CreateIndex
CREATE INDEX "ComplianceObligation_due_date_idx" ON "ComplianceObligation"("due_date");

-- AddForeignKey
ALTER TABLE "ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
