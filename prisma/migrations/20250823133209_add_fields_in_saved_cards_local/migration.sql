-- AlterTable
ALTER TABLE "saved_cards" ADD COLUMN     "exp_month" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "exp_year" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "first_six_digits" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "holder_document" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "last_four_digits" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT '';
