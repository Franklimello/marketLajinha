ALTER TABLE "AdicionalProduto"
ADD COLUMN "descricao" TEXT NOT NULL DEFAULT '',
ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "AdicionalPrecoVariacao" (
  "id" TEXT NOT NULL,
  "adicional_id" TEXT NOT NULL,
  "variacao_id" TEXT NOT NULL,
  "preco" DECIMAL NOT NULL,
  CONSTRAINT "AdicionalPrecoVariacao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdicionalPrecoVariacao_adicional_id_variacao_id_key"
ON "AdicionalPrecoVariacao"("adicional_id", "variacao_id");

CREATE INDEX "AdicionalPrecoVariacao_adicional_id_idx"
ON "AdicionalPrecoVariacao"("adicional_id");

CREATE INDEX "AdicionalPrecoVariacao_variacao_id_idx"
ON "AdicionalPrecoVariacao"("variacao_id");

ALTER TABLE "AdicionalPrecoVariacao"
ADD CONSTRAINT "AdicionalPrecoVariacao_adicional_id_fkey"
FOREIGN KEY ("adicional_id") REFERENCES "AdicionalProduto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdicionalPrecoVariacao"
ADD CONSTRAINT "AdicionalPrecoVariacao_variacao_id_fkey"
FOREIGN KEY ("variacao_id") REFERENCES "VariacaoProduto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
