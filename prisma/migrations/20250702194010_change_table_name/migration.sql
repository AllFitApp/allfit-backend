/*
  Warnings:

  - You are about to drop the `Wallet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Wallet";

-- CreateTable
CREATE TABLE "wallet" (
    "id" SERIAL NOT NULL,
    "personalId" INTEGER NOT NULL,
    "pagarmeWalletId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_personalId_key" ON "wallet"("personalId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_pagarmeWalletId_key" ON "wallet"("pagarmeWalletId");
