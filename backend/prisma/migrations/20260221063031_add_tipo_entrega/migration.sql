-- CreateEnum
CREATE TYPE "TipoEntrega" AS ENUM ('ENTREGA', 'RETIRADA');

-- AlterTable
ALTER TABLE "Pedidos" ADD COLUMN     "tipo_entrega" "TipoEntrega" NOT NULL DEFAULT 'ENTREGA';
