/*
  Warnings:

  - You are about to drop the column `duration` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `singleWorkoutId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `studentName` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `trainerId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `workoutType` on the `appointments` table. All the data in the column will be lost.
  - Added the required column `trainer_id` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `location` on the `appointments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_singleWorkoutId_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_trainerId_fkey";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "duration",
DROP COLUMN "singleWorkoutId",
DROP COLUMN "studentName",
DROP COLUMN "time",
DROP COLUMN "trainerId",
DROP COLUMN "workoutType",
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "single_workout_id" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'scheduled',
ADD COLUMN     "student_id" TEXT,
ADD COLUMN     "subscription_id" TEXT,
ADD COLUMN     "trainer_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "location",
ADD COLUMN     "location" JSONB NOT NULL;

-- CreateIndex
CREATE INDEX "appointments_trainer_id_idx" ON "appointments"("trainer_id");

-- CreateIndex
CREATE INDEX "appointments_date_idx" ON "appointments"("date");

-- CreateIndex
CREATE INDEX "appointments_student_id_idx" ON "appointments"("student_id");

-- CreateIndex
CREATE INDEX "appointments_subscription_id_idx" ON "appointments"("subscription_id");

-- CreateIndex
CREATE INDEX "appointments_single_workout_id_idx" ON "appointments"("single_workout_id");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_paymentStatus_idx" ON "appointments"("paymentStatus");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_single_workout_id_fkey" FOREIGN KEY ("single_workout_id") REFERENCES "single_workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
