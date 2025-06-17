-- CreateTable
CREATE TABLE "appointments" (
    "id" SERIAL NOT NULL,
    "studentName" TEXT NOT NULL,
    "workoutType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);
