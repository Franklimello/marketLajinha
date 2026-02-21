const { z } = require('zod');

const schemaVariacao = z.object({
  nome: z.string().min(1, 'Nome da variação é obrigatório'),
  preco: z.number().min(0, 'Preço deve ser >= 0'),
});

const schemaAdicional = z.object({
  nome: z.string().min(1, 'Nome do adicional é obrigatório'),
  preco: z.number().min(0, 'Preço deve ser >= 0'),
});

const schemaProdutos = z.object({
  loja_id: z.string().cuid(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional().default(''),
  preco: z.number().min(0, 'Preço deve ser >= 0'),
  estoque: z.number().int().min(0, 'Estoque não pode ser negativo'),
  imagem_url: z.string().url().optional().or(z.literal('')).default(''),
  categoria: z.string().optional().default(''),
  setor_impressao: z.string().optional().default(''),
  ativo: z.boolean().optional().default(true),
  variacoes: z.array(schemaVariacao).optional().default([]),
  adicionais: z.array(schemaAdicional).optional().default([]),
});

const schemaProdutosPut = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  preco: z.number().min(0).optional(),
  estoque: z.number().int().min(0).optional(),
  imagem_url: z.string().url().optional().or(z.literal('')),
  categoria: z.string().optional(),
  setor_impressao: z.string().optional(),
  ativo: z.boolean().optional(),
  variacoes: z.array(schemaVariacao).optional(),
  adicionais: z.array(schemaAdicional).optional(),
});

module.exports = { schemaProdutos, schemaProdutosPut };
