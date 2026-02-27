const { z } = require('zod');

function isDateString(v) {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

const schemaPromocao = z.object({
  produto_id: z.string().min(1, 'Produto é obrigatório'),
  titulo: z.string().optional(),
  descricao: z.string().optional().default(''),
  imagem_url: z.string().url().optional().or(z.literal('')).default(''),
  preco_promocional: z.coerce.number().positive('Preço promocional deve ser maior que zero'),
  ativo: z.boolean().optional().default(true),
  destaque_inicio: z.string().refine(isDateString, 'Data de início inválida'),
  destaque_fim: z.string().refine(isDateString, 'Data de fim inválida'),
}).superRefine((data, ctx) => {
  const inicio = Date.parse(data.destaque_inicio);
  const fim = Date.parse(data.destaque_fim);
  if (fim <= inicio) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['destaque_fim'],
      message: 'Data de fim deve ser maior que a data de início.',
    });
  }
});

const schemaPromocaoPut = z.object({
  produto_id: z.string().min(1, 'Produto inválido').optional(),
  titulo: z.string().optional(),
  descricao: z.string().optional(),
  imagem_url: z.string().url().optional().or(z.literal('')),
  preco_promocional: z.coerce.number().positive('Preço promocional deve ser maior que zero').optional(),
  ativo: z.boolean().optional(),
  destaque_inicio: z.string().refine(isDateString, 'Data de início inválida').optional(),
  destaque_fim: z.string().refine(isDateString, 'Data de fim inválida').optional(),
}).superRefine((data, ctx) => {
  if (!data.destaque_inicio || !data.destaque_fim) return;
  const inicio = Date.parse(data.destaque_inicio);
  const fim = Date.parse(data.destaque_fim);
  if (fim <= inicio) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['destaque_fim'],
      message: 'Data de fim deve ser maior que a data de início.',
    });
  }
});

module.exports = { schemaPromocao, schemaPromocaoPut };
