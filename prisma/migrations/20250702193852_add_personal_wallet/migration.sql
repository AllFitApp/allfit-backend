-- CreateTable
CREATE TABLE "Wallet" (
    "id" SERIAL NOT NULL,
    "personalId" INTEGER NOT NULL,
    "pagarmeWalletId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lastSynced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_personalId_key" ON "Wallet"("personalId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_pagarmeWalletId_key" ON "Wallet"("pagarmeWalletId");
