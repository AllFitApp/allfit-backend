/*
  Warnings:

  - The values [PRODUCT_SALE] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `order_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('PAYMENT', 'WITHDRAWAL', 'REFUND', 'FEE');
ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_order_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_trainer_id_fkey";

-- DropIndex
DROP INDEX "single_classes_trainer_id_key";

-- AlterTable
ALTER TABLE "single_classes" ADD COLUMN     "category" TEXT,
ADD COLUMN     "duration" INTEGER;

-- DropTable
DROP TABLE "order_items";

-- DropTable
DROP TABLE "products";

-- DropEnum
DROP TYPE "ProductType";

-- CreateIndex
CREATE INDEX "single_classes_trainer_id_is_active_idx" ON "single_classes"("trainer_id", "is_active");

-- CreateIndex
CREATE INDEX "single_classes_category_idx" ON "single_classes"("category");
