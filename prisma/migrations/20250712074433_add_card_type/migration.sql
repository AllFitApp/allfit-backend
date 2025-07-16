/*
  Warnings:

  - Added the required column `type` to the `saved_cards` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "saved_cards" ADD COLUMN     "type" TEXT NOT NULL;
