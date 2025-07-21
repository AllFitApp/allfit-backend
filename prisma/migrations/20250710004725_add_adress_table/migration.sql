-- CreateTable
CREATE TABLE "addresses" (
    "id" SERIAL NOT NULL,
    "street" TEXT NOT NULL,
    "complementary" TEXT,
    "street_number" INTEGER NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "zip_code" TEXT NOT NULL,
    "reference_point" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipient_infos" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "address_id" INTEGER NOT NULL,
    "site_url" TEXT,
    "mother_name" TEXT,
    "birthdate" TEXT,
    "monthly_income" INTEGER,
    "professional_occupation" TEXT,
    "bank_holder_name" TEXT NOT NULL,
    "bank_holder_type" TEXT NOT NULL DEFAULT 'individual',
    "bank_holder_document" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "branch_number" TEXT NOT NULL,
    "branch_check_digit" TEXT,
    "account_number" TEXT NOT NULL,
    "account_check_digit" TEXT,
    "account_type" TEXT NOT NULL DEFAULT 'checking',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipient_infos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipient_infos_user_id_key" ON "recipient_infos"("user_id");

-- AddForeignKey
ALTER TABLE "recipient_infos" ADD CONSTRAINT "recipient_infos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipient_infos" ADD CONSTRAINT "recipient_infos_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
