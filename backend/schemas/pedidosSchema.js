const { z } = require('zod');

const statusPedidoEnum = z.enum(['PENDING', 'APPROVED', 'IN_ROUTE', 'DELIVERED', 'CANCELLED']);
const formaPagamentoEnum = z.enum(['PIX', 'DEBIT', 'CREDIT', 'CASH']);
const tipoEntregaEnum = z.enum(['ENTREGA', 'RETIRADA']);

const schemaItemPedido = z.object({
  produto_id: z.string().cuid('ID do produto inválido'),
  quantidade: z.number().int().min(1, 'Quantidade deve ser pelo menos 1'),
  variacao_id: z.string().optional(),
  adicionais_ids: z.array(z.string()).optional().default([]),
});

const schemaPedidos = z.object({
  loja_id: z.string().cuid(),
  tipo_entrega: tipoEntregaEnum.optional().default('ENTREGA'),
  nome_cliente: z.string().optional().default(''),
  telefone_cliente: z.string().optional().default(''),
  endereco: z.string().optional().default(''),
  bairro: z.string().optional().default(''),
  taxa_entrega: z.number().min(0).optional().default(0),
  forma_pagamento: formaPagamentoEnum,
  observacao: z.string().optional().default(''),
  agendado_para: z.string().datetime().optional().or(z.literal('')).or(z.null()),
  codigo_cupom: z.string().optional().default(''),
  itens: z.array(schemaItemPedido).min(1, 'O pedido precisa ter pelo menos 1 item'),
});

const schemaPedidosStatus = z.object({ status: statusPedidoEnum });

module.exports = {
  schemaPedidos,
  schemaPedidosStatus,
  schemaItemPedido,
  statusPedidoEnum,
  formaPagamentoEnum,
  tipoEntregaEnum,
};
