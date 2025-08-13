-- CreateTable
CREATE TABLE "trainer_schedules" (
    "id" SERIAL NOT NULL,
    "trainerId" TEXT NOT NULL,
    "schedule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainer_schedules_trainerId_key" ON "trainer_schedules"("trainerId");

-- AddForeignKey
ALTER TABLE "trainer_schedules" ADD CONSTRAINT "trainer_schedules_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
