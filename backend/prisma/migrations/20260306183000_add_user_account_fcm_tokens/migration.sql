-- CreateTable
CREATE TABLE "user_account_fcm_tokens" (
    "id" TEXT NOT NULL,
    "user_account_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_account_fcm_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_account_fcm_tokens_token_key" ON "user_account_fcm_tokens"("token");

-- CreateIndex
CREATE INDEX "user_account_fcm_tokens_user_account_id_idx" ON "user_account_fcm_tokens"("user_account_id");

-- AddForeignKey
ALTER TABLE "user_account_fcm_tokens" ADD CONSTRAINT "user_account_fcm_tokens_user_account_id_fkey" FOREIGN KEY ("user_account_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
