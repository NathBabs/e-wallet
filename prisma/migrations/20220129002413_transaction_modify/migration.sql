/*
  Warnings:

  - You are about to drop the column `txType` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "txType";

-- DropEnum
DROP TYPE "txType";
