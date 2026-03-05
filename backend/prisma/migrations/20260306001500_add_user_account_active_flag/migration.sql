-- AlterTable
ALTER TABLE "users"
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "users_account_type_is_active_idx" ON "users"("account_type", "is_active");
