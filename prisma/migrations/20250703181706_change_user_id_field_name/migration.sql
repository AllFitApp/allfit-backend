/*
  Warnings:

  - You are about to drop the column `personalId` on the `wallet` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `wallet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `wallet` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "wallet_personalId_key";

-- AlterTable
ALTER TABLE "wallet" DROP COLUMN "personalId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "wallet_userId_key" ON "wallet"("userId");
