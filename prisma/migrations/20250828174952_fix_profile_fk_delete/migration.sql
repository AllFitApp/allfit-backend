-- DropForeignKey
ALTER TABLE "user_infos" DROP CONSTRAINT "user_infos_username_fkey";

-- AddForeignKey
ALTER TABLE "user_infos" ADD CONSTRAINT "user_infos_username_fkey" FOREIGN KEY ("username") REFERENCES "users"("username") ON DELETE CASCADE ON UPDATE CASCADE;
