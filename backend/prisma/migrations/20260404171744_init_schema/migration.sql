-- AlterTable
ALTER TABLE "HealthScore" ADD COLUMN     "breakdown" TEXT;

-- CreateTable
CREATE TABLE "TodoItem" (
    "id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "client_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TodoItem_advisor_id_idx" ON "TodoItem"("advisor_id");

-- CreateIndex
CREATE INDEX "TodoItem_status_idx" ON "TodoItem"("status");

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
