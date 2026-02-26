-- AlterTable
ALTER TABLE "AdicionalProduto"
ADD COLUMN "grupo_nome" TEXT NOT NULL DEFAULT 'Complementos',
ADD COLUMN "grupo_min" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "grupo_max" INTEGER NOT NULL DEFAULT 99,
ADD COLUMN "ordem_grupo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ordem_item" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "AdicionalProduto_produto_id_grupo_nome_ordem_item_idx"
ON "AdicionalProduto"("produto_id", "grupo_nome", "ordem_item");
