-- AlterTable
ALTER TABLE "Lojas" ADD COLUMN     "pedido_minimo" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Pedidos" ADD COLUMN     "agendado_para" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_pedido_id_key" ON "Avaliacao"("pedido_id");

-- CreateIndex
CREATE INDEX "Avaliacao_loja_id_created_at_idx" ON "Avaliacao"("loja_id", "created_at");

-- CreateIndex
CREATE INDEX "Avaliacao_cliente_id_idx" ON "Avaliacao"("cliente_id");

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avaliacao" ADD CONSTRAINT "Avaliacao_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "Pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
