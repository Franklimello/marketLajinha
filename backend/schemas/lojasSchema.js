const { z } = require('zod');
const modoAtendimentoEnum = z.enum(['ENTREGA', 'BALCAO', 'AMBOS']);

const schemaLojas = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  categoria_negocio: z.string().min(1, 'Categoria é obrigatória'),
  cidade: z.string().trim().min(1, 'Cidade é obrigatória'),
  cidade_id: z.string().trim().optional(),
  endereco: z.string().optional().default(''),
  telefone: z.string().optional().default(''),
  horario_funcionamento: z.string().optional().default(''),
  horario_abertura: z.string().optional().default(''),
  horario_fechamento: z.string().optional().default(''),
  logo_url: z.string().url().optional().or(z.literal('')).default(''),
  banner_url: z.string().url().optional().or(z.literal('')).default(''),
  taxa_entrega: z.coerce.number().min(0).optional().default(0),
  tempo_entrega: z.string().optional().default(''),
  modo_atendimento: modoAtendimentoEnum.optional().default('AMBOS'),
  pix_tipo: z.string().optional().default(''),
  pix_chave: z.string().optional().default(''),
  pix_nome_titular: z.string().optional().default(''),
  pix_cidade: z.string().optional().default(''),
  formas_pagamento: z.string().optional().default('PIX,CREDIT,DEBIT,CASH'),
  horarios_semana: z.string().optional().default('[]'),
  pedido_minimo: z.coerce.number().min(0).optional().default(0),
  cor_primaria: z.string().optional().default('#000000'),
  ativa: z.boolean().optional().default(true),
  aberta: z.boolean().optional().default(true),
  forcar_status: z.boolean().optional().default(false),
  vencimento: z.union([z.string().datetime(), z.string()]).optional(),
});

// PUT não aplica defaults para evitar sobrescrever campos existentes
// (ex: logo_url/banner_url) em updates parciais.
const schemaLojasPut = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens').optional(),
  categoria_negocio: z.string().min(1, 'Categoria é obrigatória').optional(),
  cidade: z.string().trim().min(1, 'Cidade é obrigatória').optional(),
  cidade_id: z.string().trim().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  horario_funcionamento: z.string().optional(),
  horario_abertura: z.string().optional(),
  horario_fechamento: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal('')).optional(),
  banner_url: z.string().url().optional().or(z.literal('')).optional(),
  taxa_entrega: z.coerce.number().min(0).optional(),
  tempo_entrega: z.string().optional(),
  modo_atendimento: modoAtendimentoEnum.optional(),
  pix_tipo: z.string().optional(),
  pix_chave: z.string().optional(),
  pix_nome_titular: z.string().optional(),
  pix_cidade: z.string().optional(),
  formas_pagamento: z.string().optional(),
  horarios_semana: z.string().optional(),
  pedido_minimo: z.coerce.number().min(0).optional(),
  cor_primaria: z.string().optional(),
  ativa: z.boolean().optional(),
  aberta: z.boolean().optional(),
  forcar_status: z.boolean().optional(),
  vencimento: z.union([z.string().datetime(), z.string()]).optional(),
}).superRefine((data, ctx) => {
  if (typeof data.cidade !== 'string' || !data.cidade.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cidade'],
      message: 'Cidade é obrigatória',
    });
  }
});

module.exports = { schemaLojas, schemaLojasPut };
