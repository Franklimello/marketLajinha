ALTER TABLE "Produtos"
ADD COLUMN "destaque" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Produtos_loja_id_destaque_ativo_idx"
ON "Produtos"("loja_id", "destaque", "ativo");
