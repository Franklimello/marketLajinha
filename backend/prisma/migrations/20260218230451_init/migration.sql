-- CreateTable
CREATE TABLE "Lojas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoria_negocio" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "logo_url" TEXT NOT NULL,
    "cor_primaria" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL,
    "aberta" BOOLEAN NOT NULL,
    "vencimento" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    CONSTRAINT "Usuarios_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Produtos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "preco" DECIMAL NOT NULL,
    "estoque" INTEGER NOT NULL,
    "imagem_url" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL,
    CONSTRAINT "Produtos_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pedidos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loja_id" TEXT NOT NULL,
    "nome_cliente" TEXT NOT NULL,
    "telefone_cliente" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "total" DECIMAL NOT NULL,
    "status" TEXT NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pedidos_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Lojas_slug_key" ON "Lojas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_firebase_uid_key" ON "Usuarios"("firebase_uid");
