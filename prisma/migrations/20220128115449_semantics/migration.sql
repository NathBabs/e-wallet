/*
  Warnings:

  - The primary key for the `account` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `account` table. All the data in the column will be lost.
  - Added the required column `txType` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "txType" AS ENUM ('INFLOW', 'OUTFLOW');

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_senderId_fkey";

-- AlterTable
ALTER TABLE "account" DROP CONSTRAINT "account_pkey",
DROP COLUMN "id",
ADD COLUMN     "accNumber" SERIAL NOT NULL,
ADD CONSTRAINT "account_pkey" PRIMARY KEY ("accNumber");

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "txType" "txType" NOT NULL;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "account"("accNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "account"("accNumber") ON DELETE RESTRICT ON UPDATE CASCADE;
