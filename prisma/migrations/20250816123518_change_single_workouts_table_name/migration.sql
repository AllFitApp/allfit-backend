/*
  Warnings:

  - You are about to drop the `single_classes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_singleWorkoutId_fkey";

-- DropForeignKey
ALTER TABLE "single_classes" DROP CONSTRAINT "single_classes_trainer_id_fkey";

-- DropTable
DROP TABLE "single_classes";

-- CreateTable
CREATE TABLE "single_workouts" (
    "id" SERIAL NOT NULL,
    "trainer_username" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "price" INTEGER NOT NULL,
    "duration" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "single_workouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "single_workouts_trainer_id_is_active_idx" ON "single_workouts"("trainer_id", "is_active");

-- CreateIndex
CREATE INDEX "single_workouts_trainer_username_is_active_idx" ON "single_workouts"("trainer_username", "is_active");

-- CreateIndex
CREATE INDEX "single_workouts_category_idx" ON "single_workouts"("category");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_singleWorkoutId_fkey" FOREIGN KEY ("singleWorkoutId") REFERENCES "single_workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "single_workouts" ADD CONSTRAINT "single_workouts_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
