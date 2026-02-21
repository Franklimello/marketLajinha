-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lojas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoria_negocio" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "logo_url" TEXT NOT NULL,
    "cor_primaria" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL,
    "aberta" BOOLEAN NOT NULL,
    "taxa_entrega" REAL NOT NULL DEFAULT 0,
    "vencimento" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Lojas" ("aberta", "ativa", "categoria_negocio", "cidade", "cor_primaria", "id", "logo_url", "nome", "slug", "vencimento") SELECT "aberta", "ativa", "categoria_negocio", "cidade", "cor_primaria", "id", "logo_url", "nome", "slug", "vencimento" FROM "Lojas";
DROP TABLE "Lojas";
ALTER TABLE "new_Lojas" RENAME TO "Lojas";
CREATE UNIQUE INDEX "Lojas_slug_key" ON "Lojas"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
