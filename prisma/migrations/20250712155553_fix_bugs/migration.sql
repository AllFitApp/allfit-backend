/*
  Warnings:

  - A unique constraint covering the columns `[trainer_id]` on the table `single_classes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `trainer_id` to the `plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trainer_id` to the `single_classes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_trainer_username_fkey";

-- DropForeignKey
ALTER TABLE "single_classes" DROP CONSTRAINT "single_classes_trainer_username_fkey";

-- DropIndex
DROP INDEX "plans_trainer_username_is_active_idx";

-- DropIndex
DROP INDEX "single_classes_trainer_username_key";

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "trainer_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "single_classes" ADD COLUMN     "trainer_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "plans_trainer_username_is_active_trainer_id_idx" ON "plans"("trainer_username", "is_active", "trainer_id");

-- CreateIndex
CREATE UNIQUE INDEX "single_classes_trainer_id_key" ON "single_classes"("trainer_id");

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_classes" ADD CONSTRAINT "single_classes_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
