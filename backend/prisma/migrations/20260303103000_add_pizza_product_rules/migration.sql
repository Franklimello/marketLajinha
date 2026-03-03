-- Add metadata for pizza products and dynamic flavor pricing.
ALTER TABLE "Produtos"
ADD COLUMN "tipo_produto" TEXT NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "pizza_preco_sabores" TEXT NOT NULL DEFAULT 'MAIOR';

ALTER TABLE "VariacaoProduto"
ADD COLUMN "fatias" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "max_sabores" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "AdicionalProduto"
ADD COLUMN "is_sabor" BOOLEAN NOT NULL DEFAULT false;
