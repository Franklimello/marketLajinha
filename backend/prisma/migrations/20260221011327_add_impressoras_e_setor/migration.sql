-- CreateTable
CREATE TABLE "Impressora" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL,
    "porta" INTEGER NOT NULL DEFAULT 9100,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Impressora_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Produtos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "preco" DECIMAL NOT NULL,
    "estoque" INTEGER NOT NULL,
    "imagem_url" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT '',
    "setor_impressao" TEXT NOT NULL DEFAULT '',
    "ativo" BOOLEAN NOT NULL,
    CONSTRAINT "Produtos_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Produtos" ("ativo", "categoria", "descricao", "estoque", "id", "imagem_url", "loja_id", "nome", "preco") SELECT "ativo", "categoria", "descricao", "estoque", "id", "imagem_url", "loja_id", "nome", "preco" FROM "Produtos";
DROP TABLE "Produtos";
ALTER TABLE "new_Produtos" RENAME TO "Produtos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Impressora_loja_id_setor_key" ON "Impressora"("loja_id", "setor");
