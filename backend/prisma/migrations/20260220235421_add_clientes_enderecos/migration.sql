-- CreateTable
CREATE TABLE "Clientes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firebase_uid" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EnderecoCliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cliente_id" TEXT NOT NULL,
    "apelido" TEXT NOT NULL DEFAULT '',
    "bairro" TEXT NOT NULL,
    "rua" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT NOT NULL DEFAULT '',
    "referencia" TEXT NOT NULL DEFAULT '',
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "EnderecoCliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Clientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pedidos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL DEFAULT '',
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
    CONSTRAINT "Pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Clientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Pedidos" ("bairro", "created_at", "endereco", "forma_pagamento", "id", "loja_id", "nome_cliente", "observacao", "status", "taxa_entrega", "telefone_cliente", "total") SELECT "bairro", "created_at", "endereco", "forma_pagamento", "id", "loja_id", "nome_cliente", "observacao", "status", "taxa_entrega", "telefone_cliente", "total" FROM "Pedidos";
DROP TABLE "Pedidos";
ALTER TABLE "new_Pedidos" RENAME TO "Pedidos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Clientes_firebase_uid_key" ON "Clientes"("firebase_uid");
