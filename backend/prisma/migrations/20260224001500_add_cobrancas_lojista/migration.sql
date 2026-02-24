-- CreateEnum
CREATE TYPE "StatusCobranca" AS ENUM ('ABERTA', 'FECHADA', 'PAGA');

-- CreateTable
CREATE TABLE "CobrancaLojista" (
    "id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "periodo_inicio" TIMESTAMP(3) NOT NULL,
    "periodo_fim" TIMESTAMP(3) NOT NULL,
    "percentual" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "faturamento_bruto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "pedidos_count" INTEGER NOT NULL DEFAULT 0,
    "valor_comissao" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" "StatusCobranca" NOT NULL DEFAULT 'ABERTA',
    "fechado_em" TIMESTAMP(3),
    "vencimento_em" TIMESTAMP(3),
    "pago_em" TIMESTAMP(3),
    "observacao" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CobrancaLojista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CobrancaPedido" (
    "id" TEXT NOT NULL,
    "cobranca_id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "status_pedido" TEXT NOT NULL DEFAULT '',
    "pedido_criado_em" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CobrancaPedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CobrancaLojista_loja_id_competencia_key" ON "CobrancaLojista"("loja_id", "competencia");

-- CreateIndex
CREATE INDEX "CobrancaLojista_competencia_status_idx" ON "CobrancaLojista"("competencia", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CobrancaPedido_cobranca_id_pedido_id_key" ON "CobrancaPedido"("cobranca_id", "pedido_id");

-- CreateIndex
CREATE INDEX "CobrancaPedido_loja_id_pedido_criado_em_idx" ON "CobrancaPedido"("loja_id", "pedido_criado_em");

-- AddForeignKey
ALTER TABLE "CobrancaLojista" ADD CONSTRAINT "CobrancaLojista_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CobrancaPedido" ADD CONSTRAINT "CobrancaPedido_cobranca_id_fkey" FOREIGN KEY ("cobranca_id") REFERENCES "CobrancaLojista"("id") ON DELETE CASCADE ON UPDATE CASCADE;
