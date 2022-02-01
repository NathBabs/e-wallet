/*
  Warnings:

  - You are about to drop the column `balance` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "account" ADD COLUMN     "balance" DOUBLE PRECISION NOT NULL DEFAULT 1000.00;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "balance";
