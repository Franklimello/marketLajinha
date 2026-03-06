CREATE TABLE IF NOT EXISTS "user_account_fcm_tokens" (
    "id" TEXT NOT NULL,
    "user_account_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT "user_account_fcm_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_account_fcm_tokens_token_key" UNIQUE ("token")
);

CREATE INDEX IF NOT EXISTS "idx_user_account_fcm_tokens_user_account_id"
ON "user_account_fcm_tokens"("user_account_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_account_fcm_tokens_user_account_id_fkey'
    ) THEN
        ALTER TABLE "user_account_fcm_tokens"
        ADD CONSTRAINT "user_account_fcm_tokens_user_account_id_fkey"
        FOREIGN KEY ("user_account_id")
        REFERENCES "users"("id")
        ON DELETE CASCADE;
    END IF;
END $$;
