/*
  Warnings:

  - You are about to drop the `wallets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_user_id_fkey";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "planId" INTEGER,
ADD COLUMN     "singleWorkoutId" INTEGER;

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "category" TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "wallets";

-- CreateTable
CREATE TABLE "wallet" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "pagarme_wallet_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "last_synced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "single_classes" (
    "id" SERIAL NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "single_classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_user_id_key" ON "wallet"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_pagarme_wallet_id_key" ON "wallet"("pagarme_wallet_id");

-- CreateIndex
CREATE INDEX "single_classes_trainer_id_is_active_idx" ON "single_classes"("trainer_id", "is_active");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_singleWorkoutId_fkey" FOREIGN KEY ("singleWorkoutId") REFERENCES "single_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_classes" ADD CONSTRAINT "single_classes_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
