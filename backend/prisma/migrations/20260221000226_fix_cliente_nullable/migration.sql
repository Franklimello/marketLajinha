-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pedidos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "cliente_id" TEXT,
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
    CONSTRAINT "Pedidos_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Clientes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pedidos" ("bairro", "cliente_id", "created_at", "endereco", "forma_pagamento", "id", "loja_id", "nome_cliente", "observacao", "status", "taxa_entrega", "telefone_cliente", "total") SELECT "bairro", "cliente_id", "created_at", "endereco", "forma_pagamento", "id", "loja_id", "nome_cliente", "observacao", "status", "taxa_entrega", "telefone_cliente", "total" FROM "Pedidos";
DROP TABLE "Pedidos";
ALTER TABLE "new_Pedidos" RENAME TO "Pedidos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
