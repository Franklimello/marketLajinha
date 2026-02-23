const { z } = require('zod');

const tipoDescontoEnum = z.enum(['PERCENTAGE', 'FIXED']);

const schemaCupom = z.object({
  codigo: z.string().min(2, 'Código deve ter no mínimo 2 caracteres').max(30),
  tipo_desconto: tipoDescontoEnum,
  valor_desconto: z.coerce.number().positive('Valor do desconto deve ser positivo'),
  valor_minimo: z.coerce.number().min(0).nullable().optional().default(null),
  max_usos: z.coerce.number().int().positive().nullable().optional().default(null),
  usos_por_cliente: z.coerce.number().int().positive().nullable().optional().default(null),
  data_inicio: z.string().refine((v) => !isNaN(Date.parse(v)), 'Data de início inválida'),
  data_fim: z.string().refine((v) => !isNaN(Date.parse(v)), 'Data de fim inválida'),
  ativo: z.boolean().optional().default(true),
});

const schemaCupomPut = schemaCupom.partial();

const schemaAplicarCupom = z.object({
  loja_id: z.string().cuid(),
  codigo_cupom: z.string().min(1, 'Código do cupom obrigatório'),
  subtotal: z.coerce.number().min(0),
});

module.exports = { schemaCupom, schemaCupomPut, schemaAplicarCupom, tipoDescontoEnum };
