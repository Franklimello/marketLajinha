-- CreateTable
CREATE TABLE "BairroTaxa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "taxa" DECIMAL NOT NULL,
    CONSTRAINT "BairroTaxa_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pedidos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "nome_cliente" TEXT NOT NULL,
    "telefone_cliente" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "bairro" TEXT NOT NULL DEFAULT '',
    "taxa_entrega" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "status" TEXT NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "observacao" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pedidos_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Pedidos" ("created_at", "endereco", "forma_pagamento", "id", "loja_id", "nome_cliente", "observacao", "status", "telefone_cliente", "total") SELECT "created_at", "endereco", "forma_pagamento", "id", "loja_id", "nome_cliente", "observacao", "status", "telefone_cliente", "total" FROM "Pedidos";
DROP TABLE "Pedidos";
ALTER TABLE "new_Pedidos" RENAME TO "Pedidos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BairroTaxa_loja_id_nome_key" ON "BairroTaxa"("loja_id", "nome");
