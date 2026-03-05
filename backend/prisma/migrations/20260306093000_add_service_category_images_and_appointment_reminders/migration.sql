-- AlterTable
ALTER TABLE "services"
ADD COLUMN "category" TEXT NOT NULL DEFAULT '',
ADD COLUMN "images_urls_json" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "appointments"
ADD COLUMN "reminder_24h_sent_at" TIMESTAMPTZ,
ADD COLUMN "reminder_2h_sent_at" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "services_city_category_idx" ON "services"("city", "category");

