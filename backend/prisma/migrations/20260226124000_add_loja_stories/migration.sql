CREATE TABLE "restaurant_stories" (
  "id" TEXT NOT NULL,
  "restaurant_id" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "media_type" TEXT NOT NULL DEFAULT 'image',
  "link_url" TEXT,
  "coupon_code" TEXT,
  "is_sponsored" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "restaurant_stories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_restaurant_stories_active"
ON "restaurant_stories"("restaurant_id", "is_active", "expires_at");

ALTER TABLE "restaurant_stories"
ADD CONSTRAINT "restaurant_stories_restaurant_id_fkey"
FOREIGN KEY ("restaurant_id") REFERENCES "Lojas"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
