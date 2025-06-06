/*
  Warnings:

  - You are about to drop the column `userId` on the `user_infos` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `user_infos` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `user_infos` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "user_infos" DROP CONSTRAINT "user_infos_userId_fkey";

-- DropIndex
DROP INDEX "user_infos_userId_key";

-- AlterTable
ALTER TABLE "user_infos" DROP COLUMN "userId",
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_infos_username_key" ON "user_infos"("username");

-- AddForeignKey
ALTER TABLE "user_infos" ADD CONSTRAINT "user_infos_username_fkey" FOREIGN KEY ("username") REFERENCES "users"("username") ON DELETE RESTRICT ON UPDATE CASCADE;
