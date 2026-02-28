-- Relacao da loja com cidade (sem quebra para dados existentes)
ALTER TABLE "Lojas" ADD COLUMN IF NOT EXISTS "cidade_id" TEXT;
CREATE INDEX IF NOT EXISTS "Lojas_cidade_id_idx" ON "Lojas"("cidade_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Lojas_cidade_id_fkey'
  ) THEN
    ALTER TABLE "Lojas"
      ADD CONSTRAINT "Lojas_cidade_id_fkey"
      FOREIGN KEY ("cidade_id") REFERENCES "Cidades"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill: vincula lojas existentes a uma cidade pelo nome da cidade.
-- Nao altera o nome da cidade da loja, apenas preenche cidade_id quando possivel.
UPDATE "Lojas" l
SET "cidade_id" = c.id
FROM "Cidades" c
WHERE l."cidade_id" IS NULL
  AND lower(trim(l.cidade)) = lower(trim(c.nome));

-- Feed de posts das lojas (separado por cidade)
CREATE TABLE IF NOT EXISTS "store_posts" (
  "id" TEXT NOT NULL,
  "store_id" TEXT NOT NULL,
  "city_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "image_url" TEXT,
  "post_type" VARCHAR(20) NOT NULL DEFAULT 'normal',
  "poll_options" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMP NOT NULL,
  CONSTRAINT "store_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "store_posts_city_id_expires_at_idx" ON "store_posts"("city_id", "expires_at");
CREATE INDEX IF NOT EXISTS "store_posts_store_id_expires_at_idx" ON "store_posts"("store_id", "expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_posts_store_id_fkey'
  ) THEN
    ALTER TABLE "store_posts"
      ADD CONSTRAINT "store_posts_store_id_fkey"
      FOREIGN KEY ("store_id") REFERENCES "Lojas"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_posts_city_id_fkey'
  ) THEN
    ALTER TABLE "store_posts"
      ADD CONSTRAINT "store_posts_city_id_fkey"
      FOREIGN KEY ("city_id") REFERENCES "Cidades"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Likes
CREATE TABLE IF NOT EXISTS "post_likes" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "post_likes_post_id_user_id_key" ON "post_likes"("post_id", "user_id");
CREATE INDEX IF NOT EXISTS "post_likes_post_id_idx" ON "post_likes"("post_id");
CREATE INDEX IF NOT EXISTS "post_likes_user_id_idx" ON "post_likes"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_likes_post_id_fkey'
  ) THEN
    ALTER TABLE "post_likes"
      ADD CONSTRAINT "post_likes_post_id_fkey"
      FOREIGN KEY ("post_id") REFERENCES "store_posts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_likes_user_id_fkey'
  ) THEN
    ALTER TABLE "post_likes"
      ADD CONSTRAINT "post_likes_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "Clientes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Comentarios
CREATE TABLE IF NOT EXISTS "post_comments" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "comment" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "post_comments_post_id_created_at_idx" ON "post_comments"("post_id", "created_at");
CREATE INDEX IF NOT EXISTS "post_comments_user_id_idx" ON "post_comments"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_comments_post_id_fkey'
  ) THEN
    ALTER TABLE "post_comments"
      ADD CONSTRAINT "post_comments_post_id_fkey"
      FOREIGN KEY ("post_id") REFERENCES "store_posts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_comments_user_id_fkey'
  ) THEN
    ALTER TABLE "post_comments"
      ADD CONSTRAINT "post_comments_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "Clientes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Votos em enquete
CREATE TABLE IF NOT EXISTS "post_votes" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "option_selected" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "post_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "post_votes_post_id_user_id_key" ON "post_votes"("post_id", "user_id");
CREATE INDEX IF NOT EXISTS "post_votes_post_id_idx" ON "post_votes"("post_id");
CREATE INDEX IF NOT EXISTS "post_votes_user_id_idx" ON "post_votes"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_votes_post_id_fkey'
  ) THEN
    ALTER TABLE "post_votes"
      ADD CONSTRAINT "post_votes_post_id_fkey"
      FOREIGN KEY ("post_id") REFERENCES "store_posts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_votes_user_id_fkey'
  ) THEN
    ALTER TABLE "post_votes"
      ADD CONSTRAINT "post_votes_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "Clientes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
