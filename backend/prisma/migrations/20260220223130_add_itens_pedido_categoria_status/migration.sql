-- CreateTable
CREATE TABLE "ItensPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pedido_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL NOT NULL,
    CONSTRAINT "ItensPedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "Pedidos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItensPedido_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produtos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lojas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoria_negocio" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "endereco" TEXT NOT NULL DEFAULT '',
    "telefone" TEXT NOT NULL DEFAULT '',
    "horario_funcionamento" TEXT NOT NULL DEFAULT '',
    "logo_url" TEXT NOT NULL,
    "cor_primaria" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL,
    "aberta" BOOLEAN NOT NULL,
    "taxa_entrega" REAL NOT NULL DEFAULT 0,
    "vencimento" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Lojas" ("aberta", "ativa", "categoria_negocio", "cidade", "cor_primaria", "id", "logo_url", "nome", "slug", "taxa_entrega", "vencimento") SELECT "aberta", "ativa", "categoria_negocio", "cidade", "cor_primaria", "id", "logo_url", "nome", "slug", "taxa_entrega", "vencimento" FROM "Lojas";
DROP TABLE "Lojas";
ALTER TABLE "new_Lojas" RENAME TO "Lojas";
CREATE UNIQUE INDEX "Lojas_slug_key" ON "Lojas"("slug");
CREATE TABLE "new_Pedidos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "nome_cliente" TEXT NOT NULL,
    "telefone_cliente" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "total" DECIMAL NOT NULL,
    "status" TEXT NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "observacao" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pedidos_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Pedidos" ("created_at", "endereco", "forma_pagamento", "id", "loja_id", "nome_cliente", "status", "telefone_cliente", "total") SELECT "created_at", "endereco", "forma_pagamento", "id", "loja_id", "nome_cliente", "status", "telefone_cliente", "total" FROM "Pedidos";
DROP TABLE "Pedidos";
ALTER TABLE "new_Pedidos" RENAME TO "Pedidos";
CREATE TABLE "new_Produtos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "preco" DECIMAL NOT NULL,
    "estoque" INTEGER NOT NULL,
    "imagem_url" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT '',
    "ativo" BOOLEAN NOT NULL,
    CONSTRAINT "Produtos_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Produtos" ("ativo", "descricao", "estoque", "id", "imagem_url", "loja_id", "nome", "preco") SELECT "ativo", "descricao", "estoque", "id", "imagem_url", "loja_id", "nome", "preco" FROM "Produtos";
DROP TABLE "Produtos";
ALTER TABLE "new_Produtos" RENAME TO "Produtos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
