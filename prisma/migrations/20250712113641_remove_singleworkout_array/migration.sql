/*
  Warnings:

  - A unique constraint covering the columns `[trainer_id]` on the table `single_classes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "single_classes_trainer_id_key" ON "single_classes"("trainer_id");
