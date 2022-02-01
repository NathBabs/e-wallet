/*
  Warnings:

  - A unique constraint covering the columns `[refundRef]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "refundRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_refundRef_key" ON "transactions"("refundRef");
