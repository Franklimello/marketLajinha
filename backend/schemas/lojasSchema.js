const { z } = require('zod');

const schemaLojas = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  categoria_negocio: z.string().min(1, 'Categoria é obrigatória'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  endereco: z.string().optional().default(''),
  telefone: z.string().optional().default(''),
  horario_funcionamento: z.string().optional().default(''),
  horario_abertura: z.string().optional().default(''),
  horario_fechamento: z.string().optional().default(''),
  logo_url: z.string().url().optional().or(z.literal('')).default(''),
  taxa_entrega: z.number().min(0).optional().default(0),
  tempo_entrega: z.string().optional().default(''),
  pix_tipo: z.string().optional().default(''),
  pix_chave: z.string().optional().default(''),
  pix_nome_titular: z.string().optional().default(''),
  pix_cidade: z.string().optional().default(''),
  cor_primaria: z.string().optional().default('#000000'),
  ativa: z.boolean().optional().default(true),
  aberta: z.boolean().optional().default(true),
  forcar_status: z.boolean().optional().default(false),
  vencimento: z.union([z.string().datetime(), z.string()]).optional(),
});

const schemaLojasPut = schemaLojas.partial();

module.exports = { schemaLojas, schemaLojasPut };
