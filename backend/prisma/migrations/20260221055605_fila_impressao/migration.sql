-- CreateEnum
CREATE TYPE "StatusImpressao" AS ENUM ('PENDING', 'PRINTED', 'ERROR');

-- AlterTable
ALTER TABLE "Lojas" ADD COLUMN     "token_impressao" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "FilaImpressao" (
    "id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "impressora_ip" TEXT NOT NULL,
    "impressora_porta" INTEGER NOT NULL DEFAULT 9100,
    "largura" INTEGER NOT NULL DEFAULT 80,
    "conteudo" TEXT NOT NULL,
    "status" "StatusImpressao" NOT NULL DEFAULT 'PENDING',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printed_at" TIMESTAMP(3),

    CONSTRAINT "FilaImpressao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FilaImpressao_loja_id_status_idx" ON "FilaImpressao"("loja_id", "status");

-- CreateIndex
CREATE INDEX "FilaImpressao_created_at_idx" ON "FilaImpressao"("created_at");

-- AddForeignKey
ALTER TABLE "FilaImpressao" ADD CONSTRAINT "FilaImpressao_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
