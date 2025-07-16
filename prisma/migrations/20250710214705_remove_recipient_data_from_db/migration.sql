/*
  Warnings:

  - You are about to drop the column `recipient_data` on the `wallet` table. All the data in the column will be lost.
  - Made the column `birthdate` on table `recipient_infos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branch_check_digit` on table `recipient_infos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `account_check_digit` on table `recipient_infos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "recipient_infos" ALTER COLUMN "birthdate" SET NOT NULL,
ALTER COLUMN "branch_check_digit" SET NOT NULL,
ALTER COLUMN "account_check_digit" SET NOT NULL;

-- AlterTable
ALTER TABLE "wallet" DROP COLUMN "recipient_data";
