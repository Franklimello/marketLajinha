-- CreateTable
CREATE TABLE "VariacaoProduto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL NOT NULL,
    CONSTRAINT "VariacaoProduto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produtos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdicionalProduto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL NOT NULL,
    CONSTRAINT "AdicionalProduto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produtos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ItensPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pedido_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL NOT NULL,
    "variacao_nome" TEXT NOT NULL DEFAULT '',
    "variacao_preco" DECIMAL NOT NULL DEFAULT 0,
    "adicionais_json" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "ItensPedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "Pedidos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItensPedido_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produtos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ItensPedido" ("id", "pedido_id", "preco_unitario", "produto_id", "quantidade") SELECT "id", "pedido_id", "preco_unitario", "produto_id", "quantidade" FROM "ItensPedido";
DROP TABLE "ItensPedido";
ALTER TABLE "new_ItensPedido" RENAME TO "ItensPedido";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
