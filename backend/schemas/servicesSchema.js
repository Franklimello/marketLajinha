const { z } = require('zod');

const serviceImagesSchema = z.array(
  z.string().trim().url('URL de imagem inválida.').max(2048)
).max(10, 'Você pode informar no máximo 10 imagens.');

const schemaCreateService = z.object({
  name: z.string().trim().min(2, 'Nome do serviço é obrigatório.').max(120),
  category: z.string().trim().min(2, 'Categoria é obrigatória.').max(60),
  description: z.string().trim().max(500).optional().default(''),
  images_urls: serviceImagesSchema.optional().default([]),
  price: z.coerce.number().min(0, 'Preço inválido.'),
  duration_minutes: z.coerce.number().int('Duração inválida.').min(5).max(720),
});

const schemaUpdateService = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  category: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(500).optional(),
  images_urls: serviceImagesSchema.optional(),
  price: z.coerce.number().min(0).optional(),
  duration_minutes: z.coerce.number().int().min(5).max(720).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Envie ao menos um campo para atualização.',
});

module.exports = {
  schemaCreateService,
  schemaUpdateService,
};
