-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'pending';
