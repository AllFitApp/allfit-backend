/*
  Warnings:

  - You are about to drop the column `workout_id` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the `_WeeklyPlanWorkouts` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[appointment_id]` on the table `workouts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "_WeeklyPlanWorkouts" DROP CONSTRAINT "_WeeklyPlanWorkouts_A_fkey";

-- DropForeignKey
ALTER TABLE "_WeeklyPlanWorkouts" DROP CONSTRAINT "_WeeklyPlanWorkouts_B_fkey";

-- DropForeignKey
ALTER TABLE "workouts" DROP CONSTRAINT "workouts_appointment_id_fkey";

-- DropIndex
DROP INDEX "appointments_workout_id_idx";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "workout_id",
ADD COLUMN     "workout_session_id" TEXT;

-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "weekly_plan_id" TEXT,
ALTER COLUMN "appointment_id" DROP NOT NULL;

-- DropTable
DROP TABLE "_WeeklyPlanWorkouts";

-- CreateIndex
CREATE INDEX "appointments_workout_session_id_idx" ON "appointments"("workout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "workouts_appointment_id_key" ON "workouts"("appointment_id");

-- CreateIndex
CREATE INDEX "workouts_appointment_id_idx" ON "workouts"("appointment_id");

-- CreateIndex
CREATE INDEX "workouts_weekly_plan_id_idx" ON "workouts"("weekly_plan_id");

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_weekly_plan_id_fkey" FOREIGN KEY ("weekly_plan_id") REFERENCES "weekly_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
