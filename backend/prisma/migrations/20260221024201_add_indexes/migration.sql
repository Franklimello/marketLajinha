-- CreateIndex
CREATE INDEX "AdicionalProduto_produto_id_idx" ON "AdicionalProduto"("produto_id");

-- CreateIndex
CREATE INDEX "CupomUso_cupom_id_cliente_id_idx" ON "CupomUso"("cupom_id", "cliente_id");

-- CreateIndex
CREATE INDEX "EnderecoCliente_cliente_id_idx" ON "EnderecoCliente"("cliente_id");

-- CreateIndex
CREATE INDEX "FcmToken_cliente_id_idx" ON "FcmToken"("cliente_id");

-- CreateIndex
CREATE INDEX "FcmTokenLoja_usuario_id_idx" ON "FcmTokenLoja"("usuario_id");

-- CreateIndex
CREATE INDEX "ItensPedido_pedido_id_idx" ON "ItensPedido"("pedido_id");

-- CreateIndex
CREATE INDEX "ItensPedido_produto_id_idx" ON "ItensPedido"("produto_id");

-- CreateIndex
CREATE INDEX "Lojas_ativa_cidade_idx" ON "Lojas"("ativa", "cidade");

-- CreateIndex
CREATE INDEX "Lojas_categoria_negocio_idx" ON "Lojas"("categoria_negocio");

-- CreateIndex
CREATE INDEX "Pedidos_loja_id_status_idx" ON "Pedidos"("loja_id", "status");

-- CreateIndex
CREATE INDEX "Pedidos_loja_id_created_at_idx" ON "Pedidos"("loja_id", "created_at");

-- CreateIndex
CREATE INDEX "Pedidos_cliente_id_idx" ON "Pedidos"("cliente_id");

-- CreateIndex
CREATE INDEX "Produtos_loja_id_ativo_idx" ON "Produtos"("loja_id", "ativo");

-- CreateIndex
CREATE INDEX "Produtos_loja_id_categoria_idx" ON "Produtos"("loja_id", "categoria");

-- CreateIndex
CREATE INDEX "Usuarios_loja_id_idx" ON "Usuarios"("loja_id");

-- CreateIndex
CREATE INDEX "VariacaoProduto_produto_id_idx" ON "VariacaoProduto"("produto_id");
