/*
  Warnings:

  - You are about to drop the column `is_active` on the `workouts` table. All the data in the column will be lost.
  - Added the required column `appointment_id` to the `workouts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_workout_id_fkey";

-- DropIndex
DROP INDEX "workouts_trainer_id_is_active_idx";

-- AlterTable
ALTER TABLE "workouts" DROP COLUMN "is_active",
ADD COLUMN     "appointment_id" INTEGER NOT NULL,
ADD COLUMN     "day_of_week" INTEGER,
ADD COLUMN     "order" INTEGER;

-- CreateIndex
CREATE INDEX "workouts_trainer_id_idx" ON "workouts"("trainer_id");

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
