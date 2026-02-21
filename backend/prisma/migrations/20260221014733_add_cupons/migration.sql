-- CreateTable
CREATE TABLE "Cupom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo_desconto" TEXT NOT NULL,
    "valor_desconto" DECIMAL NOT NULL,
    "valor_minimo" DECIMAL,
    "max_usos" INTEGER,
    "usos_count" INTEGER NOT NULL DEFAULT 0,
    "usos_por_cliente" INTEGER,
    "data_inicio" DATETIME NOT NULL,
    "data_fim" DATETIME NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Cupom_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CupomUso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cupom_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "usado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CupomUso_cupom_id_fkey" FOREIGN KEY ("cupom_id") REFERENCES "Cupom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CupomUso_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Clientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CupomUso_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "Pedidos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pedidos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "cupom_id" TEXT,
    "nome_cliente" TEXT NOT NULL,
    "telefone_cliente" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "bairro" TEXT NOT NULL DEFAULT '',
    "taxa_entrega" DECIMAL NOT NULL DEFAULT 0,
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "desconto" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "status" TEXT NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "observacao" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pedidos_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Clientes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pedidos_cupom_id_fkey" FOREIGN KEY ("cupom_id") REFERENCES "Cupom" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pedidos" ("bairro", "cliente_id", "created_at", "endereco", "forma_pagamento", "id", "loja_id", "nome_cliente", "observacao", "status", "taxa_entrega", "telefone_cliente", "total") SELECT "bairro", "cliente_id", "created_at", "endereco", "forma_pagamento", "id", "loja_id", "nome_cliente", "observacao", "status", "taxa_entrega", "telefone_cliente", "total" FROM "Pedidos";
DROP TABLE "Pedidos";
ALTER TABLE "new_Pedidos" RENAME TO "Pedidos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Cupom_loja_id_codigo_key" ON "Cupom"("loja_id", "codigo");
