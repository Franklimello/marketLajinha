ALTER TABLE "Promocao"
ADD COLUMN "produto_id" TEXT;

CREATE INDEX "Promocao_produto_id_idx" ON "Promocao"("produto_id");

ALTER TABLE "Promocao"
ADD CONSTRAINT "Promocao_produto_id_fkey"
FOREIGN KEY ("produto_id") REFERENCES "Produtos"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
