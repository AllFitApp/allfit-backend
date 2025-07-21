/*
  Warnings:

  - A unique constraint covering the columns `[pagarme_customer_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pagarme_customer_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_pagarme_customer_id_key" ON "users"("pagarme_customer_id");
