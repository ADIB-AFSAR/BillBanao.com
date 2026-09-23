/*
  Warnings:

  - A unique constraint covering the columns `[businessId,idempotencyKey]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_businessId_idempotencyKey_key" ON "Invoice"("businessId", "idempotencyKey");
