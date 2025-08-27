/*
  Warnings:

  - The `is_copy` column on the `exercises` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `is_copy` column on the `weekly_plans` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `is_copy` column on the `workouts` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "exercises" DROP COLUMN "is_copy",
ADD COLUMN     "is_copy" BOOLEAN;

-- AlterTable
ALTER TABLE "weekly_plans" DROP COLUMN "is_copy",
ADD COLUMN     "is_copy" BOOLEAN;

-- AlterTable
ALTER TABLE "workouts" DROP COLUMN "is_copy",
ADD COLUMN     "is_copy" BOOLEAN;
