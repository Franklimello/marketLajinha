const { z } = require('zod');

const schemaPromocao = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  descricao: z.string().optional().default(''),
  imagem_url: z.string().url().optional().or(z.literal('')).default(''),
  preco_promocional: z.coerce.number().min(0, 'Preço promocional deve ser >= 0').optional().default(0),
  ativo: z.boolean().optional().default(true),
  destaque_inicio: z.string().refine((v) => !isNaN(Date.parse(v)), 'Data de início inválida').optional(),
  destaque_fim: z.string().refine((v) => !isNaN(Date.parse(v)), 'Data de fim inválida').optional(),
});

const schemaPromocaoPut = schemaPromocao.partial();

module.exports = { schemaPromocao, schemaPromocaoPut };
