const { z } = require('zod');

const schemaVariacao = z.object({
  nome: z.string().min(1, 'Nome da variação é obrigatório'),
  preco: z.coerce.number().min(0, 'Preço deve ser >= 0'),
});

const schemaAdicional = z.object({
  nome: z.string().min(1, 'Nome do adicional é obrigatório'),
  preco: z.coerce.number().min(0, 'Preço deve ser >= 0'),
  grupo_nome: z.string().min(1).optional().default('Complementos'),
  grupo_min: z.coerce.number().int().min(0).optional().default(0),
  grupo_max: z.coerce.number().int().min(0).optional().default(99),
  ordem_grupo: z.coerce.number().int().min(0).optional().default(0),
  ordem_item: z.coerce.number().int().min(0).optional().default(0),
});

const schemaProdutos = z.object({
  loja_id: z.string().cuid(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional().default(''),
  preco: z.coerce.number().min(0, 'Preço deve ser >= 0'),
  preco_promocional: z.coerce.number().min(0, 'Preço promocional deve ser >= 0').optional().default(0),
  em_promocao: z.boolean().optional().default(false),
  estoque: z.coerce.number().int().min(0, 'Estoque não pode ser negativo'),
  controla_estoque: z.boolean().optional().default(false),
  imagem_url: z.string().url().optional().or(z.literal('')).default(''),
  categoria: z.string().optional().default(''),
  setor_impressao: z.string().optional().default(''),
  ativo: z.boolean().optional().default(true),
  destaque: z.boolean().optional().default(false),
  variacoes: z.array(schemaVariacao).optional().default([]),
  adicionais: z.array(schemaAdicional).optional().default([]),
});

const schemaProdutosPut = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  preco: z.coerce.number().min(0).optional(),
  preco_promocional: z.coerce.number().min(0).optional(),
  em_promocao: z.boolean().optional(),
  estoque: z.coerce.number().int().min(0).optional(),
  controla_estoque: z.boolean().optional(),
  imagem_url: z.string().url().optional().or(z.literal('')),
  categoria: z.string().optional(),
  setor_impressao: z.string().optional(),
  ativo: z.boolean().optional(),
  destaque: z.boolean().optional(),
  variacoes: z.array(schemaVariacao).optional(),
  adicionais: z.array(schemaAdicional).optional(),
});

module.exports = { schemaProdutos, schemaProdutosPut };
