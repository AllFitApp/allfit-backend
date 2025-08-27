/*
  Warnings:

  - You are about to drop the `trainer_schedules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "trainer_schedules" DROP CONSTRAINT "trainer_schedules_trainerId_fkey";

-- DropTable
DROP TABLE "trainer_schedules";

-- CreateTable
CREATE TABLE "trainer_horarios" (
    "id" SERIAL NOT NULL,
    "trainerId" TEXT NOT NULL,
    "horarios" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_horarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainer_horarios_trainerId_key" ON "trainer_horarios"("trainerId");

-- AddForeignKey
ALTER TABLE "trainer_horarios" ADD CONSTRAINT "trainer_horarios_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
