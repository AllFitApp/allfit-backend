-- CreateTable
CREATE TABLE "public"."partner_gyms" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "street" TEXT NOT NULL,
    "street_number" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "zip_code" TEXT NOT NULL,
    "complementary" TEXT,
    "available_services" JSONB NOT NULL,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "contact_website" TEXT,
    "photo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_gyms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_gyms_city_state_idx" ON "public"."partner_gyms"("city", "state");

-- CreateIndex
CREATE INDEX "partner_gyms_is_active_idx" ON "public"."partner_gyms"("is_active");

-- CreateIndex
CREATE INDEX "partner_gyms_name_idx" ON "public"."partner_gyms"("name");
