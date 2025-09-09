/*
  Warnings:

  - Made the column `duration` on table `appointments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `duration` on table `single_workouts` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "duration" SET NOT NULL;

-- AlterTable
ALTER TABLE "single_workouts" ALTER COLUMN "duration" SET NOT NULL;
