-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "TipoDesconto" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PENDING', 'APPROVED', 'IN_ROUTE', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'DEBIT', 'CREDIT', 'CASH');

-- CreateTable
CREATE TABLE "Lojas" (
    "id" TEXT NOT NULL,
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
    "taxa_entrega" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tempo_entrega" TEXT NOT NULL DEFAULT '',
    "pix_tipo" TEXT NOT NULL DEFAULT '',
    "pix_chave" TEXT NOT NULL DEFAULT '',
    "pix_nome_titular" TEXT NOT NULL DEFAULT '',
    "pix_cidade" TEXT NOT NULL DEFAULT '',
    "vencimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lojas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuarios" (
    "id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "Usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FcmTokenLoja" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FcmTokenLoja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produtos" (
    "id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "preco" DECIMAL(65,30) NOT NULL,
    "estoque" INTEGER NOT NULL,
    "imagem_url" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT '',
    "setor_impressao" TEXT NOT NULL DEFAULT '',
    "ativo" BOOLEAN NOT NULL,

    CONSTRAINT "Produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariacaoProduto" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "VariacaoProduto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdicionalProduto" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "preco" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "AdicionalProduto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clientes" (
    "id" TEXT NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FcmToken" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FcmToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnderecoCliente" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "apelido" TEXT NOT NULL DEFAULT '',
    "bairro" TEXT NOT NULL,
    "rua" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT NOT NULL DEFAULT '',
    "referencia" TEXT NOT NULL DEFAULT '',
    "padrao" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EnderecoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedidos" (
    "id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "cupom_id" TEXT,
    "nome_cliente" TEXT NOT NULL,
    "telefone_cliente" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "bairro" TEXT NOT NULL DEFAULT '',
    "taxa_entrega" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "status" "StatusPedido" NOT NULL,
    "forma_pagamento" "FormaPagamento" NOT NULL,
    "observacao" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItensPedido" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(65,30) NOT NULL,
    "variacao_nome" TEXT NOT NULL DEFAULT '',
    "variacao_preco" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "adicionais_json" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "ItensPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BairroTaxa" (
    "id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "taxa" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "BairroTaxa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Impressora" (
    "id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL,
    "porta" INTEGER NOT NULL DEFAULT 9100,
    "largura" INTEGER NOT NULL DEFAULT 80,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Impressora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cupom" (
    "id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo_desconto" "TipoDesconto" NOT NULL,
    "valor_desconto" DECIMAL(65,30) NOT NULL,
    "valor_minimo" DECIMAL(65,30),
    "max_usos" INTEGER,
    "usos_count" INTEGER NOT NULL DEFAULT 0,
    "usos_por_cliente" INTEGER,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cupom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CupomUso" (
    "id" TEXT NOT NULL,
    "cupom_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "usado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CupomUso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lojas_slug_key" ON "Lojas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_firebase_uid_key" ON "Usuarios"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "FcmTokenLoja_token_key" ON "FcmTokenLoja"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Clientes_firebase_uid_key" ON "Clientes"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "FcmToken_token_key" ON "FcmToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BairroTaxa_loja_id_nome_key" ON "BairroTaxa"("loja_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Impressora_loja_id_setor_key" ON "Impressora"("loja_id", "setor");

-- CreateIndex
CREATE UNIQUE INDEX "Cupom_loja_id_codigo_key" ON "Cupom"("loja_id", "codigo");

-- AddForeignKey
ALTER TABLE "Usuarios" ADD CONSTRAINT "Usuarios_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FcmTokenLoja" ADD CONSTRAINT "FcmTokenLoja_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produtos" ADD CONSTRAINT "Produtos_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariacaoProduto" ADD CONSTRAINT "VariacaoProduto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdicionalProduto" ADD CONSTRAINT "AdicionalProduto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FcmToken" ADD CONSTRAINT "FcmToken_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnderecoCliente" ADD CONSTRAINT "EnderecoCliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedidos" ADD CONSTRAINT "Pedidos_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedidos" ADD CONSTRAINT "Pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedidos" ADD CONSTRAINT "Pedidos_cupom_id_fkey" FOREIGN KEY ("cupom_id") REFERENCES "Cupom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItensPedido" ADD CONSTRAINT "ItensPedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "Pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItensPedido" ADD CONSTRAINT "ItensPedido_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BairroTaxa" ADD CONSTRAINT "BairroTaxa_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impressora" ADD CONSTRAINT "Impressora_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cupom" ADD CONSTRAINT "Cupom_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CupomUso" ADD CONSTRAINT "CupomUso_cupom_id_fkey" FOREIGN KEY ("cupom_id") REFERENCES "Cupom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CupomUso" ADD CONSTRAINT "CupomUso_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CupomUso" ADD CONSTRAINT "CupomUso_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "Pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
