/*
  Warnings:

  - Made the column `photo_url` on table `partner_gyms` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."partner_gyms" ALTER COLUMN "photo_url" SET NOT NULL;
