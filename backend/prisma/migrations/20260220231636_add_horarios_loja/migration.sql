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
    "horario_abertura" TEXT NOT NULL DEFAULT '',
    "horario_fechamento" TEXT NOT NULL DEFAULT '',
    "logo_url" TEXT NOT NULL,
    "cor_primaria" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL,
    "aberta" BOOLEAN NOT NULL,
    "forcar_status" BOOLEAN NOT NULL DEFAULT false,
    "taxa_entrega" REAL NOT NULL DEFAULT 0,
    "vencimento" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Lojas" ("aberta", "ativa", "categoria_negocio", "cidade", "cor_primaria", "endereco", "horario_funcionamento", "id", "logo_url", "nome", "slug", "taxa_entrega", "telefone", "vencimento") SELECT "aberta", "ativa", "categoria_negocio", "cidade", "cor_primaria", "endereco", "horario_funcionamento", "id", "logo_url", "nome", "slug", "taxa_entrega", "telefone", "vencimento" FROM "Lojas";
DROP TABLE "Lojas";
ALTER TABLE "new_Lojas" RENAME TO "Lojas";
CREATE UNIQUE INDEX "Lojas_slug_key" ON "Lojas"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
