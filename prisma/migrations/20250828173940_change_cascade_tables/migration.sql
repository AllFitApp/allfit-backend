-- DropForeignKey
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_trainer_id_fkey";

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
