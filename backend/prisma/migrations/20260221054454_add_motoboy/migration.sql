-- CreateTable
CREATE TABLE "Motoboy" (
    "id" TEXT NOT NULL,
    "loja_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Motoboy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Motoboy_loja_id_idx" ON "Motoboy"("loja_id");

-- CreateIndex
CREATE UNIQUE INDEX "Motoboy_loja_id_email_key" ON "Motoboy"("loja_id", "email");

-- AddForeignKey
ALTER TABLE "Motoboy" ADD CONSTRAINT "Motoboy_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "Lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
