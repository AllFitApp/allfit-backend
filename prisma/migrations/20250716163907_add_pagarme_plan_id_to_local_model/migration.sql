/*
  Warnings:

  - A unique constraint covering the columns `[pagarme_plan_id]` on the table `plans` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "pagarme_plan_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "plans_pagarme_plan_id_key" ON "plans"("pagarme_plan_id");
