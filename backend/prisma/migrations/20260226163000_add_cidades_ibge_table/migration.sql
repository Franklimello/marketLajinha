CREATE TABLE "Cidades" (
    "id" TEXT NOT NULL,
    "id_ibge" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "Cidades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cidades_id_ibge_key" ON "Cidades"("id_ibge");
CREATE UNIQUE INDEX "Cidades_estado_nome_key" ON "Cidades"("estado", "nome");
CREATE INDEX "Cidades_estado_nome_idx" ON "Cidades"("estado", "nome");
