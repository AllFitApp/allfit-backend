/*
  Warnings:

  - You are about to drop the column `trainer_id` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `trainer_id` on the `single_classes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[trainer_username]` on the table `single_classes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `trainer_username` to the `plans` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trainer_username` to the `single_classes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "plans" DROP CONSTRAINT "plans_trainer_id_fkey";

-- DropForeignKey
ALTER TABLE "single_classes" DROP CONSTRAINT "single_classes_trainer_id_fkey";

-- DropIndex
DROP INDEX "plans_trainer_id_is_active_idx";

-- DropIndex
DROP INDEX "single_classes_trainer_id_is_active_idx";

-- DropIndex
DROP INDEX "single_classes_trainer_id_key";

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "trainer_id",
ADD COLUMN     "trainer_username" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "single_classes" DROP COLUMN "trainer_id",
ADD COLUMN     "trainer_username" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "plans_trainer_username_is_active_idx" ON "plans"("trainer_username", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "single_classes_trainer_username_key" ON "single_classes"("trainer_username");

-- CreateIndex
CREATE INDEX "single_classes_trainer_username_is_active_idx" ON "single_classes"("trainer_username", "is_active");

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_trainer_username_fkey" FOREIGN KEY ("trainer_username") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_classes" ADD CONSTRAINT "single_classes_trainer_username_fkey" FOREIGN KEY ("trainer_username") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
