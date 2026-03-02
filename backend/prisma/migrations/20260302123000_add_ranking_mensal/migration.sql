ALTER TABLE "Clientes"
ADD COLUMN IF NOT EXISTS "ranking_publico" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "RankingMensalUsuario" (
  "id" TEXT NOT NULL,
  "cidade_id" TEXT NOT NULL,
  "mes_referencia" TEXT NOT NULL,
  "cliente_id" TEXT NOT NULL,
  "pedidos_mes" INTEGER NOT NULL DEFAULT 0,
  "ranking_publico" BOOLEAN NOT NULL DEFAULT true,
  "nome_snapshot" TEXT NOT NULL DEFAULT '',
  "foto_snapshot" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RankingMensalUsuario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RankingMensalUsuario_cidade_id_mes_referencia_cliente_id_key"
ON "RankingMensalUsuario"("cidade_id", "mes_referencia", "cliente_id");

CREATE INDEX IF NOT EXISTS "RankingMensalUsuario_cidade_id_mes_referencia_pedidos_mes_idx"
ON "RankingMensalUsuario"("cidade_id", "mes_referencia", "pedidos_mes");

CREATE INDEX IF NOT EXISTS "RankingMensalUsuario_cliente_id_mes_referencia_idx"
ON "RankingMensalUsuario"("cliente_id", "mes_referencia");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RankingMensalUsuario_cidade_id_fkey'
  ) THEN
    ALTER TABLE "RankingMensalUsuario"
      ADD CONSTRAINT "RankingMensalUsuario_cidade_id_fkey"
      FOREIGN KEY ("cidade_id") REFERENCES "Cidades"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RankingMensalUsuario_cliente_id_fkey'
  ) THEN
    ALTER TABLE "RankingMensalUsuario"
      ADD CONSTRAINT "RankingMensalUsuario_cliente_id_fkey"
      FOREIGN KEY ("cliente_id") REFERENCES "Clientes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
