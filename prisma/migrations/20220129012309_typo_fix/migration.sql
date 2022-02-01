/*
  Warnings:

  - You are about to drop the column `txRefs` on the `transactions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[txRef]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `txRef` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "transactions_txRefs_key";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "txRefs",
ADD COLUMN     "txRef" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_txRef_key" ON "transactions"("txRef");
