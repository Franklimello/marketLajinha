CREATE TABLE "Promocao" (
    "id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "imagem_url" TEXT NOT NULL DEFAULT '',
    "preco_promocional" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "destaque_inicio" TIMESTAMP(3),
    "destaque_fim" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Promocao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Promocao_loja_id_ativo_idx" ON "Promocao"("loja_id", "ativo");

ALTER TABLE "Promocao" ADD CONSTRAINT "Promocao_loja_id_fkey"
FOREIGN KEY ("loja_id") REFERENCES "Lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
