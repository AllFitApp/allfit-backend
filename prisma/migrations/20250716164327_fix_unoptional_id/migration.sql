/*
  Warnings:

  - Made the column `pagarme_plan_id` on table `plans` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "plans" ALTER COLUMN "pagarme_plan_id" SET NOT NULL;
