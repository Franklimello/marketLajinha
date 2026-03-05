-- CreateTable
CREATE TABLE "provider_blocked_slots" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_blocked_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_blocked_slots_provider_id_date_time_key" ON "provider_blocked_slots"("provider_id", "date", "time");

-- CreateIndex
CREATE INDEX "provider_blocked_slots_provider_id_date_idx" ON "provider_blocked_slots"("provider_id", "date");

-- AddForeignKey
ALTER TABLE "provider_blocked_slots" ADD CONSTRAINT "provider_blocked_slots_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
