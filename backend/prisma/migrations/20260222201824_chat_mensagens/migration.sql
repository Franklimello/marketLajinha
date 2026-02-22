-- CreateEnum
CREATE TYPE "RemetenteMensagem" AS ENUM ('CLIENTE', 'LOJA');

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "remetente" "RemetenteMensagem" NOT NULL,
    "conteudo" TEXT NOT NULL,
    "lido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mensagem_pedido_id_created_at_idx" ON "Mensagem"("pedido_id", "created_at");

-- CreateIndex
CREATE INDEX "Mensagem_loja_id_lido_idx" ON "Mensagem"("loja_id", "lido");

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "Pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
