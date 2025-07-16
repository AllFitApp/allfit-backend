/*
  Warnings:

  - The primary key for the `plans` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_planId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_plan_id_fkey";

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "planId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "plans" DROP CONSTRAINT "plans_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "plans_id_seq";

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "plan_id" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
